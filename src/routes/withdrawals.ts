import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { sendMTNPayment } from '../services/mtn.service';

const router = Router();

// POST /api/withdrawals - Create withdrawal request
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const startTime = Date.now();
  console.log('💸 CREATE WITHDRAWAL REQUEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. Authenticate user (use req.user)
    const userId = Number(req.user?.id);
    if (!userId || isNaN(userId)) {
      console.error('❌ FRAUD CHECK: Unauthorized request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { amount, method, account_details } = req.body;

    // LOG REQUEST
    console.log('📋 WITHDRAWAL REQUEST DETAILS:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Amount: $${amount}`);
    console.log(`   Method: ${method}`);
    console.log(`   IP: ${req.ip}`);
    console.log(`   User-Agent: ${req.headers['user-agent']?.substring(0, 50)}`);

    // 🔒 ANTI-FRAUD PROTECTION 1: MINIMUM WITHDRAWAL AMOUNT ($10)
    const MINIMUM_WITHDRAWAL = 10;
    if (!amount || amount < MINIMUM_WITHDRAWAL) {
      console.warn('🚨 FRAUD ALERT: Amount below minimum');
      console.warn(`   Requested: $${amount}`);
      console.warn(`   Minimum: $${MINIMUM_WITHDRAWAL}`);
      return res.status(400).json({ 
        error: 'Amount below minimum',
        message: `Minimum withdrawal amount is $${MINIMUM_WITHDRAWAL}`,
        minimum: MINIMUM_WITHDRAWAL
      });
    }

    // Validate amount > 0
    if (amount <= 0) {
      console.error('❌ FRAUD CHECK: Invalid amount');
      return res.status(400).json({ 
        error: 'Invalid amount',
        message: 'Amount must be greater than 0'
      });
    }

    // Validate method
    if (!method) {
      console.error('❌ FRAUD CHECK: Missing method');
      return res.status(400).json({ 
        error: 'Missing method',
        message: 'Withdrawal method is required'
      });
    }

    // 🔒 ANTI-FRAUD PROTECTION 2: RATE LIMITING (Max 3 per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayWithdrawals = await prisma.withdrawals.count({
      where: {
        user_id: userId,
        created_at: {
          gte: today
        }
      }
    });

    const MAX_DAILY_WITHDRAWALS = 3;
    if (todayWithdrawals >= MAX_DAILY_WITHDRAWALS) {
      console.warn('🚨 FRAUD ALERT: Rate limit exceeded');
      console.warn(`   User ID: ${userId}`);
      console.warn(`   Today's withdrawals: ${todayWithdrawals}`);
      console.warn(`   Limit: ${MAX_DAILY_WITHDRAWALS}`);
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: `Maximum ${MAX_DAILY_WITHDRAWALS} withdrawal requests per day`,
        todayCount: todayWithdrawals,
        limit: MAX_DAILY_WITHDRAWALS
      });
    }

    // 🔒 ANTI-FRAUD PROTECTION 3: PREVENT DUPLICATE PENDING
    const pendingWithdrawal = await prisma.withdrawals.findFirst({
      where: {
        user_id: userId,
        status: 'pending'
      }
    });

    if (pendingWithdrawal) {
      console.warn('🚨 FRAUD ALERT: Duplicate pending withdrawal attempt');
      console.warn(`   User ID: ${userId}`);
      console.warn(`   Existing pending ID: ${pendingWithdrawal.id}`);
      console.warn(`   Existing amount: $${pendingWithdrawal.amount}`);
      return res.status(400).json({ 
        error: 'Pending withdrawal exists',
        message: 'You already have a pending withdrawal. Please wait for it to be processed.',
        existingWithdrawal: {
          id: pendingWithdrawal.id,
          amount: pendingWithdrawal.amount,
          created_at: pendingWithdrawal.created_at
        }
      });
    }

    // 2. Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 3. Get user wallet and verify ownership
    const wallet = await prisma.wallet.findUnique({
      where: { userId: userId }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // SAFETY CHECK: Verify wallet belongs to user
    if (wallet.userId !== userId) {
      console.error('SECURITY ALERT: Wallet ownership mismatch', { userId, walletUserId: wallet.userId });
      return res.status(403).json({ error: 'Wallet ownership verification failed' });
    }
    
    // 4. Validate wallet.balance >= amount
    if (wallet.balance < amount) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        currentBalance: wallet.balance,
        requestedAmount: amount
      });
    }

    // 5. Create withdrawal AND lock balance immediately (using transaction)
    const [withdrawal] = await prisma.$transaction(async (tx) => {
      // FINAL SAFETY CHECK: Re-verify wallet ownership inside transaction
      const txWallet = await tx.wallet.findUnique({
        where: { userId: userId }
      });
      
      if (!txWallet || txWallet.userId !== userId) {
        throw new Error('Wallet ownership verification failed in transaction');
      }
      
      if (txWallet.balance < amount) {
        throw new Error('Insufficient balance');
      }
      
      const newWithdrawal = await tx.withdrawals.create({
        data: {
          user_id: userId,
          amount,
          method,
          account_details: account_details ? JSON.stringify(account_details) : null,
          status: 'pending',
          reference: `WD-${Date.now()}`
        }
      });

      await tx.wallet.update({
        where: { userId: userId },
        data: {
          balance: { decrement: amount },
          locked_balance: { increment: amount }
        }
      });

      // LEDGER ENTRY for withdrawal lock
      await tx.transactionLedger.create({
        data: {
          userId: userId,
          amount: Math.round(amount),
          type: 'debit',
          reason: `Withdrawal locked - ${newWithdrawal.reference}`
        }
      });

      return [newWithdrawal];
    });

    const processingTime = Date.now() - startTime;

    console.log('✅ WITHDRAWAL REQUEST CREATED SUCCESSFULLY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 WITHDRAWAL DETAILS:');
    console.log(`   Withdrawal ID: ${withdrawal.id}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Amount: $${amount.toFixed(2)}`);
    console.log(`   Method: ${method}`);
    console.log(`   Status: pending`);
    console.log('💰 BALANCE CHANGES:');
    console.log(`   Previous Available: $${wallet.balance.toFixed(2)}`);
    console.log(`   Amount Locked: $${amount.toFixed(2)}`);
    console.log(`   New Available: $${(wallet.balance - amount).toFixed(2)}`);
    console.log('🔒 FRAUD CHECKS PASSED:');
    console.log(`   ✅ Minimum amount: $${amount} >= $${10}`);
    console.log(`   ✅ Rate limit: ${todayWithdrawals + 1}/${MAX_DAILY_WITHDRAWALS} today`);
    console.log(`   ✅ No duplicate pending`);
    console.log(`⏱️  Processing time: ${processingTime}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 6. FORCE SAFE RESPONSE (always 200, no crashes exposed)
    return res.status(200).json({
      success: true,
      message: 'Withdrawal request created successfully',
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amount,
        method: withdrawal.method,
        status: withdrawal.status,
        created_at: withdrawal.created_at
      }
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    // 🔒 FAIL-SAFE ERROR LOGGING
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🔒 WITHDRAWAL TRANSACTION FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`   User ID: ${req.user?.id}`);
    console.error(`   Amount: ${req.body.amount}`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    console.error(`   Processing time: ${processingTime}ms`);
    console.error(`   Timestamp: ${new Date().toISOString()}`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // FORCE SAFE 200 RESPONSE (no crashes exposed to user)
    return res.status(200).json({ 
      success: false,
      error: error.message || 'Failed to create withdrawal',
      message: 'Withdrawal request could not be processed. Please try again.'
    });
  }
});

// POST /api/withdrawals/create - Create withdrawal request
router.post('/create', authMiddleware, [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('method').isIn(['mobile_money', 'crypto', 'bank_transfer']).withMessage('Invalid withdrawal method'),
  body('recipientInfo').notEmpty().withMessage('Recipient information is required')
], async (req: AuthRequest, res: Response) => {
  console.log('💸 CREATE WITHDRAWAL REQUEST');
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { amount, method, account_details } = req.body;

    // Validate userId is number
    const numUserId = Number(userId);
    if (isNaN(numUserId)) {
      return res.status(401).json({ error: 'Invalid user ID' });
    }

    // Get user wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: numUserId }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Check balance (but don't deduct yet)
    if (wallet.balance < amount) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        currentBalance: wallet.balance,
        requestedAmount: amount
      });
    }

    // Create withdrawal request
    const withdrawal = await prisma.withdrawals.create({
      data: {
        user_id: numUserId,
        amount,
        method,
        account_details: account_details ? JSON.stringify(account_details) : null,
        status: 'pending'
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    console.log('✅ Withdrawal created:', withdrawal.id);

    res.json({
      success: true,
      message: 'Withdrawal request created successfully',
      withdrawal
    });

  } catch (error: any) {
    console.error('❌ Create withdrawal error:', error);
    res.status(500).json({ 
      error: 'Failed to create withdrawal',
      details: error.message 
    });
  }
});

// GET /api/withdrawals - Get user withdrawals
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('📋 GET USER WITHDRAWALS REQUEST');
  
  try {
    const userId = Number(req.user?.id);
    if (!userId || isNaN(userId)) {
      return res.status(401).json({ error: 'Invalid user ID' });
    }

    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { user_id: userId };
    if (status) where.status = status;

    const withdrawals = await prisma.withdrawals.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: Number(limit)
    });

    const total = await prisma.withdrawals.count({ where });

    res.json({
      success: true,
      withdrawals,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error: any) {
    console.error('❌ Get withdrawals error:', error);
    res.status(500).json({ 
      error: 'Failed to get withdrawals',
      details: error.message 
    });
  }
});

// GET /api/withdrawals/admin - Get all withdrawals (admin only)
router.get('/admin', authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('📋 GET ALL WITHDRAWALS (ADMIN)');
  
  try {
    const adminUserId = Number(req.user?.id);
    if (isNaN(adminUserId)) {
      return res.status(401).json({ error: 'Invalid user ID' });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { role: true }
    });

    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 50, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;

    const withdrawals = await prisma.withdrawals.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: Number(limit),
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    const total = await prisma.withdrawals.count({ where });

    res.json({
      success: true,
      withdrawals,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error: any) {
    console.error('❌ Get admin withdrawals error:', error);
    res.status(500).json({ 
      error: 'Failed to get withdrawals',
      details: error.message 
    });
  }
});

// ...

// POST /api/withdrawals/:id/approve - Approve withdrawal (admin only)
router.post('/:id/approve', authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('✅ APPROVE WITHDRAWAL REQUEST');
  
  try {
    // TEMPORARY BYPASS FOR TESTING    // Check if user is admin
    const adminUserId = Number(req.user?.id);
    if (isNaN(adminUserId)) {
      return res.status(401).json({ error: 'Invalid user ID' });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, role: true, email: true }
    });

    console.log('🔍 ADMIN CHECK:', { 
      userId: req.user?.id, 
      userRole: adminUser?.role, 
      isRoleAdmin: adminUser?.role === 'admin'
    });

    // Role-based access control - NO HARDCODED EMAIL BYPASS
    if (!adminUser || adminUser.role !== 'admin') {
      console.log('❌ ADMIN ACCESS DENIED');
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('✅ ADMIN ACCESS GRANTED');

    const { id } = req.params;
    const withdrawalId = Number(id);
    if (isNaN(withdrawalId)) {
      return res.status(400).json({ error: 'Invalid withdrawal ID' });
    }

    console.log('🔍 FETCHING WITHDRAWAL:', withdrawalId);
    const withdrawal = await prisma.withdrawals.findUnique({
      where: { id: withdrawalId }
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Withdrawal can only be approved if pending',
        currentStatus: withdrawal.status
      });
    }

    // Process in transaction
    await prisma.$transaction(async (tx) => {
      // Unlock funds from locked_balance
      await tx.wallet.update({
        where: { userId: withdrawal.user_id },
        data: {
          locked_balance: { decrement: withdrawal.amount }
        }
      });

      // Update withdrawal status
      await tx.withdrawals.update({
        where: { id: withdrawalId },
        data: {
          status: 'approved'
        }
      });

      // Create ledger entry
      await tx.transactionLedger.create({
        data: {
          userId: withdrawal.user_id,
          amount: -Math.round(withdrawal.amount),
          type: 'debit',
          reason: `Withdrawal approved - ${withdrawal.reference}`
        }
      });
    });

    console.log('✅ Withdrawal approved:');
    console.log(`   Withdrawal ID: ${id}`);
    console.log(`   Amount: $${withdrawal.amount.toFixed(2)}`);

    // Get updated withdrawal
    const updatedWithdrawal = await prisma.withdrawals.findUnique({
      where: { id: withdrawalId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Transaction record disabled - Transaction model doesn't exist in schema
    // Use TransactionLedger if needed
    /*
    await prisma.transaction.create({
      data: {
        user: {
          connect: { id: withdrawal.userId }
        },
        wallet: {
          connect: { id: withdrawal.walletId }
        },
        type: 'withdrawal',
        amount: -withdrawal.amount,
        description: `Withdrawal approved - ${withdrawal.method}`,
        reference: withdrawal.id,
        status: 'completed',
        metadata: {
          withdrawalId: withdrawal.id,
          method: withdrawal.method,
          processedBy: adminUser.id
        }
      }
    });
    */

    console.log('✅ Withdrawal approved and processed:', withdrawal.id);

    res.json({
      success: true,
      message: 'Withdrawal approved and processed successfully',
      withdrawal: updatedWithdrawal
    });

  } catch (error: any) {
    console.error('❌ Approve withdrawal error:', error);
    res.status(500).json({ 
      error: 'Failed to approve withdrawal',
      details: error.message 
    });
  }
});

// POST /api/withdrawals/:id/reject - Reject withdrawal (admin only)
router.post('/:id/reject', authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('❌ REJECT WITHDRAWAL REQUEST');
  
  try {
    // Check if user is admin
    const adminUserId = Number(req.user?.id);
    if (isNaN(adminUserId)) {
      return res.status(401).json({ error: 'Invalid user ID' });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, role: true }
    });

    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const withdrawalId = Number(id);
    if (isNaN(withdrawalId)) {
      return res.status(400).json({ error: 'Invalid withdrawal ID' });
    }

    // Get withdrawal
    const withdrawal = await prisma.withdrawals.findUnique({
      where: { id: withdrawalId }
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Only pending withdrawals can be rejected',
        currentStatus: withdrawal.status
      });
    }

    // Return locked funds and reject in transaction
    await prisma.$transaction(async (tx) => {
      // Return funds to available balance
      await tx.wallet.update({
        where: { userId: withdrawal.user_id },
        data: {
          balance: { increment: withdrawal.amount },
          locked_balance: { decrement: withdrawal.amount }
        }
      });

      // Update withdrawal status
      await tx.withdrawals.update({
        where: { id: withdrawalId },
        data: {
          status: 'rejected'
        }
      });

      // Create ledger entry
      await tx.transactionLedger.create({
        data: {
          userId: withdrawal.user_id,
          amount: Math.round(withdrawal.amount),
          type: 'credit',
          reason: `Withdrawal rejected - funds returned - ${withdrawal.reference}`
        }
      });
    });

    console.log('✅ Withdrawal rejected and funds returned');

    res.json({
      success: true,
      message: 'Withdrawal rejected and funds returned to user',
      withdrawal: {
        id: withdrawal.id,
        status: 'rejected',
        amount: withdrawal.amount
      }
    });

  } catch (error: any) {
    console.error('❌ Reject withdrawal error:', error);
    res.status(500).json({ 
      error: 'Failed to reject withdrawal',
      details: error.message 
    });
  }
});

// POST /api/withdrawals/withdraw - Process withdrawal with MTN payment
router.post('/withdraw', authMiddleware, async (req: AuthRequest, res: Response) => {
  const startTime = Date.now();
  console.log('💸 PROCESS WITHDRAWAL WITH MTN PAYMENT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. Authenticate user
    const userId = req.user?.id;
    if (!userId) {
      console.error('❌ Unauthorized request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { amount, phone } = req.body;

    // 2. Validate input
    if (!amount || !phone) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ 
        error: 'Amount and phone are required',
        details: {
          amount: !amount ? 'Amount is required' : null,
          phone: !phone ? 'Phone is required' : null
        }
      });
    }

    // 3. Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      console.error('❌ Invalid amount');
      return res.status(400).json({ 
        error: 'Invalid amount',
        message: 'Amount must be a positive number'
      });
    }

    console.log('📋 WITHDRAWAL DETAILS:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Amount: ${numAmount} XAF`);
    console.log(`   Phone: ${phone}`);

    // 4. Validate phone format (Cameroon MTN)
    const phoneRegex = /^237[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      console.error('❌ Invalid phone format');
      return res.status(400).json({ 
        error: 'Invalid phone format',
        message: 'Phone must be in format: 237XXXXXXXXX (Cameroon MTN)'
      });
    }

    // 5. Check user wallet balance
    const numUserId = Number(userId);
    if (isNaN(numUserId)) {
      return res.status(401).json({ error: 'Invalid user ID' });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: numUserId }
    });

    if (!wallet) {
      console.error('❌ Wallet not found');
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (wallet.balance < numAmount) {
      console.error('❌ Insufficient balance');
      return res.status(400).json({ 
        error: 'Insufficient balance',
        currentBalance: wallet.balance,
        requestedAmount: numAmount
      });
    }

    // 6. Send MTN payment
    console.log('💸 Initiating MTN payment...');
    const referenceId = await sendMTNPayment(amount.toString(), phone);

    // 7. Update wallet balance and create withdrawal record in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from wallet
      const updatedWallet = await tx.wallet.update({
        where: { userId: numUserId },
        data: {
          balance: { decrement: numAmount },
          totalWithdrawn: { increment: numAmount }
        }
      });

      // Create withdrawal record
      const withdrawal = await tx.withdrawals.create({
        data: {
          user_id: numUserId,
          amount: numAmount,
          status: 'paid',
          method: 'mobile_money',
          reference: referenceId,
          account_details: JSON.stringify({ phone })
        }
      });

      return { updatedWallet, withdrawal };
    });

    const processingTime = Date.now() - startTime;

    console.log('✅ WITHDRAWAL SUCCESSFUL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TRANSACTION DETAILS:');
    console.log(`   Withdrawal ID: ${result.withdrawal.id}`);
    console.log(`   Reference ID: ${referenceId}`);
    console.log(`   Amount: ${numAmount} XAF`);
    console.log(`   Phone: ${phone}`);
    console.log('💰 BALANCE CHANGES:');
    console.log(`   Previous Balance: ${wallet.balance} XAF`);
    console.log(`   New Balance: ${result.updatedWallet.balance} XAF`);
    console.log(`   Total Withdrawn: ${result.updatedWallet.totalWithdrawn} XAF`);
    console.log(`⏱️  Processing time: ${processingTime}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    res.json({
      success: true,
      referenceId,
      message: 'Payment initiated successfully',
      withdrawal: {
        id: result.withdrawal.id,
        amount: numAmount,
        phone,
        currency: 'XAF',
        status: 'paid',
        created_at: result.withdrawal.created_at
      },
      wallet: {
        balance: result.updatedWallet.balance,
        totalWithdrawn: result.updatedWallet.totalWithdrawn
      }
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ WITHDRAWAL FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`   User ID: ${req.user?.id}`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    console.error(`   Processing time: ${processingTime}ms`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    res.status(500).json({ 
      success: false,
      error: error.message || 'Withdrawal failed',
      message: 'Failed to process withdrawal. Please try again.'
    });
  }
});

export default router;
