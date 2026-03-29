/**
 * AI RATE LIMITER
 * Simple in-memory rate limiting for AI routes
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * AI rate limiter middleware
 * PREMIUM: 30 requests/minute
 * ADMIN: unlimited
 */
export function aiRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  
  // No user = no rate limit (will be caught by auth middleware)
  if (!user) {
    next();
    return;
  }
  
  // ADMIN = unlimited
  if (user.role === 'ADMIN') {
    next();
    return;
  }
  
  // PREMIUM = 30 requests/minute
  const userId = user.id;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 30;
  
  const key = `ai:${userId}`;
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    next();
    return;
  }
  
  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    const resetIn = Math.ceil((entry.resetTime - now) / 1000);
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Too many AI requests. Try again in ${resetIn} seconds.`,
      limit: maxRequests,
      resetIn
    });
    return;
  }
  
  // Increment count
  entry.count++;
  next();
}
