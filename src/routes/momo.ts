/**
 * MTN MOMO ROUTES - CAMEROON PAYMENT INTEGRATION
 * Handles mobile money deposits and withdrawals for Cameroon users
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { 
  requestToPay, 
  getPaymentStatus, 
  validateCameroonPhone, 
  formatPhoneNumber,
  getMomoAmountWithFees,
  handleMomoWebhook
} from '../services/momo.service';
import { monitoringService } from '../services/monitoring.service';
import financialCore from '../services/financialCore.service';
import { MTN_ENABLED } from '../config/features';

const router = Router();

/**
 * POST /api/momo/deposit - Request MTN MOMO deposit
 */
router.post('/deposit', [
  authMiddleware,
  body('amount').isInt({ min: 100, max: 500000 }).withMessage('Amount must be between 100 and 500,000 XAF'),
  body('phone').isString().withMessage('Phone number is required')
], async (req: AuthRequest, res: Response) => {
  // Check if MTN MOMO is enabled
  if (!MTN_ENABLED) {
    return res.status(503).json({
      success: false,
      message: "MTN MOMO payments temporarily unavailable - missing configuration"
    });
  }

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { amount, phone } = req.body;
    const userId = Number(req.user!.id);

    console.log(`📱 MTN MOMO deposit request: User ${userId}, Amount ${amount} XAF, Phone ${phone}`);

    // Validate and format phone number
    const formattedPhone = formatPhoneNumber(phone);
    if (!validateCameroonPhone(formattedPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Cameroon phone number',
        message: 'Phone number must be a valid Cameroon MTN number (+237 6XXXXXXX or +237 7XXXXXXX)'
      });
    }

    // Calculate fees
    const { totalAmount, fees, netAmount } = getMomoAmountWithFees(amount);

    // Generate external ID for tracking
    const externalId = `DEPOSIT_${userId}_${Date.now()}`;

    // Request payment from MTN MOMO
    const referenceId = await requestToPay({
      amount: totalAmount,
      phone: formattedPhone,
      externalId,
      userId
    });

    // Save pending transaction in database
    const transaction = await prisma.Transaction.create({
      data: {
        userId,
        amount: netAmount,
        type: 'credit',
        source: 'momo',
        referenceId,
        idempotencyKey: externalId
      }
    });

    // Log monitoring metric
    await monitoringService.incrementMetric('momo_deposit_request', userId, {
      amount,
      fees,
      phone: formattedPhone,
      referenceId,
      transactionId: transaction.id
    });

    res.json({
      success: true,
      data: {
        referenceId,
        externalId,
        amount: netAmount,
        fees,
        totalAmount,
        phone: formattedPhone,
        status: 'pending',
        message: 'Payment request sent. Please complete the payment on your MTN MOMO app.',
        transactionId: transaction.id
      }
    });

  } catch (error: any) {
    console.error('❌ MTN MOMO deposit error:', error);
    
    await monitoringService.incrementMetric('momo_deposit_error', Number(req.user?.id), {
      error: error.message,
      amount: req.body?.amount
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process deposit request',
      message: error.message
    });
  }
});

/**
 * GET /api/momo/status/:referenceId - Check payment status
 */
router.get('/status/:referenceId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { referenceId } = req.params;
    const userId = Number(req.user!.id);

    console.log(`📱 Checking MTN MOMO status: ${referenceId} for user ${userId}`);

    // Get payment status from MTN MOMO
    const statusData = await getPaymentStatus(referenceId);

    // Log monitoring metric
    await monitoringService.incrementMetric('momo_status_check', userId, {
      referenceId,
      status: statusData.status
    });

    res.json({
      success: true,
      data: {
        referenceId,
        status: statusData.status,
        amount: statusData.amount,
        currency: statusData.currency,
        financialTransactionId: statusData.financialTransactionId,
        createdAt: statusData.creationTime,
        completedAt: statusData.dateCompleted
      }
    });

  } catch (error: any) {
    console.error('❌ MTN MOMO status check error:', error);
    
    await monitoringService.incrementMetric('momo_status_error', Number(req.user?.id), {
      referenceId: req.params.referenceId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to check payment status',
      message: error.message
    });
  }
});

/**
 * POST /api/momo/webhook - MTN MOMO webhook endpoint
 */
router.post('/webhook', async (req, res) => {
  try {
    console.log('📱 MTN MOMO webhook received:', req.body);
    const { referenceId } = req.body;

    // Get payment status from MTN MOMO
    const payment = await getPaymentStatus(referenceId);

    if (payment.status === "SUCCESSFUL") {
      // Find the transaction
      const tx = await prisma.Transaction.findUnique({
        where: { referenceId },
      });

      if (!tx || tx.status === "completed") {
        console.log('⚠️ Transaction already completed or not found:', referenceId);
        return res.sendStatus(200);
      }

      // Process successful payment atomically
      await prisma.$transaction(async (db) => {
        // Update transaction status
        await db.Transaction.update({
          where: { referenceId },
          data: { status: "completed" },
        });

        // Credit wallet via financialCore
        await financialCore.createTransaction({
          userId: tx.userId,
          amount: tx.amount,
          type: 'credit',
          source: 'momo',
          referenceId,
          idempotencyKey: `momo_${referenceId}`
        });

        console.log(`✅ MTN MOMO payment completed: ${referenceId}, Amount: ${tx.amount}, User: ${tx.userId}`);
      });

      // Log success metric
      await monitoringService.incrementMetric('momo_payment_success', undefined, {
        referenceId,
        amount: tx.amount,
        userId: tx.userId
      });

    } else if (payment.status === "FAILED") {
      // Update transaction to failed
      await prisma.Transaction.update({
        where: { referenceId },
        data: { status: "failed" },
      });

      console.log(`❌ MTN MOMO payment failed: ${referenceId}`);
      
      // Log failure metric
      await monitoringService.incrementMetric('momo_payment_failed', undefined, {
        referenceId,
        status: payment.status
      });
    }

    // Always return 200 to acknowledge receipt
    res.sendStatus(200);

  } catch (error: any) {
    console.error('❌ MTN MOMO webhook error:', error);
    
    await monitoringService.incrementMetric('momo_webhook_error', undefined, {
      error: error.message,
      webhookData: req.body
    });

    // Still return 200 to prevent webhook retries
    res.sendStatus(200);
  }
});

/**
 * GET /api/momo/fees/:amount - Calculate MTN MOMO fees
 */
router.get('/fees/:amount', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const amount = parseInt(req.params.amount);
    
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    const { totalAmount, fees, netAmount } = getMomoAmountWithFees(amount);

    res.json({
      success: true,
      data: {
        amount: netAmount,
        fees,
        totalAmount,
        currency: 'XAF'
      }
    });

  } catch (error: any) {
    console.error('❌ Fee calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate fees',
      message: error.message
    });
  }
});

/**
 * POST /api/momo/validate-phone - Validate Cameroon phone number
 */
router.post('/validate-phone', [
  body('phone').isString().withMessage('Phone number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { phone } = req.body;
    const formattedPhone = formatPhoneNumber(phone);
    const isValid = validateCameroonPhone(formattedPhone);

    res.json({
      success: true,
      data: {
        originalPhone: phone,
        formattedPhone,
        isValid,
        country: 'Cameroon',
        provider: isValid ? 'MTN' : 'Unknown'
      }
    });

  } catch (error: any) {
    console.error('❌ Phone validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate phone number',
      message: error.message
    });
  }
});

export default router;
