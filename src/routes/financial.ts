import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import walletService from '../services/walletService';
import { body, validationResult } from 'express-validator';

const router = Router();

// ==================== USER ENDPOINTS ====================

/**
 * GET /api/financial/wallet - Get user wallet
 */
router.get('/wallet', authMiddleware, async (req: AuthRequest, res) => {
  console.log('💰 GET WALLET REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const wallet = await walletService.getOrCreateWallet(String(userId));

    console.log('✅ Wallet retrieved:', wallet.id);

    // Ensure wallet response has all required fields with defaults
    const walletResponse = {
      id: wallet.id,
      balance: wallet.balance || 0,
      currency: wallet.currency || 'XAF',
      updatedAt: wallet.updatedAt || new Date().toISOString(),
      tokens: wallet.tokens || 0,
      totalEarned: wallet.totalEarned || 0,
      totalWithdrawn: wallet.totalWithdrawn || 0,
      totalTokensBought: wallet.totalTokensBought || 0,
      totalTokensSpent: wallet.totalTokensSpent || 0,
      isActive: wallet.isActive !== false,
      tokenBalance: wallet.tokens || 0
    };

    res.json({
      success: true,
      wallet: walletResponse
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
 * GET /api/financial/transactions - Get user transactions
 */
router.get('/transactions', authMiddleware, async (req: AuthRequest, res) => {
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
        status: t.status,
        method: t.method,
        description: t.description,
        createdAt: t.createdAt
      })),
      total,
      limit: Number(limit),
      offset: Number(offset)
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
 * POST /api/financial/deposit - Submit deposit request
 */
router.post('/deposit', [
  authMiddleware,
  body('amount').isFloat({ min: 100 }).withMessage('Minimum deposit is 100 XAF'),
  body('method').isIn(['crypto', 'momo']).withMessage('Invalid payment method'),
  body('proof').optional().isString()
], async (req: AuthRequest, res) => {
  console.log('💵 DEPOSIT REQUEST');
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { amount, method, proof } = req.body;

    console.log('👤 User:', userId);
    console.log('💰 Amount:', amount, 'XAF');
    console.log('💳 Method:', method);

    // Create deposit request
    const deposit = await prisma.deposit.create({
      data: {
        userId,
        amount: parseFloat(amount),
        method,
        proof: proof || null,
        status: 'pending'
      }
    });

    console.log('✅ Deposit request created:', deposit.id);

    res.json({
      success: true,
      deposit: {
        id: deposit.id,
        amount: deposit.amount,
        method: deposit.method,
        status: deposit.status,
        createdAt: deposit.createdAt
      },
      message: 'Deposit request submitted. Awaiting admin approval.'
    });

  } catch (error: any) {
    console.error('❌ Deposit request error:', error);
    res.status(500).json({ 
      error: 'Failed to submit deposit request',
      details: error.message 
    });
  }
});

/**
 * POST /api/financial/withdraw - Submit withdrawal request
 */
router.post('/withdraw', [
  authMiddleware,
  body('amount').isFloat({ min: 500 }).withMessage('Minimum withdrawal is 500 XAF'),
  body('method').isIn(['MTN', 'Orange', 'Crypto']).withMessage('Invalid withdrawal method'),
  body('accountDetails').isObject().withMessage('Account details required')
], async (req: AuthRequest, res) => {
  console.log('💸 WITHDRAWAL REQUEST');
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { amount, method, accountDetails } = req.body;

    console.log('👤 User:', userId);
    console.log('💰 Amount:', amount, 'XAF');
    console.log('💳 Method:', method);

    // Validate sufficient balance
    const balance = await walletService.getWalletBalance(String(userId));
    if (balance < parseFloat(amount)) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        available: balance,
        required: parseFloat(amount)
      });
    }

    // Deduct from wallet immediately
    await walletService.deductFunds(
      String(userId),
      parseFloat(amount),
      'withdrawal',
      method,
      `Withdrawal request via ${method}`
    );

    // Create withdrawal request
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId,
        amount: parseFloat(amount),
        method,
        accountDetails: JSON.stringify(accountDetails),
        status: 'pending'
      }
    });

    console.log('✅ Withdrawal request created:', withdrawal.id);
    console.log('💰 Amount deducted from wallet');

    res.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amount,
        method: withdrawal.method,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt
      },
      message: 'Withdrawal request submitted. Amount deducted from wallet. Awaiting admin approval.'
    });

  } catch (error: any) {
    console.error('❌ Withdrawal request error:', error);
    res.status(500).json({ 
      error: 'Failed to submit withdrawal request',
      details: error.message 
    });
  }
});

/**
 * GET /api/financial/deposits - Get user deposits
 */
router.get('/deposits', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📋 GET DEPOSITS REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status } = req.query;

    const where: any = { userId };
    if (status) where.status = status;

    const deposits = await prisma.deposit.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ Deposits retrieved:', deposits.length);

    res.json({
      success: true,
      deposits: deposits.map(d => ({
        id: d.id,
        amount: d.amount,
        method: d.method,
        status: d.status,
        createdAt: d.createdAt,
        processedAt: d.processedAt
      }))
    });

  } catch (error: any) {
    console.error('❌ Get deposits error:', error);
    res.status(500).json({ 
      error: 'Failed to get deposits',
      details: error.message 
    });
  }
});

/**
 * GET /api/financial/withdrawals - Get user withdrawals
 */
router.get('/withdrawals', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📋 GET WITHDRAWALS REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status } = req.query;

    const where: any = { userId };
    if (status) where.status = status;

    const withdrawals = await prisma.withdrawal.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ Withdrawals retrieved:', withdrawals.length);

    res.json({
      success: true,
      withdrawals: withdrawals.map(w => ({
        id: w.id,
        amount: w.amount,
        method: w.method,
        status: w.status,
        createdAt: w.createdAt,
        processedAt: w.processedAt
      }))
    });

  } catch (error: any) {
    console.error('❌ Get withdrawals error:', error);
    res.status(500).json({ 
      error: 'Failed to get withdrawals',
      details: error.message 
    });
  }
});

// ==================== ADMIN ENDPOINTS ====================

/**
 * GET /api/financial/admin/withdrawals - Get all withdrawal requests (admin)
 */
router.get('/admin/withdrawals', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📋 ADMIN GET WITHDRAWALS REQUEST');
  
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, limit = 50, offset = 0 } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        include: {
          wallet: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      }),
      prisma.withdrawal.count({ where })
    ]);

    console.log('✅ Admin withdrawals retrieved:', withdrawals.length);

    res.json({
      success: true,
      withdrawals: withdrawals.map(w => ({
        id: w.id,
        amount: w.amount,
        method: w.method,
        recipientInfo: w.recipientInfo,
        status: w.status,
        adminNote: w.adminNote,
        processedBy: w.processedBy,
        processedAt: w.processedAt,
        createdAt: w.createdAt,
        user: w.wallet.user
      })),
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        pages: Math.ceil(total / Number(limit))
      }
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
 * PATCH /api/financial/admin/withdrawals/:id/approve - Approve withdrawal (admin)
 */
router.patch('/admin/withdrawals/:id/approve', authMiddleware, async (req: AuthRequest, res) => {
  console.log('✅ ADMIN APPROVE WITHDRAWAL REQUEST');
  
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { adminNote } = req.body;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: { wallet: true }
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal already processed' });
    }

    if (withdrawal.wallet.balance < withdrawal.amount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    await prisma.$transaction(async (tx) => {
      // Update withdrawal status
      await tx.withdrawal.update({
        where: { id },
        data: {
          status: 'approved',
          adminNote,
          processedBy: req.user!.id,
          processedAt: new Date()
        }
      });

      // Deduct from wallet
      await tx.wallet.update({
        where: { id: withdrawal.walletId },
        data: {
          balance: {
            decrement: withdrawal.amount
          },
          totalWithdrawn: {
            increment: withdrawal.amount
          }
        }
      });

      // Create withdrawal transaction
      await tx.transaction.create({
        data: {
          walletId: withdrawal.walletId,
          userId: withdrawal.userId,
          type: 'withdrawal',
          amount: -withdrawal.amount,
          description: `Withdrawal via ${withdrawal.method}`,
          reference: withdrawal.id,
          status: 'completed',
          metadata: {
            method: withdrawal.method,
            recipientInfo: withdrawal.recipientInfo
          }
        }
      });
    });

    console.log('✅ Withdrawal approved:', id);

    res.json({
      success: true,
      message: 'Withdrawal approved successfully'
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
 * PATCH /api/financial/admin/withdrawals/:id/reject - Reject withdrawal (admin)
 */
router.patch('/admin/withdrawals/:id/reject', authMiddleware, async (req: AuthRequest, res) => {
  console.log('❌ ADMIN REJECT WITHDRAWAL REQUEST');
  
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { adminNote } = req.body;

    if (!adminNote) {
      return res.status(400).json({ error: 'Admin note is required for rejection' });
    }

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id }
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal already processed' });
    }

    await prisma.withdrawal.update({
      where: { id },
      data: {
        status: 'rejected',
        adminNote,
        processedBy: req.user!.id,
        processedAt: new Date()
      }
    });

    console.log('❌ Withdrawal rejected:', id);

    res.json({
      success: true,
      message: 'Withdrawal rejected successfully'
    });

  } catch (error: any) {
    console.error('❌ Reject withdrawal error:', error);
    res.status(500).json({ 
      error: 'Failed to reject withdrawal',
      details: error.message 
    });
  }
});

// ==================== COMMISSION ENGINE ====================

/**
 * GET /api/financial/commission-rates - Get commission rates
 */
router.get('/commission-rates', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📊 GET COMMISSION RATES REQUEST');
  
  try {
    const { entityType } = req.query;

    const where: any = { isActive: true };
    if (entityType) where.entityType = entityType;

    const rates = await prisma.commissionRate.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ Commission rates retrieved:', rates.length);

    res.json({
      success: true,
      rates
    });

  } catch (error: any) {
    console.error('❌ Get commission rates error:', error);
    res.status(500).json({ 
      error: 'Failed to get commission rates',
      details: error.message 
    });
  }
});

/**
 * POST /api/financial/commission-rates - Add commission rate (admin)
 */
router.post('/commission-rates', [
  authMiddleware,
  body('entityType').notEmpty().withMessage('Entity type is required'),
  body('rate').isFloat({ min: 0, max: 100 }).withMessage('Rate must be between 0 and 100')
], async (req: AuthRequest, res) => {
  console.log('📊 ADD COMMISSION RATE REQUEST');
  
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { entityType, entityTypeValue, rate } = req.body;

    const commissionRate = await prisma.commissionRate.create({
      data: {
        entityType,
        entityTypeValue,
        rate,
        isActive: true
      }
    });

    console.log('✅ Commission rate created:', commissionRate.id);

    res.status(201).json({
      success: true,
      message: 'Commission rate created successfully',
      commissionRate
    });

  } catch (error: any) {
    console.error('❌ Create commission rate error:', error);
    res.status(500).json({ 
      error: 'Failed to create commission rate',
      details: error.message 
    });
  }
});

/**
 * POST /api/financial/calculate-commission - Calculate commission for a transaction
 */
router.post('/calculate-commission', authMiddleware, async (req: AuthRequest, res) => {
  console.log('💰 CALCULATE COMMISSION REQUEST');
  
  try {
    const { entityType, entityTypeValue, amount } = req.body;

    if (!entityType || !amount) {
      return res.status(400).json({ error: 'Entity type and amount are required' });
    }

    // Find applicable commission rate
    const commissionRate = await prisma.commissionRate.findFirst({
      where: {
        entityType,
        entityTypeValue: entityTypeValue || null,
        isActive: true
      },
      orderBy: [
        { entityTypeValue: 'desc' }, // More specific first
        { createdAt: 'desc' }
      ]
    });

    if (!commissionRate) {
      return res.status(404).json({ error: 'Commission rate not found for this entity type' });
    }

    const commissionAmount = (amount * commissionRate.rate) / 100;

    console.log('✅ Commission calculated:', {
      entityType,
      amount,
      rate: commissionRate.rate,
      commission: commissionAmount
    });

    res.json({
      success: true,
      commission: {
        rate: commissionRate.rate,
        amount: commissionAmount,
        totalAfterCommission: amount - commissionAmount
      }
    });

  } catch (error: any) {
    console.error('❌ Calculate commission error:', error);
    res.status(500).json({ 
      error: 'Failed to calculate commission',
      details: error.message 
    });
  }
});

/**
 * POST /api/financial/process-commission - Process commission payment to wallet
 */
router.post('/process-commission', authMiddleware, async (req: AuthRequest, res) => {
  console.log('💰 PROCESS COMMISSION REQUEST');
  
  try {
    const { userId, entityType, entityTypeValue, amount, reference, description } = req.body;

    if (!userId || !entityType || !amount) {
      return res.status(400).json({ error: 'User ID, entity type, and amount are required' });
    }

    // Calculate commission
    const commissionResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:4000'}/api/financial/calculate-commission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'admin-token'}`
      },
      body: JSON.stringify({ entityType, entityTypeValue, amount })
    });

    if (!commissionResponse.ok) {
      throw new Error('Failed to calculate commission');
    }

    const commissionData = await commissionResponse.json();

    // Get or create user wallet
    const wallet = await walletService.getOrCreateWallet(userId);

    await prisma.$transaction(async (tx) => {
      // Add commission to wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: commissionData.commission.amount
          },
          totalEarned: {
            increment: commissionData.commission.amount
          }
        }
      });

      // Create commission transaction
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'commission',
          amount: commissionData.commission.amount,
          description: description || `Commission from ${entityType}`,
          reference,
          status: 'completed',
          metadata: {
            entityType,
            entityTypeValue,
            originalAmount: amount,
            commissionRate: commissionData.commission.rate
          }
        }
      });
    });

    console.log('✅ Commission processed:', {
      userId,
      amount: commissionData.commission.amount
    });

    res.json({
      success: true,
      message: 'Commission processed successfully',
      commission: commissionData.commission
    });

  } catch (error: any) {
    console.error('❌ Process commission error:', error);
    res.status(500).json({ 
      error: 'Failed to process commission',
      details: error.message 
    });
  }
});

export default router;
