import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

const router = Router();

// Token pricing configuration
const TOKEN_PRICE = 10; // 10 XAF per token
const MIN_TOKENS_BUY = 1;
const MAX_TOKENS_BUY = 10000;

// Rate limiting for money operations (CRITICAL for financial endpoints)
const tokenRateLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 10, // 10 requests per 10 seconds per user
  message: {
    success: false,
    error: 'Too many requests',
    details: 'Rate limit exceeded. Please try again in a few seconds.',
    retryAfter: 10
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Key by user ID for per-user limiting
  keyGenerator: (req) => {
    const user = (req as any).user;
    return `token-rate-${user?.id || 'anonymous'}`;
  },
  // Custom handler for better logging
  handler: (req, res) => {
    const user = (req as any).user;
    console.warn('🚨 Rate limit exceeded for token operations:', {
      userId: user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      details: 'Rate limit exceeded. Please try again in a few seconds.',
      retryAfter: 10
    });
  }
});

// ==================== TOKEN ENDPOINTS ====================

/**
 * POST /api/tokens/buy - Buy tokens with wallet balance
 */
router.post('/buy', [
  authMiddleware,
  tokenRateLimiter,  // Apply rate limiting to token purchases
  body('tokens').isInt({ min: MIN_TOKENS_BUY, max: MAX_TOKENS_BUY }).withMessage(`Tokens must be between ${MIN_TOKENS_BUY} and ${MAX_TOKENS_BUY}`),
  body('idempotencyKey').optional().isString().withMessage('Idempotency key must be a string')
], async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const { tokens } = req.body;
    const totalCost = tokens * TOKEN_PRICE;
    const idempotencyKey = req.body.idempotencyKey || `token_buy_${userId}_${Date.now()}`;

    console.log('🪙 TOKEN PURCHASE REQUEST:', {
      userId,
      tokens,
      totalCost,
      idempotencyKey
    });

    // Check for duplicate purchase
    const existingTransaction = await prisma.transaction.findFirst({
      where: { idempotencyKey }
    });

    if (existingTransaction) {
      console.log('⚠️ DUPLICATE TOKEN PURCHASE DETECTED:', idempotencyKey);
      return res.status(409).json({
        success: false,
        error: 'Duplicate purchase request detected',
        transactionId: existingTransaction.id
      });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (wallet.balance < totalCost) {
      console.log('❌ INSUFFICIENT BALANCE:', {
        userId,
        required: totalCost,
        available: wallet.balance,
        shortfall: totalCost - wallet.balance
      });
      
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient balance',
        details: {
          required: totalCost,
          available: wallet.balance,
          shortfall: totalCost - wallet.balance
        }
      });
    }

    // Process token purchase atomically
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from wallet
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            decrement: totalCost
          },
          tokens: {
            increment: tokens
          },
          totalTokensBought: {
            increment: tokens
          }
        }
      });

      // Create transaction log (new transaction model)
      const transaction = await tx.transaction.create({
        data: {
          userId,
          amount: totalCost,
          type: 'debit',
          source: 'token_purchase',
          status: 'completed',
          description: `Purchased ${tokens} tokens`,
          idempotencyKey
        }
      });

      // Create token transaction
      const tokenTransaction = await tx.tokenTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'buy',
          tokens: tokens,
          amount: totalCost
        }
      });

      console.log('✅ TOKEN PURCHASE COMPLETED:', {
        userId,
        tokens,
        totalCost,
        newBalance: updatedWallet.balance,
        newTokens: updatedWallet.tokens,
        transactionId: transaction.id,
        tokenTransactionId: tokenTransaction.id
      });

      return {
        wallet: updatedWallet,
        transaction,
        tokenTransaction
      };
    });

    // Get updated wallet
    const updatedWallet = await prisma.wallet.findUnique({
      where: { id: wallet.id }
    });

    console.log('✅ Tokens purchased:', {
      userId,
      tokens,
      totalCost,
      newBalance: updatedWallet?.balance,
      newTokens: updatedWallet?.tokens
    });

    res.json({
      success: true,
      message: 'Tokens purchased successfully',
      purchase: {
        tokens: tokens,
        totalCost: totalCost,
        tokenPrice: TOKEN_PRICE
      },
      wallet: {
        balance: updatedWallet!.balance,
        tokens: updatedWallet!.tokens
      }
    });

  } catch (error: any) {
    console.error('❌ Buy tokens error:', error);
    res.status(500).json({ 
      error: 'Failed to purchase tokens',
      details: error.message 
    });
  }
});

/**
 * POST /api/tokens/spend - Spend tokens for AI generation or promotion
 */
router.post('/spend', [
  authMiddleware,
  body('tokens').isInt({ min: 1 }).withMessage('Tokens must be at least 1'),
  body('purpose').isIn(['ai_generation', 'promotion']).withMessage('Purpose must be ai_generation or promotion'),
  body('reference').optional().isString()
], async (req: AuthRequest, res: Response) => {
  console.log('🪙 SPEND TOKENS REQUEST');
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tokens, purpose, reference } = req.body;

    // Get user wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: String(userId) }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (wallet.tokens < tokens) {
      return res.status(400).json({ 
        error: 'Insufficient tokens',
        required: tokens,
        available: wallet.tokens
      });
    }

    await prisma.$transaction(async (tx) => {
      // Deduct tokens from wallet
      await tx.wallet.update({
        where: { userId: String(userId) },
        data: {
          tokens: {
            decrement: tokens
          },
          totalTokensSpent: {
            increment: tokens
          }
        }
      });

      // Create token transaction
      await tx.tokenTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'spend',
          tokens: -tokens,
          amount: 0, // No money value for spending
          description: `${purpose.replace('_', ' ')} - ${tokens} tokens`,
          reference: reference || null,
          status: 'completed',
          metadata: {
            purpose: purpose,
            previousTokens: wallet.tokens,
            newTokens: wallet.tokens - tokens
          }
        }
      });
    });

    // Get updated wallet
    const updatedWallet = await prisma.Wallet.findUnique({
      where: { id: wallet.id }
    });

    console.log('✅ Tokens spent:', {
      userId,
      tokens,
      purpose,
      newTokens: updatedWallet?.tokens
    });

    res.json({
      success: true,
      message: 'Tokens spent successfully',
      spend: {
        tokens: tokens,
        purpose: purpose
      },
      wallet: {
        balance: updatedWallet!.balance,
        tokens: updatedWallet!.tokens
      }
    });

  } catch (error: any) {
    console.error('❌ Spend tokens error:', error);
    res.status(500).json({ 
      error: 'Failed to spend tokens',
      details: error.message 
    });
  }
});

/**
 * GET /api/tokens/balance - Get token balance and pricing
 */
router.get('/balance', [
  tokenRateLimiter,  // Apply rate limiting to balance queries
  authMiddleware
], async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Use wallets model (actual model in schema)
    const wallet = await prisma.wallet.findUnique({
      where: { userId: String(userId) }
    });

    return res.status(200).json({
      success: true,
      tokens: wallet?.tokens || 0,
      totalTokensBought: wallet?.totalTokensBought || 0,
      totalTokensSpent: wallet?.totalTokensSpent || 0,
      walletBalance: wallet?.balance || 0,
      currency: wallet?.currency || 'XAF',
      pricing: {
        tokenPrice: TOKEN_PRICE,
        minTokens: MIN_TOKENS_BUY,
        maxTokens: MAX_TOKENS_BUY
      }
    });
  } catch (error: any) {
    console.error('❌ Token balance error:', error);
    console.warn('⚠️ Returning safe fallback data due to error');
    
    // Return 200 with safe defaults - never crash the frontend
    // Add explicit error signaling for monitoring
    return res.status(200)
      .set('x-fallback', 'true')
      .set('x-fallback-reason', 'database-error')
      .json({ 
        success: false, 
        tokens: 0,
        totalTokensBought: 0,
        totalTokensSpent: 0,
        walletBalance: 0,
        currency: 'XAF',
        pricing: {
          tokenPrice: TOKEN_PRICE,
          minTokens: MIN_TOKENS_BUY,
          maxTokens: MAX_TOKENS_BUY
        },
        error: 'Failed to fetch token balance',
        details: error.message,
        timestamp: new Date().toISOString()
      });
  }
});

/**
 * GET /api/tokens/transactions - Get token transaction history
 */
router.get('/transactions', authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('🪙 GET TOKEN TRANSACTIONS REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit = 50, offset = 0, type } = req.query;

    const where: any = { userId };
    if (type) where.type = type;

    const [transactions, total] = await Promise.all([
      prisma.TokenTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      }),
      prisma.TokenTransaction.count({ where })
    ]);

    console.log('✅ Token transactions retrieved:', transactions.length);

    res.json({
      success: true,
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        tokens: t.tokens,
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
    console.error('❌ Get token transactions error:', error);
    res.status(500).json({ 
      error: 'Failed to get token transactions',
      details: error.message 
    });
  }
});

/**
 * GET /api/tokens/stats - Get token usage statistics
 */
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('🪙 GET TOKEN STATS REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: String(userId) },
      select: {
        tokens: true,
        totalTokensBought: true,
        totalTokensSpent: true
      }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Get recent token transactions
    const [buyTransactions, spendTransactions] = await Promise.all([
      prisma.tokenTransaction.count({
        where: {
          userId,
          type: 'buy',
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      prisma.tokenTransaction.count({
        where: {
          userId,
          type: 'spend',
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
    ]);

    console.log('✅ Token stats retrieved:', wallet.id);

    res.json({
      success: true,
      stats: {
        currentTokens: wallet.tokens,
        totalTokensBought: wallet.totalTokensBought,
        totalTokensSpent: wallet.totalTokensSpent,
        tokensRemaining: wallet.tokens,
        last30Days: {
          purchases: buyTransactions,
          usage: spendTransactions
        },
        pricing: {
          tokenPrice: TOKEN_PRICE,
          valueOfTokens: wallet.tokens * TOKEN_PRICE
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Get token stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get token stats',
      details: error.message 
    });
  }
});

export default router;
