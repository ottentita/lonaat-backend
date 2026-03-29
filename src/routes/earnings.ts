/**
 * EARNINGS ROUTES - REFACTORED
 * Uses new Transaction model ONLY
 * Balance computed from transactions (source of truth)
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import financialCore from '../services/financialCore.service';

const router = Router();

/**
 * GET /api/earnings - Get user earnings (credit transactions from commissions)
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const limit = Number(req.query.limit) || 100;
    const offset = Number(req.query.offset) || 0;

    // Get earnings from Transaction model (credits from commissions)
    const result = await financialCore.getTransactions(
      userId,
      limit,
      offset,
      'credit',
      'commission'
    );

    return res.json({
      success: true,
      data: {
        earnings: result.transactions.map(tx => ({
          id: tx.id,
          userId: tx.userId,
          amount: tx.amount,
          type: tx.type,
          source: tx.source,
          referenceId: tx.referenceId,
          createdAt: tx.createdAt
        })),
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          pages: result.pages
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Get earnings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get earnings',
      message: error.message
    });
  }
});

/**
 * GET /api/earnings/dashboard - Earnings dashboard summary
 */
router.get('/dashboard', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);

    // Get all credit transactions (earnings)
    const creditTransactions = await prisma.Transaction.findMany({
      where: {
        userId,
        type: 'credit'
      }
    });

    // Calculate totals
    const totalEarnings = creditTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    // Get commission earnings specifically
    const commissionEarnings = creditTransactions
      .filter(tx => tx.source === 'commission')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Get wallet balance
    const { balance } = await financialCore.calculateBalance(userId);

    // Get recent earnings (last 10)
    const recentEarnings = await prisma.Transaction.findMany({
      where: {
        userId,
        type: 'credit'
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return res.json({
      success: true,
      data: {
        summary: {
          totalEarnings,
          commissionEarnings,
          currentBalance: balance,
          earningsCount: creditTransactions.length
        },
        recentEarnings: recentEarnings.map(tx => ({
          id: tx.id,
          amount: tx.amount,
          source: tx.source,
          referenceId: tx.referenceId,
          createdAt: tx.createdAt
        }))
      }
    });
  } catch (error: any) {
    console.error('❌ Earnings dashboard error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get earnings dashboard',
      message: error.message
    });
  }
});

/**
 * GET /api/earnings/:id - Get specific earning details
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const earningId = Number(req.params.id);

    const transaction = await prisma.Transaction.findFirst({
      where: {
        id: earningId,
        userId,
        type: 'credit'
      }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Earning not found'
      });
    }

    // If it's a commission earning, get commission details
    let commissionDetails = null;
    if (transaction.source === 'commission' && transaction.referenceId) {
      commissionDetails = await prisma.Commission.findUnique({
        where: { id: transaction.referenceId }
      });
    }

    return res.json({
      success: true,
      data: {
        earning: {
          id: transaction.id,
          userId: transaction.userId,
          amount: transaction.amount,
          type: transaction.type,
          source: transaction.source,
          referenceId: transaction.referenceId,
          createdAt: transaction.createdAt
        },
        commission: commissionDetails
      }
    });
  } catch (error: any) {
    console.error('❌ Get earning error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get earning',
      message: error.message
    });
  }
});

export default router;
