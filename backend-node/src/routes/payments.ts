import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest, adminOnlyMiddleware } from '../middleware/auth';
import { logAudit, logPaymentAction, getClientIp } from '../services/audit';

const router = Router();
const prisma = new PrismaClient();

const ADMIN_BANK_DETAILS = {
  bank_name: 'First Bank of Nigeria',
  account_name: 'Lonaat Technologies Ltd',
  account_number: '3076543210',
  swift_code: 'FBNINGLA',
  instructions: 'Please include your email as payment reference'
};

router.get('/packages', async (req, res: Response) => {
  try {
    const packages = await prisma.creditPackage.findMany({
      where: { is_active: true },
      orderBy: { price: 'asc' }
    });

    res.json({ packages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get packages' });
  }
});

router.get('/bank-details', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json({ bank_details: ADMIN_BANK_DETAILS });
});

router.post('/buy-credits', [
  authMiddleware,
  body('package_id').isInt().withMessage('Package ID required'),
  body('receipt_url').optional().isURL().withMessage('Valid receipt URL required')
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { package_id, receipt_url, receipt_filename } = req.body;

    const pkg = await prisma.creditPackage.findUnique({
      where: { id: parseInt(package_id) }
    });

    if (!pkg || !pkg.is_active) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const payment = await prisma.paymentRequest.create({
      data: {
        user_id: req.user!.id,
        purpose: 'credit_purchase',
        amount: pkg.price,
        currency: 'USD',
        payment_method: 'bank_transfer',
        package_id: pkg.id,
        credits_to_add: pkg.credits + pkg.bonus_credits,
        receipt_url,
        receipt_filename,
        status: 'pending'
      }
    });

    await logPaymentAction(
      req.user!.id,
      'payment_created',
      payment.id,
      { package_id: pkg.id, amount: pkg.price, credits: pkg.credits + pkg.bonus_credits },
      req
    );

    res.status(201).json({
      message: 'Payment request created. Please upload your payment receipt.',
      payment: {
        id: payment.id,
        amount: payment.amount,
        credits_to_add: payment.credits_to_add,
        status: payment.status
      },
      bank_details: ADMIN_BANK_DETAILS
    });
  } catch (error) {
    console.error('Buy credits error:', error);
    res.status(500).json({ error: 'Failed to create payment request' });
  }
});

router.put('/:id/upload-receipt', [
  authMiddleware,
  body('receipt_url').isURL().withMessage('Valid receipt URL required')
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const paymentId = parseInt(req.params.id);
    const { receipt_url, receipt_filename } = req.body;

    const payment = await prisma.paymentRequest.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment already processed' });
    }

    const updated = await prisma.paymentRequest.update({
      where: { id: paymentId },
      data: { receipt_url, receipt_filename }
    });

    await logPaymentAction(req.user!.id, 'receipt_uploaded', paymentId, { receipt_url }, req);

    res.json({ message: 'Receipt uploaded', payment: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload receipt' });
  }
});

router.get('/my-payments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const payments = await prisma.paymentRequest.findMany({
      where: { user_id: req.user!.id },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    res.json({ payments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

router.get('/all', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const where: any = {};
    if (status) where.status = status;

    const payments = await prisma.paymentRequest.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip
    });

    const total = await prisma.paymentRequest.count({ where });

    res.json({
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

router.put('/:id/approve', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const paymentId = parseInt(req.params.id);
    const { note } = req.body;

    const payment = await prisma.paymentRequest.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment already processed' });
    }

    if (!payment.receipt_url) {
      return res.status(400).json({ error: 'No receipt uploaded yet' });
    }

    const updated = await prisma.paymentRequest.update({
      where: { id: paymentId },
      data: {
        status: 'approved',
        reviewed_by: req.user!.id,
        review_note: note,
        reviewed_at: new Date()
      }
    });

    if (payment.credits_to_add && payment.credits_to_add > 0) {
      await prisma.creditWallet.upsert({
        where: { user_id: payment.user_id },
        update: {
          credits: { increment: payment.credits_to_add },
          total_purchased: { increment: payment.credits_to_add }
        },
        create: {
          user_id: payment.user_id,
          credits: payment.credits_to_add,
          total_purchased: payment.credits_to_add,
          total_spent: 0
        }
      });

      await prisma.transaction.create({
        data: {
          user_id: payment.user_id,
          type: 'credit_purchase',
          amount: payment.amount,
          status: 'completed',
          description: `Purchased ${payment.credits_to_add} credits`,
          extra_data: { payment_id: paymentId, credits: payment.credits_to_add }
        }
      });
    }

    await logPaymentAction(
      req.user!.id,
      'payment_approved',
      paymentId,
      { user_id: payment.user_id, credits: payment.credits_to_add, amount: payment.amount },
      req
    );

    await prisma.notification.create({
      data: {
        user_id: payment.user_id,
        title: 'Payment Approved',
        message: `Your payment of $${payment.amount} has been approved. ${payment.credits_to_add} credits added to your account.`,
        type: 'success'
      }
    });

    res.json({ message: 'Payment approved', payment: updated });
  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(500).json({ error: 'Failed to approve payment' });
  }
});

router.put('/:id/reject', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const paymentId = parseInt(req.params.id);
    const { reason } = req.body;

    const payment = await prisma.paymentRequest.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment already processed' });
    }

    const updated = await prisma.paymentRequest.update({
      where: { id: paymentId },
      data: {
        status: 'rejected',
        reviewed_by: req.user!.id,
        review_note: reason || 'Rejected by admin',
        reviewed_at: new Date()
      }
    });

    await logPaymentAction(
      req.user!.id,
      'payment_rejected',
      paymentId,
      { user_id: payment.user_id, reason },
      req
    );

    await prisma.notification.create({
      data: {
        user_id: payment.user_id,
        title: 'Payment Rejected',
        message: `Your payment of $${payment.amount} has been rejected. Reason: ${reason || 'Not specified'}`,
        type: 'error'
      }
    });

    res.json({ message: 'Payment rejected', payment: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject payment' });
  }
});

export default router;
