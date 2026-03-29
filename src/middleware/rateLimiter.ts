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

// CRITICAL ENDPOINT RATE LIMITERS

// Click tracking limiter - 100 requests per minute per IP
export const clickTrackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 10000 : 100,
  message: { error: 'Too many click tracking requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Webhook limiter - 50 requests per minute per IP
export const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many webhook requests, please try again later' }
});

// Auth limiter - 10 requests per minute per IP (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 10000 : 10,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ROLE-BASED RATE LIMITERS (Production Security)

// Admin limiter - Higher limits for admin operations
export const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isTest ? 10000 : 200,
  message: { error: 'Too many admin requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// User limiter - Standard limits for regular users
export const userLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isTest ? 10000 : 50,
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Affiliate endpoint limiter - Sensitive operations
export const affiliateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isTest ? 10000 : 30,
  message: { error: 'Too many affiliate requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

export default aiLimiter
