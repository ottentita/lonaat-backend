import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest, adminOnlyMiddleware } from '../middleware/auth';
import { logAudit, getClientIp } from '../services/audit';
import { validate } from '../middleware/validation';
import { subscriptionSchema } from '../schemas/requestSchemas';

const router = Router();

router.get('/plans', async (req, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { is_active: true },
      orderBy: { price: 'asc' }
    });

    res.json({ plans });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get plans' });
  }
});

router.get('/my-subscription', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user!.id,
        status: 'active',
        expiresAt: { gte: new Date() }
      },
      include: { plan: true },
      orderBy: { startedAt: 'desc' }
    });

    // 🔐 FIX: prevent null crash and provide hasSubscription flag
    if (!subscription) {
      return res.status(200).json({
        hasSubscription: false,
        subscription: null
      });
    }

    return res.status(200).json({
      hasSubscription: true,
      subscription
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

router.post('/subscribe', validate(subscriptionSchema, 'body'), authMiddleware, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { plan_id } = req.body;

    const plan = await prisma.plan.findUnique({
      where: { id: parseInt(plan_id) }
    });

    if (!plan || !plan.is_active) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const payment = await prisma.paymentRequest.create({
      data: {
        user_id: req.user!.id,
        purpose: 'subscription',
        amount: plan.price,
        currency: 'USD',
        payment_method: 'bank_transfer',
        plan_id: plan.id,
        status: 'pending'
      }
    });

    await logAudit({
      userId: req.user!.id,
      action: 'subscription_requested',
      entityType: 'subscription',
      details: { plan_id: plan.id, amount: plan.price },
      ipAddress: getClientIp(req)
    });

    res.status(201).json({
      message: 'Subscription request created. Please complete payment.',
      payment_id: payment.id,
      plan,
      bank_details: {
        bank_name: 'First Bank of Nigeria',
        account_name: 'Lonaat Technologies Ltd',
        account_number: '3076543210',
        instructions: 'Include your email as reference'
      }
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to create subscription request' });
  }
});

router.put('/:paymentId/activate', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const paymentId = parseInt(req.params.paymentId);

    const payment = await prisma.paymentRequest.findUnique({
      where: { id: paymentId }
    });

    if (!payment || payment.purpose !== 'subscription') {
      return res.status(404).json({ error: 'Subscription payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment already processed' });
    }

    if (!payment.plan_id) {
      return res.status(400).json({ error: 'No plan associated with payment' });
    }

    const plan = await prisma.plan.findUnique({
      where: { id: payment.plan_id }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

    const subscription = await prisma.subscription.create({
      data: {
        user_id: payment.user_id,
        plan_id: plan.id,
        status: 'active',
        expires_at: expiresAt
      }
    });

    await prisma.paymentRequest.update({
      where: { id: paymentId },
      data: {
        status: 'approved',
        subscription_id: subscription.id,
        reviewed_by: req.user!.id,
        reviewed_at: new Date()
      }
    });

    if (plan.credits > 0) {
      await prisma.creditWallet.upsert({
        where: { user_id: payment.user_id },
        update: {
          credits: { increment: plan.credits },
          total_purchased: { increment: plan.credits }
        },
        create: {
          user_id: payment.user_id,
          credits: plan.credits,
          total_purchased: plan.credits,
          total_spent: 0
        }
      });
    }

    await prisma.transaction.create({
      data: {
        user_id: payment.user_id,
        type: 'subscription',
        amount: plan.price,
        status: 'completed',
        description: `Subscribed to ${plan.name}`,
        extra_data: { plan_id: plan.id, subscription_id: subscription.id }
      }
    });

    await logAudit({
      userId: req.user!.id,
      action: 'subscription_activated',
      entityType: 'subscription',
      entityId: subscription.id,
      details: { user_id: payment.user_id, plan_id: plan.id },
      ipAddress: getClientIp(req)
    });

    await prisma.notification.create({
      data: {
        user_id: payment.user_id,
        title: 'Subscription Activated',
        message: `Your ${plan.name} subscription is now active until ${expiresAt.toDateString()}.`,
        type: 'success'
      }
    });

    res.json({ message: 'Subscription activated', subscription });
  } catch (error) {
    console.error('Activate subscription error:', error);
    res.status(500).json({ error: 'Failed to activate subscription' });
  }
});

router.get('/all', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      orderBy: { started_at: 'desc' },
      take: 100,
      include: { plan: true }
    });

    res.json({ subscriptions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get subscriptions' });
  }
});

router.post('/plans', authMiddleware, adminOnlyMiddleware, [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
  body('duration_days').isInt({ min: 1 }).withMessage('Valid duration required')
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, price, duration_days, credits, features } = req.body;

    const plan = await prisma.plan.create({
      data: {
        name,
        price: Number(price),
        duration_days: parseInt(duration_days),
        credits: credits ? parseInt(credits) : 0,
        features: features || {},
        is_active: true
      }
    });

    res.status(201).json({ message: 'Plan created', plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

export default router;
