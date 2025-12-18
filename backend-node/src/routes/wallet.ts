import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { logPaymentAction } from '../services/audit';

const router = Router();
const prisma = new PrismaClient();

const ADMIN_BANK_DETAILS = {
  bank_name: 'First Bank of Nigeria',
  account_name: 'Lonaat Technologies Ltd',
  account_number: '3076543210',
  swift_code: 'FBNINGLA',
  instructions: 'Please include your email as payment reference'
};

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let wallet = await prisma.creditWallet.findUnique({
      where: { user_id: req.user!.id }
    });

    if (!wallet) {
      wallet = await prisma.creditWallet.create({
        data: {
          user_id: req.user!.id,
          credits: 0,
          total_purchased: 0,
          total_spent: 0
        }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { balance: true }
    });

    res.json({
      wallet: {
        credits: wallet.credits,
        balance: user?.balance || 0,
        total_purchased: wallet.total_purchased,
        total_spent: wallet.total_spent
      }
    });
  } catch (error) {
    console.error('Wallet error:', error);
    res.status(500).json({ error: 'Failed to get wallet' });
  }
});

router.get('/transactions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { user_id: req.user!.id },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

router.post('/buy_credits', [
  authMiddleware,
  body('package_id').isInt().withMessage('Package ID required')
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { package_id } = req.body;

    const pkg = await prisma.creditPackage.findUnique({
      where: { id: parseInt(package_id) }
    });

    if (!pkg || !pkg.is_active) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const credits_to_add = pkg.credits + pkg.bonus_credits;

    const payment = await prisma.paymentRequest.create({
      data: {
        user_id: req.user!.id,
        purpose: 'credit_purchase',
        amount: pkg.price,
        currency: 'USD',
        payment_method: 'bank_transfer',
        package_id: pkg?.id || null,
        credits_to_add,
        status: 'pending'
      }
    });

    await logPaymentAction(
      req.user!.id,
      'credit_purchase_initiated',
      payment.id,
      { amount, credits_to_add, package_id },
      req
    );

    res.json({
      message: 'Payment request created',
      payment_id: payment.id,
      bank_details: ADMIN_BANK_DETAILS,
      credits_to_add
    });
  } catch (error) {
    console.error('Buy credits error:', error);
    res.status(500).json({ error: 'Failed to create payment request' });
  }
});

router.get('/packages', async (req, res: Response) => {
  try {
    const packages = await prisma.creditPackage.findMany({
      where: { is_active: true },
      orderBy: { display_order: 'asc' }
    });
    res.json({ packages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get packages' });
  }
});

router.post('/withdraw', [
  authMiddleware,
  body('amount').isFloat({ min: 10 }).withMessage('Minimum withdrawal is $10'),
  body('bank_name').notEmpty().withMessage('Bank name is required'),
  body('account_number').notEmpty().withMessage('Account number is required'),
  body('account_name').notEmpty().withMessage('Account name is required')
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { amount, bank_name, account_number, account_name, bank_code } = req.body;
    const withdrawAmount = parseFloat(amount);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { withdrawable_balance: true, is_blocked: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Account is blocked. Contact support.' });
    }

    if (user.withdrawable_balance < withdrawAmount) {
      return res.status(400).json({ 
        error: 'Insufficient withdrawable balance',
        available: user.withdrawable_balance,
        requested: withdrawAmount
      });
    }

    const pendingWithdrawals = await prisma.withdrawalRequest.findMany({
      where: { user_id: req.user!.id, status: 'pending' }
    });

    if (pendingWithdrawals.length >= 3) {
      return res.status(400).json({ error: 'You have too many pending withdrawals. Please wait for approval.' });
    }

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        user_id: req.user!.id,
        amount: withdrawAmount,
        status: 'pending',
        payment_method: 'bank_transfer',
        bank_name,
        account_number,
        account_name,
        bank_code: bank_code || null,
        payment_details: JSON.stringify({ bank_name, account_number, account_name, bank_code })
      }
    });

    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        withdrawable_balance: { decrement: withdrawAmount }
      }
    });

    await prisma.transaction.create({
      data: {
        user_id: req.user!.id,
        type: 'withdrawal_request',
        amount: -withdrawAmount,
        status: 'pending',
        description: `Withdrawal request to ${bank_name}`,
        extra_data: { withdrawal_id: withdrawal.id }
      }
    });

    res.status(201).json({
      message: 'Withdrawal request submitted',
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawAmount,
        status: 'pending',
        bank_name,
        account_name
      }
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ error: 'Failed to create withdrawal request' });
  }
});

router.get('/withdrawals', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { user_id: req.user!.id },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { withdrawable_balance: true, balance: true }
    });

    res.json({ 
      withdrawals,
      withdrawable_balance: user?.withdrawable_balance || 0,
      total_balance: user?.balance || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get withdrawals' });
  }
});

router.get('/balance', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { balance: true, withdrawable_balance: true }
    });

    const pendingCommissions = await prisma.commission.aggregate({
      where: { user_id: req.user!.id, status: 'pending' },
      _sum: { amount: true }
    });

    const approvedCommissions = await prisma.commission.aggregate({
      where: { user_id: req.user!.id, status: 'approved' },
      _sum: { amount: true }
    });

    const pendingWithdrawals = await prisma.withdrawalRequest.aggregate({
      where: { user_id: req.user!.id, status: 'pending' },
      _sum: { amount: true }
    });

    res.json({
      balance: user?.balance || 0,
      withdrawable_balance: user?.withdrawable_balance || 0,
      pending_commissions: pendingCommissions._sum.amount || 0,
      approved_commissions: approvedCommissions._sum.amount || 0,
      pending_withdrawals: pendingWithdrawals._sum.amount || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

export default router;
