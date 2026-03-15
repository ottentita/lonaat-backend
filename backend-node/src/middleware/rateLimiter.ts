import rateLimit from 'express-rate-limit'

const isTest = process.env.NODE_ENV === 'test'

// Global limiter (applied to all routes). In test mode max is very high so
// automated test runs are not affected by rate limiting.
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP.' },
})

// limit raw click attempts to prevent abuse of ad engine
export const clickLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many click attempts. Please slow down.' },
})

// rate limiter used for AI endpoints
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests, please slow down' },
})

// backward-compatible export (some files import `aiRateLimiter`)
export const aiRateLimiter = aiLimiter

// limiter for affiliate/webhook endpoints
export const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many webhook requests, please try again later' }
});

export default aiLimiter
