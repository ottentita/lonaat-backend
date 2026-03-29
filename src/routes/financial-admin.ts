import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import walletService from '../services/walletService';
import { body, validationResult } from 'express-validator';

const router = Router();

// Admin middleware - check if user is admin
const adminMiddleware = async (req: AuthRequest, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = Number(req.user.id);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  next();
};

// ==================== ADMIN ENDPOINTS ====================

/**
 * GET /api/financial/admin/deposits - Get all deposits (admin)
 */
router.get('/deposits', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  console.log('📋 ADMIN: GET ALL DEPOSITS');
  
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const [deposits, total] = await Promise.all([
      prisma.deposit.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      }),
      prisma.deposit.count({ where })
    ]);

    console.log('✅ Deposits retrieved:', deposits.length);

    res.json({
      success: true,
      deposits: deposits.map(d => ({
        id: d.id,
        userId: d.userId,
        user: d.user,
        amount: d.amount,
        method: d.method,
        proof: d.proof,
        status: d.status,
        adminNote: d.adminNote,
        processedBy: d.processedBy,
        processedAt: d.processedAt,
        createdAt: d.createdAt
      })),
      total
    });

  } catch (error: any) {
    console.error('❌ Admin get deposits error:', error);
    res.status(500).json({ 
      error: 'Failed to get deposits',
      details: error.message 
    });
  }
});

/**
 * POST /api/financial/admin/deposit/approve - Approve deposit
 */
router.post('/deposit/approve', [
  authMiddleware,
  adminMiddleware,
  body('depositId').isString().notEmpty()
], async (req: AuthRequest, res) => {
  console.log('✅ ADMIN: APPROVE DEPOSIT');
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { depositId } = req.body;

    console.log('👤 Admin:', adminId);
    console.log('🆔 Deposit ID:', depositId);

    // Process deposit approval
    const result = await walletService.processDepositApproval(depositId, adminId);

    console.log('✅ Deposit approved');
    console.log('💰 Amount added to wallet:', result.deposit.amount);
    console.log('💼 New balance:', result.wallet.balance);

    res.json({
      success: true,
      deposit: {
        id: result.deposit.id,
        userId: result.deposit.userId,
        amount: result.deposit.amount,
        status: result.deposit.status,
        processedAt: result.deposit.processedAt
      },
      wallet: {
        balance: result.wallet.balance
      },
      transaction: {
        id: result.transaction.id,
        type: result.transaction.type,
        amount: result.transaction.amount
      },
      message: 'Deposit approved and funds added to wallet'
    });

  } catch (error: any) {
    console.error('❌ Approve deposit error:', error);
    res.status(500).json({ 
      error: 'Failed to approve deposit',
      details: error.message 
    });
  }
});

/**
 * POST /api/financial/admin/deposit/reject - Reject deposit
 */
router.post('/deposit/reject', [
  authMiddleware,
  adminMiddleware,
  body('depositId').isString().notEmpty(),
  body('adminNote').optional().isString()
], async (req: AuthRequest, res) => {
  console.log('❌ ADMIN: REJECT DEPOSIT');
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { depositId, adminNote } = req.body;

    console.log('👤 Admin:', adminId);
    console.log('🆔 Deposit ID:', depositId);

    // Process deposit rejection
    const deposit = await walletService.processDepositRejection(
      depositId,
      adminId,
      adminNote
    );

    console.log('❌ Deposit rejected');

    res.json({
      success: true,
      deposit: {
        id: deposit.id,
        userId: deposit.userId,
        amount: deposit.amount,
        status: deposit.status,
        adminNote: deposit.adminNote,
        processedAt: deposit.processedAt
      },
      message: 'Deposit rejected'
    });

  } catch (error: any) {
    console.error('❌ Reject deposit error:', error);
    res.status(500).json({ 
      error: 'Failed to reject deposit',
      details: error.message 
    });
  }
});

/**
 * GET /api/financial/admin/withdrawals - Get all withdrawals (admin)
 */
router.get('/withdrawals', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  console.log('📋 ADMIN: GET ALL WITHDRAWALS');
  
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      }),
      prisma.withdrawal.count({ where })
    ]);

    console.log('✅ Withdrawals retrieved:', withdrawals.length);

    res.json({
      success: true,
      withdrawals: withdrawals.map(w => ({
        id: w.id,
        userId: w.userId,
        user: w.user,
        amount: w.amount,
        method: w.method,
        accountDetails: w.accountDetails ? JSON.parse(w.accountDetails) : null,
        status: w.status,
        adminNote: w.adminNote,
        processedBy: w.processedBy,
        processedAt: w.processedAt,
        createdAt: w.createdAt
      })),
      total
    });

  } catch (error: any) {
    console.error('❌ Admin get withdrawals error:', error);
    res.status(500).json({ 
      error: 'Failed to get withdrawals',
      details: error.message 
    });
  }
});

/**
 * POST /api/financial/admin/withdraw/approve - Approve withdrawal
 */
router.post('/withdraw/approve', [
  authMiddleware,
  adminMiddleware,
  body('withdrawalId').isString().notEmpty(),
  body('adminNote').optional().isString()
], async (req: AuthRequest, res) => {
  console.log('✅ ADMIN: APPROVE WITHDRAWAL');
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { withdrawalId, adminNote } = req.body;

    console.log('👤 Admin:', adminId);
    console.log('🆔 Withdrawal ID:', withdrawalId);

    // Process withdrawal approval
    const withdrawal = await walletService.processWithdrawalApproval(
      withdrawalId,
      adminId,
      adminNote
    );

    console.log('✅ Withdrawal approved');
    console.log('💰 Amount:', withdrawal.amount);

    res.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        method: withdrawal.method,
        status: withdrawal.status,
        adminNote: withdrawal.adminNote,
        processedAt: withdrawal.processedAt
      },
      message: 'Withdrawal approved. Please process the payment manually.'
    });

  } catch (error: any) {
    console.error('❌ Approve withdrawal error:', error);
    res.status(500).json({ 
      error: 'Failed to approve withdrawal',
      details: error.message 
    });
  }
});

/**
 * POST /api/financial/admin/withdraw/reject - Reject withdrawal
 */
router.post('/withdraw/reject', [
  authMiddleware,
  adminMiddleware,
  body('withdrawalId').isString().notEmpty(),
  body('adminNote').optional().isString()
], async (req: AuthRequest, res) => {
  console.log('❌ ADMIN: REJECT WITHDRAWAL');
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { withdrawalId, adminNote } = req.body;

    console.log('👤 Admin:', adminId);
    console.log('🆔 Withdrawal ID:', withdrawalId);

    // Process withdrawal rejection (refunds amount)
    const result = await walletService.processWithdrawalRejection(
      withdrawalId,
      adminId,
      adminNote
    );

    console.log('❌ Withdrawal rejected and refunded');
    console.log('💰 Amount refunded:', result.withdrawal.amount);
    console.log('💼 New balance:', result.wallet.balance);

    res.json({
      success: true,
      withdrawal: {
        id: result.withdrawal.id,
        userId: result.withdrawal.userId,
        amount: result.withdrawal.amount,
        status: result.withdrawal.status,
        adminNote: result.withdrawal.adminNote,
        processedAt: result.withdrawal.processedAt
      },
      wallet: {
        balance: result.wallet.balance
      },
      message: 'Withdrawal rejected and amount refunded to wallet'
    });

  } catch (error: any) {
    console.error('❌ Reject withdrawal error:', error);
    res.status(500).json({ 
      error: 'Failed to reject withdrawal',
      details: error.message 
    });
  }
});

/**
 * GET /api/financial/admin/stats - Get financial statistics
 */
router.get('/stats', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  console.log('📊 ADMIN: GET FINANCIAL STATS');
  
  try {
    const [
      totalDeposits,
      totalWithdrawals,
      pendingDeposits,
      pendingWithdrawals,
      totalWalletBalance
    ] = await Promise.all([
      prisma.deposit.aggregate({
        where: { status: 'confirmed' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.withdrawal.aggregate({
        where: { status: 'approved' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.deposit.count({
        where: { status: 'pending' }
      }),
      prisma.withdrawal.count({
        where: { status: 'pending' }
      }),
      prisma.wallet.aggregate({
        _sum: { balance: true }
      })
    ]);

    res.json({
      success: true,
      stats: {
        deposits: {
          total: totalDeposits._sum.amount || 0,
          count: totalDeposits?._count ?? 0,
          pending: pendingDeposits
        },
        withdrawals: {
          total: totalWithdrawals._sum.amount || 0,
          count: totalWithdrawals?._count ?? 0,
          pending: pendingWithdrawals
        },
        wallets: {
          totalBalance: totalWalletBalance._sum.balance || 0
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get stats',
      details: error.message 
    });
  }
});

export default router;
