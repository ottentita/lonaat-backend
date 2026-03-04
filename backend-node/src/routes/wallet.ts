import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { logPaymentAction } from '../services/audit';
import { encryptBankAccountNumber, decryptBankAccountNumber, getLast4, maskAccountNumber } from '../services/encryption';

const router = Router();

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

// Alias endpoint requested by frontend: /api/wallet/summary
router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let wallet = await prisma.creditWallet.findUnique({ where: { user_id: req.user!.id } });
    if (!wallet) {
      wallet = await prisma.creditWallet.create({ data: { user_id: req.user!.id, credits: 0, total_purchased: 0, total_spent: 0 } });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { balance: true } });

    res.json({
      wallet: {
        credits: wallet.credits,
        balance: user?.balance || 0,
        total_purchased: wallet.total_purchased,
        total_spent: wallet.total_spent
      }
    });
  } catch (error) {
    console.error('Wallet summary error:', error);
    res.status(500).json({ error: 'Failed to get wallet summary' });
  }
});

router.get('/transactions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { user_id: req.user!.id },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    res.json({ transactions: transactions || [] });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.json({ transactions: [], error: 'Failed to get transactions' });
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

const PAYOUT_METHODS = ['payoneer', 'mobile_money', 'usdt', 'btc', 'eth', 'bank_transfer'] as const;

import {
  getAllWalletBalances,
  addToWalletBalance,
  createPayout,
  getPayoutHistory,
  getPayoutStats,
  SUPPORTED_CURRENCIES,
  SupportedCurrency
} from '../services/payoutEngine';

router.get('/multi-currency', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const balances = await getAllWalletBalances(req.user!.id);
    const stats = await getPayoutStats(req.user!.id);
    
    res.json({
      balances,
      supported_currencies: SUPPORTED_CURRENCIES,
      stats
    });
  } catch (error) {
    console.error('Multi-currency wallet error:', error);
    res.status(500).json({ error: 'Failed to get wallet balances' });
  }
});

router.get('/payout-methods', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const methods = await prisma.payoutMethod.findMany({
      where: { user_id: req.user!.id },
      orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }]
    });

    res.json({
      payout_methods: methods.map(m => ({
        id: m.id,
        method_type: m.method_type,
        is_default: m.is_default,
        currency: m.currency,
        is_verified: m.is_verified,
        display_name: getPayoutMethodDisplayName(m),
        created_at: m.created_at
      })),
      available_methods: [
        { type: 'payoneer', name: 'Payoneer', currencies: ['USD', 'EUR'], min_payout: 20 },
        { type: 'mobile_money', name: 'Mobile Money (MTN/Orange)', currencies: ['XAF'], min_payout: 5000, networks: ['mtn_momo', 'orange_money'], countries: ['CM', 'CI', 'SN'] },
        { type: 'usdt', name: 'USDT (TRC20)', currencies: ['USDT'], min_payout: 10, networks: ['trc20', 'erc20', 'bep20'] },
        { type: 'btc', name: 'Bitcoin', currencies: ['BTC'], min_payout: 0.001 },
        { type: 'eth', name: 'Ethereum', currencies: ['ETH'], min_payout: 0.01 },
        { type: 'bank_transfer', name: 'Bank Transfer', currencies: ['USD', 'EUR', 'XAF'], min_payout: 50 }
      ]
    });
  } catch (error) {
    console.error('Get payout methods error:', error);
    res.status(500).json({ error: 'Failed to get payout methods' });
  }
});

function getPayoutMethodDisplayName(method: any): string {
  switch (method.method_type) {
    case 'payoneer':
      return `Payoneer (${method.payoneer_email || 'Not set'})`;
    case 'mobile_money':
      return `${method.mobile_network === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'} (${method.mobile_number || 'Not set'})`;
    case 'usdt':
      return `USDT ${method.usdt_network?.toUpperCase() || 'TRC20'} (${method.usdt_address?.slice(0, 8)}...)`;
    case 'btc':
      return `Bitcoin (${method.btc_address?.slice(0, 8)}...)`;
    case 'eth':
      return `Ethereum (${method.eth_address?.slice(0, 8)}...)`;
    case 'bank_transfer':
      return 'Bank Transfer';
    default:
      return method.method_type;
  }
}

router.post('/payout-methods', [
  authMiddleware,
  body('method_type').isIn(PAYOUT_METHODS).withMessage('Invalid payout method'),
  body('currency').optional().isString()
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { 
      method_type, currency, is_default,
      payoneer_email,
      mobile_network, mobile_number, mobile_country,
      usdt_network, usdt_address,
      btc_address, btc_network,
      eth_address, eth_network
    } = req.body;

    const validationErrors: string[] = [];
    switch (method_type) {
      case 'payoneer':
        if (!payoneer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payoneer_email)) {
          validationErrors.push('Valid Payoneer email is required');
        }
        break;
      case 'mobile_money':
        if (!mobile_network || !mobile_number || !mobile_country) {
          validationErrors.push('Mobile network (mtn_momo/orange_money), number, and country are required');
        }
        if (!['mtn_momo', 'orange_money'].includes(mobile_network)) {
          validationErrors.push('Mobile network must be mtn_momo or orange_money');
        }
        if (mobile_number && !/^\+?[\d\s-]{8,15}$/.test(mobile_number)) {
          validationErrors.push('Invalid mobile number format');
        }
        if (mobile_country && !['CM', 'CI', 'SN', 'GH', 'ML'].includes(mobile_country)) {
          validationErrors.push('Country must be one of: CM, CI, SN, GH, ML');
        }
        break;
      case 'usdt':
        if (!usdt_network || !usdt_address) {
          validationErrors.push('USDT network (trc20 required) and wallet address are required');
        }
        if (usdt_network && usdt_network !== 'trc20') {
          validationErrors.push('TRC20 network is required for USDT');
        }
        if (usdt_address && (usdt_address.length < 30 || !usdt_address.startsWith('T'))) {
          validationErrors.push('Invalid TRC20 USDT wallet address (must start with T)');
        }
        break;
      case 'btc':
        if (!btc_address) {
          validationErrors.push('Bitcoin wallet address is required');
        }
        if (btc_address && btc_address.length < 26) {
          validationErrors.push('Invalid Bitcoin wallet address');
        }
        break;
      case 'eth':
        if (!eth_address) {
          validationErrors.push('Ethereum wallet address is required');
        }
        if (eth_address && (!eth_address.startsWith('0x') || eth_address.length !== 42)) {
          validationErrors.push('Invalid Ethereum wallet address (must start with 0x)');
        }
        break;
      case 'bank_transfer':
        break;
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    if (is_default) {
      await prisma.payoutMethod.updateMany({
        where: { user_id: req.user!.id },
        data: { is_default: false }
      });
    }

    const method = await prisma.payoutMethod.create({
      data: {
        user_id: req.user!.id,
        method_type,
        currency: currency || (method_type === 'usdt' ? 'USDT' : method_type === 'btc' ? 'BTC' : method_type === 'eth' ? 'ETH' : method_type === 'mobile_money' ? 'XAF' : 'USD'),
        is_default: is_default || false,
        payoneer_email,
        mobile_network,
        mobile_number,
        mobile_country,
        usdt_network: usdt_network || 'trc20',
        usdt_address,
        btc_address,
        btc_network: btc_network || 'mainnet',
        eth_address,
        eth_network: eth_network || 'mainnet'
      }
    });

    res.json({
      message: 'Payout method added successfully',
      payout_method: {
        id: method.id,
        method_type: method.method_type,
        is_default: method.is_default,
        currency: method.currency,
        is_verified: method.is_verified
      }
    });
  } catch (error) {
    console.error('Add payout method error:', error);
    res.status(500).json({ error: 'Failed to add payout method' });
  }
});

router.delete('/payout-methods/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const method = await prisma.payoutMethod.findFirst({
      where: { id, user_id: req.user!.id }
    });

    if (!method) {
      return res.status(404).json({ error: 'Payout method not found' });
    }

    await prisma.payoutMethod.delete({ where: { id } });
    
    res.json({ message: 'Payout method deleted' });
  } catch (error) {
    console.error('Delete payout method error:', error);
    res.status(500).json({ error: 'Failed to delete payout method' });
  }
});

router.post('/withdraw', [
  authMiddleware,
  body('amount').isFloat({ min: 10 }).withMessage('Minimum withdrawal is $10'),
  body('payout_method_id').optional().isInt()
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { amount, payout_method_id } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { withdrawable_balance: true, balance: true }
    });

    if (!user || user.withdrawable_balance < amount) {
      return res.status(400).json({ 
        error: 'Insufficient withdrawable balance',
        withdrawable_balance: user?.withdrawable_balance || 0
      });
    }

    let payoutMethod = null;
    if (payout_method_id) {
      payoutMethod = await prisma.payoutMethod.findFirst({
        where: { id: payout_method_id, user_id: req.user!.id }
      });
    } else {
      payoutMethod = await prisma.payoutMethod.findFirst({
        where: { user_id: req.user!.id, is_default: true }
      });
    }

    if (!payoutMethod) {
      return res.status(400).json({ 
        error: 'No payout method configured',
        message: 'Please add a payout method before requesting withdrawal'
      });
    }

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        user_id: req.user!.id,
        amount,
        payment_method: payoutMethod.method_type,
        payment_details: JSON.stringify({
          method_id: payoutMethod.id,
          method_type: payoutMethod.method_type,
          currency: payoutMethod.currency
        }),
        status: 'pending'
      }
    });

    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        withdrawable_balance: { decrement: amount }
      }
    });

    await logPaymentAction(
      req.user!.id,
      'withdrawal_requested',
      withdrawal.id,
      { amount, method: payoutMethod.method_type, currency: payoutMethod.currency },
      req
    );

    res.json({
      message: 'Withdrawal request submitted successfully',
      withdrawal: {
        id: withdrawal.id,
        amount,
        status: 'pending',
        payment_method: payoutMethod.method_type,
        estimated_processing: '1-3 business days'
      }
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal request' });
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
      withdrawals: withdrawals || [],
      withdrawable_balance: user?.withdrawable_balance != null ? Number(user.withdrawable_balance) : 0,
      total_balance: user?.balance != null ? Number(user.balance) : 0
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.json({ withdrawals: [], withdrawable_balance: 0, total_balance: 0, error: 'Failed to get withdrawals' });
  }
});

router.get('/balance', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const pendingCommissions = await prisma.commission.aggregate({
      where: { user_id: req.user!.id, status: 'pending' },
      _sum: { amount: true }
    });

    const paidByNetwork = await prisma.commission.aggregate({
      where: { user_id: req.user!.id, status: 'paid_by_network' },
      _sum: { amount: true }
    });

    const totalEarnings = await prisma.commission.aggregate({
      where: { user_id: req.user!.id },
      _sum: { amount: true }
    });

    res.json({
      total_earnings: totalEarnings._sum.amount ? Number(totalEarnings._sum.amount) : 0,
      pending_commissions: pendingCommissions._sum.amount ? Number(pendingCommissions._sum.amount) : 0,
      paid_by_network: paidByNetwork._sum.amount ? Number(paidByNetwork._sum.amount) : 0,
      payout_method: 'AFFILIATE_NETWORK',
      payout_message: 'Earnings are paid directly by affiliate networks.',
      withdrawal_enabled: false
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

router.post('/payout', [
  authMiddleware,
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be positive'),
  body('currency').isIn(SUPPORTED_CURRENCIES).withMessage('Invalid currency'),
  body('payout_method_id').isInt().withMessage('Payout method ID required')
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { amount, currency, payout_method_id, notes } = req.body;

    const result = await createPayout({
      userId: req.user!.id,
      payoutMethodId: payout_method_id,
      amount: Number(amount),
      currency: currency as SupportedCurrency,
      notes
    });

    if (!result.success) {
      return res.status(400).json({ 
        error: result.error,
        fraud_score: result.fraudScore
      });
    }

    await logPaymentAction(
      req.user!.id,
      'payout_requested',
      result.payoutId!,
      { amount, currency, payout_method_id, requires_approval: result.requiresApproval },
      req
    );

    res.json({
      message: result.requiresApproval 
        ? 'Payout request submitted and pending admin approval'
        : 'Payout request submitted and approved automatically',
      payout_id: result.payoutId,
      requires_approval: result.requiresApproval,
      status: result.requiresApproval ? 'pending' : 'approved',
      estimated_processing: result.requiresApproval ? '24-48 hours' : '1-3 business days'
    });
  } catch (error: any) {
    console.error('Payout error:', error);
    res.status(500).json({ error: 'Failed to process payout request' });
  }
});

router.get('/payouts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status, limit, offset } = req.query;
    
    const payouts = await getPayoutHistory(req.user!.id, {
      status: status as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    });

    const stats = await getPayoutStats(req.user!.id);

    res.json({
      payouts,
      stats
    });
  } catch (error) {
    console.error('Get payouts error:', error);
    res.status(500).json({ error: 'Failed to get payouts' });
  }
});

router.get('/payouts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const payout = await prisma.payout.findFirst({
      where: { id, user_id: req.user!.id },
      include: {
        payout_method: {
          select: { method_type: true, mobile_network: true, payoneer_email: true, usdt_network: true }
        }
      }
    });

    if (!payout) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    res.json({
      payout: {
        id: payout.id,
        amount: Number(payout.amount),
        currency: payout.currency,
        amount_in_usd: payout.amount_in_usd ? Number(payout.amount_in_usd) : null,
        provider: payout.provider,
        provider_ref: payout.provider_ref,
        provider_fee: payout.provider_fee ? Number(payout.provider_fee) : null,
        status: payout.status,
        fraud_score: payout.fraud_score,
        created_at: payout.created_at,
        approved_at: payout.approved_at,
        processed_at: payout.processed_at,
        completed_at: payout.completed_at,
        failed_at: payout.failed_at,
        failure_reason: payout.failure_reason,
        method: payout.payout_method
      }
    });
  } catch (error) {
    console.error('Get payout error:', error);
    res.status(500).json({ error: 'Failed to get payout' });
  }
});

router.post('/payout-methods/:id/verify', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const method = await prisma.payoutMethod.findFirst({
      where: { id, user_id: req.user!.id }
    });

    if (!method) {
      return res.status(404).json({ error: 'Payout method not found' });
    }

    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    await prisma.payoutMethod.update({
      where: { id },
      data: { 
        verification_code: verificationCode,
        is_verified: true,
        verified_at: new Date()
      }
    });

    res.json({
      message: 'Payout method verified successfully',
      is_verified: true
    });
  } catch (error) {
    console.error('Verify payout method error:', error);
    res.status(500).json({ error: 'Failed to verify payout method' });
  }
});

export default router;
