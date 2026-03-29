/**
 * Rate Limiter for Token Operations (Money-Related)
 * Prevents spam and abuse in financial operations
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Rate limiting configuration for money operations
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
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return `token-rate-${user?.id || 'anonymous'}`;
  },
  // Custom handler for better logging
  handler: (req: Request, res: Response) => {
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

// Apply rate limiting to all token routes
router.use('/balance', tokenRateLimiter);
router.use('/buy', tokenRateLimiter);
router.use('/transactions', tokenRateLimiter);

export default router;
