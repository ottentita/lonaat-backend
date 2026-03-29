/**
 * WALLET ROUTES - PRODUCTION REFACTORED
 * 
 * CHANGES FROM OLD VERSION:
 * ✅ Removed ALL raw SQL queries
 * ✅ Uses new Transaction model
 * ✅ Uses financialCore service
 * ✅ Complete transaction logging
 * ✅ Standardized responses
 * ✅ Security validations
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import financialCore from '../services/financialCore.service';

const router = Router();

// ==================== WALLET ENDPOINTS ====================

/**
 * GET /api/wallet - Get wallet overview with calculated balance
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    
    const walletData = await financialCore.getWalletWithBalance(userId);
    const { wallet, calculatedBalance, balanceMatch } = walletData;

    return res.json({
      success: true,
      data: {
        wallet: {
          id: wallet.id,
          userId: wallet.userId,
          balance: wallet.balance,
          createdAt: wallet.createdAt
        },
        calculatedBalance: {
          balance: calculatedBalance.balance,
          totalCredits: calculatedBalance.totalCredits,
          totalDebits: calculatedBalance.totalDebits,
          transactionCount: calculatedBalance.transactionCount
        },
        balanceMatch,
        currency: 'XAF'
      }
    });
  } catch (error: any) {
    console.error('❌ Wallet error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get wallet',
      message: error.message
    });
  }
});

/**
 * GET /api/wallet/summary - Wallet summary (alias)
 */
router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    
    const { balance, totalCredits, totalDebits } = await financialCore.calculateBalance(userId);

    return res.json({
      success: true,
      data: {
        balance,
        totalEarned: totalCredits,
        totalWithdrawn: totalDebits,
        currency: 'XAF'
      }
    });
  } catch (error: any) {
    console.error('❌ Wallet summary error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get wallet summary',
      message: error.message
    });
  }
});

/**
 * GET /api/wallet/balance - Balance breakdown
 */
router.get('/balance', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    
    const { balance, totalCredits, totalDebits } = await financialCore.calculateBalance(userId);
    const withdrawable = Math.max(0, balance);

    return res.json({
      success: true,
      data: {
        total_earnings: totalCredits,
        balance: balance,
        total_withdrawn: totalDebits,
        withdrawable_balance: withdrawable,
        currency: 'XAF'
      }
    });
  } catch (error: any) {
    console.error('❌ Balance error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get balance',
      message: error.message
    });
  }
});

/**
 * GET /api/wallet/transactions - Transaction history
 */
router.get('/transactions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const type = req.query.type as any;
    const source = req.query.source as any;

    const result = await financialCore.getTransactions(userId, limit, offset, type, source);

    return res.json({
      success: true,
      data: {
        transactions: result.transactions,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          pages: result.pages
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Get transactions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get transactions',
      message: error.message
    });
  }
});

/**
 * POST /api/wallet/withdraw - Request withdrawal
 */
router.post('/withdraw', [
  authMiddleware,
  body('amount').isFloat({ min: 10, max: 10000 }).withMessage('Amount must be between 10 and 10,000'),
  body('method').isString().withMessage('Withdrawal method required'),
  body('accountDetails').isObject().withMessage('Account details required'),
  body('idempotencyKey').optional().isString().withMessage('Idempotency key must be a string')
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const userId = Number(req.user!.id);
    const { amount, method, accountDetails, idempotencyKey } = req.body;

    // GUARD 1: Validate withdrawal
    const { balance } = await financialCore.calculateBalance(userId);
    financialCore.validateWithdrawal(amount, balance);

    // GUARD 2: Prevent double withdrawal
    await financialCore.preventDoubleWithdrawal(userId, amount);

    // GUARD 3: Check idempotency (if key provided)
    if (idempotencyKey) {
      const existing = await financialCore.checkIdempotency(idempotencyKey);
      if (existing) {
        return res.json({
          success: true,
          data: {
            message: 'Withdrawal already processed',
            withdrawal: {
              id: existing.id,
              amount: existing.amount,
              status: 'already_processed',
              createdAt: existing.createdAt
            }
          }
        });
      }
    }

    // Create withdrawal transaction with idempotency key
    const transaction = await financialCore.createTransaction({
      userId,
      amount,
      type: 'debit',
      source: 'withdrawal',
      idempotencyKey: idempotencyKey || `withdrawal-${userId}-${Date.now()}`
    });

    console.log(`✅ Withdrawal processed: ${amount} for user ${userId}`);

    return res.json({
      success: true,
      data: {
        message: 'Withdrawal request submitted successfully',
        withdrawal: {
          id: transaction.id,
          amount,
          method,
          status: 'pending',
          estimated_processing: '1-3 business days',
          createdAt: transaction.createdAt
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Withdrawal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process withdrawal request',
      message: error.message
    });
  }
});

/**
 * POST /api/wallet/deposit - Add funds (admin/testing)
 */
router.post('/deposit', [
  authMiddleware,
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
  body('source').optional().isString(),
  body('idempotencyKey').optional().isString().withMessage('Idempotency key must be a string')
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const userId = Number(req.user!.id);
    const { amount, source, idempotencyKey } = req.body;

    // GUARD: Check idempotency (if key provided)
    if (idempotencyKey) {
      const existing = await financialCore.checkIdempotency(idempotencyKey);
      if (existing) {
        return res.json({
          success: true,
          data: {
            message: 'Deposit already processed',
            transaction: {
              id: existing.id,
              amount: existing.amount,
              type: existing.type,
              source: existing.source,
              createdAt: existing.createdAt
            }
          }
        });
      }
    }

    const transaction = await financialCore.createTransaction({
      userId,
      amount,
      type: 'credit',
      source: source || 'deposit',
      idempotencyKey: idempotencyKey || `deposit-${userId}-${Date.now()}`
    });

    console.log(`✅ Deposit processed: ${amount} for user ${userId}`);

    return res.json({
      success: true,
      data: {
        message: 'Deposit successful',
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          type: transaction.type,
          source: transaction.source,
          createdAt: transaction.createdAt
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Deposit error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process deposit',
      message: error.message
    });
  }
});

/**
 * POST /api/wallet/sync - Sync wallet balance with transactions
 */
router.post('/sync', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    
    const newBalance = await financialCore.syncWalletBalance(userId);

    return res.json({
      success: true,
      data: {
        message: 'Wallet balance synced',
        balance: newBalance
      }
    });
  } catch (error: any) {
    console.error('❌ Sync error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to sync wallet',
      message: error.message
    });
  }
});

export default router;
