/**
 * CLICK RATE LIMITING MIDDLEWARE
 * Prevents click inflation and bot attacks on tracking endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { getClientIp } from '../utils/fingerprint';

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  blocked: boolean;
  blockExpiry?: number;
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_CONFIG = {
  maxClicks: 20,              // Max clicks per window
  windowMs: 10 * 1000,        // 10 seconds window
  blockDurationMs: 60 * 1000, // 1 minute block for violators
  cleanupIntervalMs: 5 * 60 * 1000 // Cleanup every 5 minutes
};

/**
 * Click rate limiter middleware
 * Limits: 20 clicks per 10 seconds per IP
 */
export function clickRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const now = Date.now();
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(ip);
  
  if (!entry) {
    entry = {
      count: 1,
      firstRequest: now,
      blocked: false
    };
    rateLimitStore.set(ip, entry);
    return next();
  }

  // Check if IP is currently blocked
  if (entry.blocked && entry.blockExpiry) {
    if (now < entry.blockExpiry) {
      const remainingSeconds = Math.ceil((entry.blockExpiry - now) / 1000);
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: `You have been temporarily blocked for suspicious activity. Try again in ${remainingSeconds} seconds.`,
        retryAfter: remainingSeconds
      });
    } else {
      // Block expired, reset
      entry.blocked = false;
      entry.blockExpiry = undefined;
      entry.count = 1;
      entry.firstRequest = now;
      return next();
    }
  }

  // Check if window has expired
  const windowExpired = now - entry.firstRequest > RATE_LIMIT_CONFIG.windowMs;
  
  if (windowExpired) {
    // Reset window
    entry.count = 1;
    entry.firstRequest = now;
    return next();
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > RATE_LIMIT_CONFIG.maxClicks) {
    // Block the IP
    entry.blocked = true;
    entry.blockExpiry = now + RATE_LIMIT_CONFIG.blockDurationMs;
    
    console.warn(`🚨 Rate limit exceeded for IP: ${ip} (${entry.count} clicks in ${RATE_LIMIT_CONFIG.windowMs}ms)`);
    
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many click requests. You have been temporarily blocked.',
      retryAfter: Math.ceil(RATE_LIMIT_CONFIG.blockDurationMs / 1000)
    });
  }

  // Log warning if approaching limit
  if (entry.count > RATE_LIMIT_CONFIG.maxClicks * 0.8) {
    console.warn(`⚠️ IP ${ip} approaching rate limit: ${entry.count}/${RATE_LIMIT_CONFIG.maxClicks}`);
  }

  next();
}

/**
 * Product-specific rate limiter
 * Prevents spam clicks on same product
 */
export function productClickRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const productId = req.params.productId;
  const key = `${ip}:${productId}`;
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  if (!entry) {
    entry = {
      count: 1,
      firstRequest: now,
      blocked: false
    };
    rateLimitStore.set(key, entry);
    return next();
  }

  // Check if blocked
  if (entry.blocked && entry.blockExpiry && now < entry.blockExpiry) {
    return res.status(429).json({
      success: false,
      error: 'Too many clicks on this product',
      message: 'Please wait before clicking this product again.'
    });
  }

  // Reset if window expired
  if (now - entry.firstRequest > RATE_LIMIT_CONFIG.windowMs) {
    entry.count = 1;
    entry.firstRequest = now;
    entry.blocked = false;
    return next();
  }

  // Increment
  entry.count++;

  // Block if exceeded (stricter limit for same product)
  if (entry.count > 5) { // Max 5 clicks per product per 10 seconds
    entry.blocked = true;
    entry.blockExpiry = now + RATE_LIMIT_CONFIG.blockDurationMs;
    
    console.warn(`🚨 Product click spam detected: IP ${ip}, Product ${productId}`);
    
    return res.status(429).json({
      success: false,
      error: 'Too many clicks on this product',
      message: 'Suspicious activity detected. Please wait before trying again.'
    });
  }

  next();
}

/**
 * Cleanup old entries periodically
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries older than 5 minutes
    if (now - entry.firstRequest > 5 * 60 * 1000) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} old rate limit entries`);
  }
}

// Start cleanup interval
setInterval(cleanupRateLimitStore, RATE_LIMIT_CONFIG.cleanupIntervalMs);

/**
 * Get rate limit stats for monitoring
 */
export function getRateLimitStats() {
  const now = Date.now();
  const stats = {
    totalEntries: rateLimitStore.size,
    blockedIPs: 0,
    activeWindows: 0,
    topOffenders: [] as Array<{ ip: string; count: number }>
  };

  const offenders: Array<{ ip: string; count: number }> = [];

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.blocked && entry.blockExpiry && now < entry.blockExpiry) {
      stats.blockedIPs++;
    }
    
    if (now - entry.firstRequest <= RATE_LIMIT_CONFIG.windowMs) {
      stats.activeWindows++;
      
      if (entry.count > 10) {
        offenders.push({ ip: key, count: entry.count });
      }
    }
  }

  // Sort by count and take top 10
  stats.topOffenders = offenders
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return stats;
}

export default {
  clickRateLimiter,
  productClickRateLimiter,
  getRateLimitStats
};
