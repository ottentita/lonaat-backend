import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { logPaymentAction } from '../services/audit';
import { encryptBankAccountNumber, decryptBankAccountNumber, getLast4, maskAccountNumber } from '../services/encryption';

const router = Router();
const prisma = new PrismaClient();

const MIN_WITHDRAWAL_AMOUNT = 10;

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
      { amount: pkg.price, credits_to_add, package_id },
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

router.get('/bank-account', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { user_id: req.user!.id }
    });

    if (!bankAccount) {
      return res.json({ bank_account: null, has_bank_details: false });
    }

    res.json({
      bank_account: {
        id: bankAccount.id,
        bank_name: bankAccount.bank_name,
        account_name: bankAccount.account_name,
        account_number_last4: bankAccount.account_number_last4,
        account_number_masked: '****' + bankAccount.account_number_last4,
        country: bankAccount.country,
        swift_code: bankAccount.swift_code,
        routing_code: bankAccount.routing_code,
        is_verified: bankAccount.is_verified,
        created_at: bankAccount.created_at,
        updated_at: bankAccount.updated_at
      },
      has_bank_details: true
    });
  } catch (error) {
    console.error('Get bank account error:', error);
    res.status(500).json({ error: 'Failed to get bank account' });
  }
});

router.post('/bank-account', [
  authMiddleware,
  body('bank_name').notEmpty().withMessage('Bank name is required'),
  body('account_name').notEmpty().withMessage('Account holder name is required'),
  body('account_number').notEmpty().withMessage('Account number is required'),
  body('country').notEmpty().withMessage('Country is required')
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { bank_name, account_name, account_number, country, swift_code, routing_code } = req.body;

    const encryptedAccountNumber = encryptBankAccountNumber(account_number);
    const last4 = getLast4(account_number);

    const existingAccount = await prisma.bankAccount.findUnique({
      where: { user_id: req.user!.id }
    });

    let bankAccount;
    if (existingAccount) {
      bankAccount = await prisma.bankAccount.update({
        where: { user_id: req.user!.id },
        data: {
          bank_name,
          account_name,
          account_number_cipher: encryptedAccountNumber,
          account_number_last4: last4,
          country,
          swift_code: swift_code || null,
          routing_code: routing_code || null
        }
      });

      await logPaymentAction(
        req.user!.id,
        'bank_account_updated',
        bankAccount.id,
        { bank_name, account_number_last4: last4, country },
        req
      );
    } else {
      bankAccount = await prisma.bankAccount.create({
        data: {
          user_id: req.user!.id,
          bank_name,
          account_name,
          account_number_cipher: encryptedAccountNumber,
          account_number_last4: last4,
          country,
          swift_code: swift_code || null,
          routing_code: routing_code || null
        }
      });

      await logPaymentAction(
        req.user!.id,
        'bank_account_created',
        bankAccount.id,
        { bank_name, account_number_last4: last4, country },
        req
      );
    }

    res.json({
      message: existingAccount ? 'Bank details updated successfully' : 'Bank details saved successfully',
      bank_account: {
        id: bankAccount.id,
        bank_name: bankAccount.bank_name,
        account_name: bankAccount.account_name,
        account_number_last4: bankAccount.account_number_last4,
        account_number_masked: '****' + bankAccount.account_number_last4,
        country: bankAccount.country,
        swift_code: bankAccount.swift_code,
        routing_code: bankAccount.routing_code
      }
    });
  } catch (error) {
    console.error('Save bank account error:', error);
    res.status(500).json({ error: 'Failed to save bank details' });
  }
});

router.post('/withdraw/quick', [
  authMiddleware,
  body('amount').isFloat({ min: MIN_WITHDRAWAL_AMOUNT }).withMessage(`Minimum withdrawal is $${MIN_WITHDRAWAL_AMOUNT}`)
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { amount } = req.body;
    const withdrawAmount = parseFloat(amount);

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { user_id: req.user!.id }
    });

    if (!bankAccount) {
      return res.status(400).json({ 
        error: 'No bank details saved. Please add your bank details first.',
        requires_bank_details: true
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { withdrawable_balance: true, is_blocked: true, is_admin: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Account is blocked. Contact support.' });
    }

    if (!user.is_admin && user.withdrawable_balance < withdrawAmount) {
      return res.status(400).json({ 
        error: 'Insufficient withdrawable balance',
        available: user.withdrawable_balance,
        requested: withdrawAmount
      });
    }

    if (!user.is_admin) {
      const pendingWithdrawals = await prisma.withdrawalRequest.findMany({
        where: { user_id: req.user!.id, status: 'pending' }
      });

      if (pendingWithdrawals.length >= 3) {
        return res.status(400).json({ error: 'You have too many pending withdrawals. Please wait for approval.' });
      }
    }

    const decryptedAccountNumber = decryptBankAccountNumber(bankAccount.account_number_cipher);

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        user_id: req.user!.id,
        amount: withdrawAmount,
        status: 'pending',
        payment_method: 'bank_transfer',
        bank_name: bankAccount.bank_name,
        account_number: decryptedAccountNumber,
        account_name: bankAccount.account_name,
        bank_code: bankAccount.swift_code,
        bank_account_id: bankAccount.id,
        payment_details: JSON.stringify({
          bank_name: bankAccount.bank_name,
          account_number: decryptedAccountNumber,
          account_name: bankAccount.account_name,
          swift_code: bankAccount.swift_code,
          country: bankAccount.country
        })
      }
    });

    if (!user.is_admin) {
      await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          withdrawable_balance: { decrement: withdrawAmount }
        }
      });
    }

    await prisma.transaction.create({
      data: {
        user_id: req.user!.id,
        type: 'withdrawal_request',
        amount: -withdrawAmount,
        status: 'pending',
        description: `Quick withdrawal to ${bankAccount.bank_name}`,
        extra_data: { withdrawal_id: withdrawal.id, one_click: true }
      }
    });

    await logPaymentAction(
      req.user!.id,
      'quick_withdrawal_requested',
      withdrawal.id,
      { amount: withdrawAmount, bank_name: bankAccount.bank_name },
      req
    );

    res.status(201).json({
      message: 'Withdrawal request submitted successfully',
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawAmount,
        status: 'pending',
        bank_name: bankAccount.bank_name,
        account_name: bankAccount.account_name,
        account_number_masked: '****' + bankAccount.account_number_last4
      }
    });
  } catch (error) {
    console.error('Quick withdrawal error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal request' });
  }
});

export default router;
