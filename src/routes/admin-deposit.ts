/**
 * ADMIN DEPOSIT ENDPOINT - MANUAL FUNDING MECHANISM
 * Allows admin to manually deposit funds for testing before MTN MOMO integration
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import prisma from '../prisma';
import { monitoringService } from '../services/monitoring.service';

const router = Router();

/**
 * POST /api/admin/deposit - Manual deposit endpoint (Admin only)
 */
router.post('/deposit', [
  authMiddleware,
  body('userId').isString().withMessage('User ID is required'),
  body('amount').isInt({ min: 1, max: 1000000 }).withMessage('Amount must be between 1 and 1,000,000'),
  body('reason').optional().isString().withMessage('Reason must be a string')
], async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      await monitoringService.incrementMetric('admin_deposit_unauthorized', String(req.user?.id));
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

    const { userId, amount, reason = 'Manual admin deposit' } = req.body;

    console.log('🏦 ADMIN DEPOSIT REQUEST:', {
      adminId: req.user!.id,
      targetUserId: userId,
      amount,
      reason
    });

    // Process deposit atomically
    const result = await prisma.$transaction(async (tx) => {
      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { userId: String(userId) },
        data: { 
          balance: { increment: amount },
          updatedAt: new Date()
        }
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: String(userId),
          amount,
          type: 'credit',
          source: 'admin_deposit',
          status: 'completed',
          description: `${reason} (Admin: ${req.user!.id})`,
          reference: `ADMIN_DEPOSIT_${Date.now()}`,
          idempotencyKey: `admin_deposit_${userId}_${Date.now()}`
        }
      });

      console.log('✅ ADMIN DEPOSIT COMPLETED:', {
        userId,
        amount,
        newBalance: updatedWallet.balance,
        transactionId: transaction.id
      });

      return {
        wallet: updatedWallet,
        transaction
      };
    });

    // Log success metric
    await monitoringService.incrementMetric('admin_deposit_success', String(req.user!.id), {
      targetUserId: userId,
      amount,
      transactionId: result.transaction.id
    });

    res.json({
      success: true,
      message: 'Admin deposit completed successfully',
      data: {
        userId,
        amount,
        newBalance: result.wallet.balance,
        transactionId: result.transaction.id,
        reference: result.transaction.reference,
        reason
      }
    });

  } catch (error: any) {
    console.error('❌ ADMIN DEPOSIT ERROR:', error);
    
    await monitoringService.incrementMetric('admin_deposit_error', String(req.user?.id), {
      error: error.message,
      targetUserId: req.body?.userId,
      amount: req.body?.amount
    });

    res.status(500).json({
      success: false,
      error: 'Admin deposit failed',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/deposit/history - Get admin deposit history
 */
router.get('/deposit/history', [
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

    const deposits = await prisma.transaction.findMany({
      where: {
        source: 'admin_deposit',
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
        deposits: deposits.map(deposit => ({
          id: deposit.id,
          userId: deposit.userId,
          userEmail: deposit.user?.email,
          userName: deposit.user?.name,
          amount: deposit.amount,
          description: deposit.description,
          reference: deposit.reference,
          status: deposit.status,
          createdAt: deposit.createdAt
        })),
        total: deposits.length
      }
    });

  } catch (error: any) {
    console.error('❌ ADMIN DEPOSIT HISTORY ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deposit history',
      details: error.message
    });
  }
});

export default router;
