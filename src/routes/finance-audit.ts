import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ============================================
// PHASE 1: FINANCE CENTER STABILITY
// ============================================

// GET /api/finance/audit - Audit wallet and ledger consistency
router.get('/audit', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    console.log('🔍 FINANCE AUDIT:', { userId });

    // Get wallet data
    const wallet = await prisma.wallet.findUnique({
      where: { userId: String(userId) }
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    // Get ledger totals
    const [credits, debits] = await Promise.all([
      prisma.transactionLedger.aggregate({
        where: {
          userId: Number(userId),
          type: 'credit'
        },
        _sum: { amount: true }
      }),
      prisma.transactionLedger.aggregate({
        where: {
          userId: Number(userId),
          type: 'debit'
        },
        _sum: { amount: true }
      })
    ]);

    const totalCredits = credits._sum.amount || 0;
    const totalDebits = debits._sum.amount || 0;
    const ledgerBalance = totalCredits - totalDebits;

    // Get withdrawals
    const withdrawals = await prisma.withdrawals.aggregate({
      where: {
        user_id: Number(userId),
        status: { in: ['approved', 'pending'] }
      },
      _sum: { amount: true }
    });

    const totalWithdrawals = withdrawals._sum.amount || 0;

    // Calculate expected balance
    const expectedBalance = ledgerBalance - totalWithdrawals;
    const walletBalance = wallet.balance + wallet.locked_balance;

    // Check consistency
    const isConsistent = Math.abs(walletBalance - expectedBalance) < 0.01; // Allow 1 cent difference for rounding

    const audit = {
      wallet: {
        available: wallet.balance,
        locked: wallet.locked_balance,
        total: walletBalance,
        totalEarned: wallet.totalEarned || 0,
        totalWithdrawn: wallet.totalWithdrawn || 0
      },
      ledger: {
        credits: totalCredits,
        debits: totalDebits,
        balance: ledgerBalance
      },
      withdrawals: {
        total: totalWithdrawals
      },
      calculated: {
        expectedBalance,
        actualBalance: walletBalance,
        difference: walletBalance - expectedBalance,
        isConsistent
      },
      status: isConsistent ? 'CONSISTENT' : 'INCONSISTENT'
    };

    console.log('✅ AUDIT COMPLETE:', audit);

    return res.json({
      success: true,
      data: audit
    });

  } catch (error: any) {
    console.error('❌ FINANCE AUDIT ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/finance/reconcile - Reconcile wallet with ledger
router.post('/reconcile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    console.log('🔧 RECONCILE WALLET:', { userId });

    // Run audit first
    const wallet = await prisma.wallet.findUnique({
      where: { userId: String(userId) }
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    const [credits, debits] = await Promise.all([
      prisma.transactionLedger.aggregate({
        where: { userId: Number(userId), type: 'credit' },
        _sum: { amount: true }
      }),
      prisma.transactionLedger.aggregate({
        where: { userId: Number(userId), type: 'debit' },
        _sum: { amount: true }
      })
    ]);

    const totalCredits = credits._sum.amount || 0;
    const totalDebits = debits._sum.amount || 0;
    const ledgerBalance = totalCredits - totalDebits;

    const withdrawals = await prisma.withdrawals.aggregate({
      where: {
        user_id: Number(userId),
        status: { in: ['approved', 'pending'] }
      },
      _sum: { amount: true }
    });

    const totalWithdrawals = withdrawals._sum.amount || 0;
    const expectedBalance = ledgerBalance - totalWithdrawals;
    const currentBalance = wallet.balance + wallet.locked_balance;

    // Only reconcile if there's a significant difference
    if (Math.abs(currentBalance - expectedBalance) < 0.01) {
      return res.json({
        success: true,
        message: 'Wallet already consistent',
        data: {
          balance: currentBalance,
          noChangeNeeded: true
        }
      });
    }

    // Reconcile by adjusting wallet balance
    const difference = expectedBalance - currentBalance;

    await prisma.$transaction(async (tx) => {
      // Update wallet
      await tx.wallet.update({
        where: { userId: String(userId) },
        data: {
          balance: { increment: difference }
        }
      });

      // Create ledger entry for reconciliation
      await tx.transactionLedger.create({
        data: {
          userId: Number(userId),
          amount: Math.abs(Math.round(difference)),
          type: difference > 0 ? 'credit' : 'debit',
          reason: 'Balance reconciliation'
        }
      });
    });

    console.log('✅ RECONCILIATION COMPLETE:', {
      previousBalance: currentBalance,
      expectedBalance,
      difference,
      newBalance: expectedBalance
    });

    return res.json({
      success: true,
      message: 'Wallet reconciled successfully',
      data: {
        previousBalance: currentBalance,
        newBalance: expectedBalance,
        adjustment: difference
      }
    });

  } catch (error: any) {
    console.error('❌ RECONCILE ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
