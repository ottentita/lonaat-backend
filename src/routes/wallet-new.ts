import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = Router();

// ==================== WALLET ENDPOINTS ====================

/**
 * GET /api/wallet - Get user wallet (REAL DATA ONLY)
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('💰 GET WALLET REQUEST - REAL DATA FROM DB');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('📊 Fetching wallet for user ID:', userId);

    // Fetch wallet from database
    const wallet = await prisma.wallet.findUnique({
      where: { userId: Number(userId) }
    });

    // If wallet not found, return zeros (NOT mock data)
    if (!wallet) {
      console.log('⚠️ Wallet not found, returning empty state (zeros)');
      return res.json({
        success: true,
        wallet: {
          id: null,
          balance: 0,
          withdrawable_balance: 0,
          locked_balance: 0,
          tokens: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          totalTokensBought: 0,
          totalTokensSpent: 0,
          currency: 'XAF',
          isActive: false,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      });
    }

    // Compute withdrawable balance from real data
    const balance = wallet.balance;
    const locked_balance = wallet.locked_balance || 0;
    const withdrawable_balance = balance - locked_balance;

    // Aggregate totals from TransactionLedger (if exists)
    let totalEarnedFromLedger = wallet.totalEarned;
    let totalWithdrawnFromLedger = wallet.totalWithdrawn;

    try {
      // Try to get more accurate totals from ledger
      const ledgerStats = await prisma.transactionLedger.aggregate({
        where: { userId: Number(userId) },
        _sum: {
          amount: true
        }
      });

      // If ledger exists, use it for verification
      if (ledgerStats._sum.amount !== null) {
        console.log('📊 Ledger total:', ledgerStats._sum.amount);
      }
    } catch (ledgerError) {
      // Ledger might not exist or have data, use wallet totals
      console.log('ℹ️ Using wallet totals (ledger not available)');
    }

    console.log('✅ REAL WALLET DATA RETURNED for user:', userId);
    console.log('   Balance:', balance);
    console.log('   Locked:', locked_balance);
    console.log('   Withdrawable:', withdrawable_balance);

    res.json({
      success: true,
      wallet: {
        id: wallet.id,
        balance: balance,
        withdrawable_balance: withdrawable_balance,
        locked_balance: locked_balance,
        tokens: wallet.tokens,
        totalEarned: totalEarnedFromLedger,
        totalWithdrawn: totalWithdrawnFromLedger,
        totalTokensBought: wallet.totalTokensBought,
        totalTokensSpent: wallet.totalTokensSpent,
        currency: wallet.currency,
        isActive: wallet.isActive,
        updatedAt: wallet.updatedAt.toISOString(),
        createdAt: wallet.createdAt.toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Get wallet error:', error);
    res.status(500).json({ 
      error: 'Failed to get wallet',
      details: error.message 
    });
  }
});

/**
 * POST /api/wallet/add - Add funds to wallet
 */
router.post('/add', [
  authMiddleware,
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').optional().isString(),
  body('reference').optional().isString()
], async (req: AuthRequest, res: Response) => {
  console.log('💰 ADD FUNDS TO WALLET REQUEST');
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { amount, description, reference } = req.body;

    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          currency: 'XAF',
          isActive: true
        }
      });
    }

    await prisma.$transaction(async (tx) => {
      // Update wallet balance
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: amount
          },
          totalEarned: {
            increment: amount
          }
        }
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'earning',
          amount: amount,
          description: description || 'Funds added to wallet',
          reference: reference || null,
          status: 'completed',
          metadata: {
            action: 'add_funds',
            previousBalance: wallet.balance,
            newBalance: wallet.balance + amount
          }
        }
      });
    });

    // Get updated wallet
    const updatedWallet = await prisma.wallet.findUnique({
      where: { id: wallet.id }
    });

    console.log('✅ Funds added to wallet:', {
      userId,
      amount,
      newBalance: updatedWallet?.balance
    });

    res.json({
      success: true,
      message: 'Funds added successfully',
      wallet: {
        id: updatedWallet!.id,
        balance: updatedWallet!.balance,
        tokens: updatedWallet!.tokens,
        totalEarned: updatedWallet!.totalEarned,
        totalWithdrawn: updatedWallet!.totalWithdrawn,
        totalTokensBought: updatedWallet!.totalTokensBought,
        totalTokensSpent: updatedWallet!.totalTokensSpent,
        currency: updatedWallet!.currency,
        updatedAt: updatedWallet!.updatedAt
      }
    });

  } catch (error: any) {
    console.error('❌ Add funds error:', error);
    res.status(500).json({ 
      error: 'Failed to add funds',
      details: error.message 
    });
  }
});

/**
 * POST /api/wallet/deduct - Deduct funds from wallet
 */
router.post('/deduct', [
  authMiddleware,
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').optional().isString(),
  body('reference').optional().isString()
], async (req: AuthRequest, res: Response) => {
  console.log('💰 DEDUCT FUNDS FROM WALLET REQUEST');
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { amount, description, reference } = req.body;

    // Get wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    await prisma.$transaction(async (tx) => {
      // Update wallet balance
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            decrement: amount
          },
          totalWithdrawn: {
            increment: amount
          }
        }
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'payment',
          amount: -amount,
          description: description || 'Funds deducted from wallet',
          reference: reference || null,
          status: 'completed',
          metadata: {
            action: 'deduct_funds',
            previousBalance: wallet.balance,
            newBalance: wallet.balance - amount
          }
        }
      });
    });

    // Get updated wallet
    const updatedWallet = await prisma.wallet.findUnique({
      where: { id: wallet.id }
    });

    console.log('✅ Funds deducted from wallet:', {
      userId,
      amount,
      newBalance: updatedWallet?.balance
    });

    res.json({
      success: true,
      message: 'Funds deducted successfully',
      wallet: {
        id: updatedWallet!.id,
        balance: updatedWallet!.balance,
        tokens: updatedWallet!.tokens,
        totalEarned: updatedWallet!.totalEarned,
        totalWithdrawn: updatedWallet!.totalWithdrawn,
        totalTokensBought: updatedWallet!.totalTokensBought,
        totalTokensSpent: updatedWallet!.totalTokensSpent,
        currency: updatedWallet!.currency,
        updatedAt: updatedWallet!.updatedAt
      }
    });

  } catch (error: any) {
    console.error('❌ Deduct funds error:', error);
    res.status(500).json({ 
      error: 'Failed to deduct funds',
      details: error.message 
    });
  }
});

// ==================== TRANSACTIONS ====================

/**
 * GET /api/transactions - Get user transactions
 */
router.get('/transactions', authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('📋 GET TRANSACTIONS REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit = 50, offset = 0, type, status } = req.query;

    const where: any = { userId };
    if (type) where.type = type;
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      }),
      prisma.transaction.count({ where })
    ]);

    console.log('✅ Transactions retrieved:', transactions.length);

    res.json({
      success: true,
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        reference: t.reference,
        status: t.status,
        metadata: t.metadata,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      })),
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error: any) {
    console.error('❌ Get transactions error:', error);
    res.status(500).json({ 
      error: 'Failed to get transactions',
      details: error.message 
    });
  }
});

/**
 * GET /api/wallet - Get user wallet
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('💰 GET WALLET REQUEST - REAL DATA FROM DB');
  
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Calculate REAL balance from transactions ONLY (NO hardcoded values)
    const creditSum: any = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM transactions 
       WHERE user_id = $1 AND type = 'credit' AND status = 'completed'`,
      userId
    );

    const debitSum: any = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM transactions 
       WHERE user_id = $1 AND type = 'debit' AND status = 'completed'`,
      userId
    );

    const pendingSum: any = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM transactions 
       WHERE user_id = $1 AND type = 'credit' AND status = 'pending'`,
      userId
    );

    const totalCredits = parseFloat(creditSum[0]?.total || 0);
    const totalDebits = parseFloat(debitSum[0]?.total || 0);
    const totalPending = parseFloat(pendingSum[0]?.total || 0);
    const realBalance = totalCredits - totalDebits;

    // Get recent transactions
    const transactions: any = await prisma.$queryRawUnsafe(
      `SELECT id, type, amount, description, status, reference, created_at as "createdAt"
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      userId
    );

    console.log('✅ WALLET DATA (REAL):', {
      userId,
      realBalance,
      totalCredits,
      totalDebits,
      totalPending
    });

    res.json({
      balance: realBalance,
      currency: 'USD',
      pendingBalance: totalPending,
      totalEarnings: totalCredits,
      totalWithdrawn: totalDebits,
      recentTransactions: transactions || []
    });

  } catch (error: any) {
    console.error('❌ Get wallet error:', error);
    res.status(500).json({ 
      error: 'Failed to get wallet',
      details: error.message 
    });
  }
});

export default router;
