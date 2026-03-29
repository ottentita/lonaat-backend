/**
 * ADMIN REFUND ENDPOINT - TRANSACTION REVERSAL
 * Allows admin to reverse transactions and refund users
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import prisma from '../prisma';
import { monitoringService } from '../services/monitoring.service';

const router = Router();

/**
 * POST /api/admin/refund - Refund transaction (Admin only)
 */
router.post('/refund', [
  authMiddleware,
  body('transactionId').isInt().withMessage('Transaction ID is required'),
  body('reason').isString().withMessage('Refund reason is required'),
  body('deductTokens').optional().isBoolean().withMessage('Deduct tokens must be boolean'),
  body('refundAmount').optional().isInt({ min: 0 }).withMessage('Refund amount must be non-negative')
], async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      await monitoringService.incrementMetric('admin_refund_unauthorized', String(req.user?.id));
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden - Admin access required' 
      });
    }

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { transactionId, reason, deductTokens = false, refundAmount } = req.body;

    console.log('🔄 ADMIN REFUND REQUEST:', {
      adminId: req.user!.id,
      transactionId,
      reason,
      deductTokens,
      refundAmount
    });

    // Find the original transaction
    const originalTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        type: 'debit',
        source: 'token_purchase'
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    if (!originalTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Original transaction not found'
      });
    }

    // Check if already refunded
    const existingRefund = await prisma.transaction.findFirst({
      where: {
        referenceId: transactionId,
        type: 'credit',
        source: 'admin_refund'
      }
    });

    if (existingRefund) {
      return res.status(409).json({
        success: false,
        error: 'Transaction already refunded',
        refundId: existingRefund.id
      });
    }

    // Get user's current wallet
    const userWallet = await prisma.wallet.findUnique({
      where: { userId: originalTransaction.userId }
    });

    if (!userWallet) {
      return res.status(404).json({
        success: false,
        error: 'User wallet not found'
      });
    }

    // Calculate refund amount
    const refundAmountToUse = refundAmount !== undefined ? refundAmount : Math.abs(originalTransaction.amount);
    const tokensToDeduct = deductTokens ? Math.floor(refundAmountToUse / 10) : 0; // Assuming 10 XAF per token

    // Process refund atomically
    const result = await prisma.$transaction(async (tx) => {
      // Add refund to wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { userId: originalTransaction.userId },
        data: { 
          balance: { increment: refundAmountToUse },
          updatedAt: new Date()
        }
      });

      // Deduct tokens if requested
      if (deductTokens && tokensToDeduct > 0) {
        await tx.wallet.update({
          where: { userId: originalTransaction.userId },
          data: {
            tokens: { decrement: tokensToDeduct },
            totalTokensSpent: { increment: tokensToDeduct }
          }
        });
      }

      // Mark original transaction as refunded
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'refunded'
        }
      });

      // Create refund transaction
      const refundTransaction = await tx.transaction.create({
        data: {
          userId: originalTransaction.userId,
          amount: refundAmountToUse,
          type: 'credit',
          source: 'admin_refund',
          status: 'completed',
          description: `Refund: ${reason} (Admin: ${req.user!.id})`,
          referenceId: transactionId,
          idempotencyKey: `admin_refund_${transactionId}_${Date.now()}`
        }
      });

      console.log('✅ ADMIN REFUND COMPLETED:', {
        userId: originalTransaction.userId,
        originalTransactionId: transactionId,
        refundTransactionId: refundTransaction.id,
        refundAmount: refundAmountToUse,
        tokensDeducted: deductTokens ? tokensToDeduct : 0,
        newBalance: updatedWallet.balance
      });

      return {
        wallet: updatedWallet,
        refundTransaction,
        tokensDeducted: deductTokens ? tokensToDeduct : 0
      };
    });

    // Log success metric
    await monitoringService.incrementMetric('admin_refund_success', String(req.user!.id), {
      originalTransactionId: transactionId,
      refundTransactionId: result.refundTransaction.id,
      refundAmount: refundAmountToUse,
      tokensDeducted: result.tokensDeducted
    });

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        userId: originalTransaction.userId,
        userEmail: originalTransaction.user?.email,
        userName: originalTransaction.user?.name,
        originalTransactionId: transactionId,
        originalAmount: originalTransaction.amount,
        refundAmount: refundAmountToUse,
        tokensDeducted: result.tokensDeducted,
        newBalance: result.wallet.balance,
        refundTransactionId: result.refundTransaction.id,
        reason
      }
    });

  } catch (error: any) {
    console.error('❌ ADMIN REFUND ERROR:', error);
    
    await monitoringService.incrementMetric('admin_refund_error', String(req.user?.id), {
      error: error.message,
      transactionId: req.body?.transactionId
    });

    res.status(500).json({
      success: false,
      error: 'Refund processing failed',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/refund/history - Get refund history
 */
router.get('/refund/history', [
  authMiddleware
], async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden - Admin access required' 
      });
    }

    const refunds = await prisma.transaction.findMany({
      where: {
        source: 'admin_refund',
        type: 'credit'
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    res.json({
      success: true,
      data: {
        refunds: refunds.map(refund => ({
          id: refund.id,
          userId: refund.userId,
          userEmail: refund.user?.email,
          userName: refund.user?.name,
          amount: refund.amount,
          description: refund.description,
          referenceId: refund.referenceId,
          status: refund.status,
          createdAt: refund.createdAt
        })),
        total: refunds.length
      }
    });

  } catch (error: any) {
    console.error('❌ ADMIN REFUND HISTORY ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch refund history',
      details: error.message
    });
  }
});

export default router;
