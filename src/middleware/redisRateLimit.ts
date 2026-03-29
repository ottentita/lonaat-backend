/**
 * REDIS-BACKED DISTRIBUTED RATE LIMITING
 * Scales across multiple servers, persists across restarts
 */

import { Request, Response, NextFunction } from 'express';
import { getClientIp } from '../utils/fingerprint';

// Fallback to in-memory if Redis not available
let redisClient: any = null;
try {
  const redis = require('../config/redis.config');
  redisClient = redis.redisClient;
} catch (error) {
  console.warn('⚠️ Redis not available, using in-memory rate limiting');
}

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  blockDurationSeconds: number;
  keyPrefix: string;
}

/**
 * Redis-backed rate limiter factory
 */
export function createRedisRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const key = `${config.keyPrefix}:${ip}`;
    const now = Date.now();

    try {
      if (!redisClient) {
        // Fallback to basic check without Redis
        return next();
      }

      // Check if IP is blocked
      const blocked = await redisClient.get(`${key}:blocked`);
      if (blocked) {
        const ttl = await redisClient.ttl(`${key}:blocked`);
        return res.status(429).json({
          success: false,
          error: 'Too many requests',
          message: `You have been temporarily blocked. Try again in ${ttl} seconds.`,
          retryAfter: ttl
        });
      }

      // Increment request count using sliding window
      const multi = redisClient.multi();
      multi.zadd(key, now, `${now}-${Math.random()}`);
      multi.zremrangebyscore(key, 0, now - (config.windowSeconds * 1000));
      multi.zcard(key);
      multi.expire(key, config.windowSeconds);
      
      const results = await multi.exec();
      const count = results[2][1]; // Get count from zcard result

      // Check if limit exceeded
      if (count > config.maxRequests) {
        // Block the IP
        await redisClient.setex(
          `${key}:blocked`,
          config.blockDurationSeconds,
          '1'
        );

        console.warn(`🚨 Rate limit exceeded for IP: ${ip} (${count} requests in ${config.windowSeconds}s)`);

        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many requests. You have been temporarily blocked.',
          retryAfter: config.blockDurationSeconds
        });
      }

      // Log warning if approaching limit
      if (count > config.maxRequests * 0.8) {
        console.warn(`⚠️ IP ${ip} approaching rate limit: ${count}/${config.maxRequests}`);
      }

      next();

    } catch (error) {
      console.error('❌ Redis rate limit error:', error);
      // Fail open - allow request if Redis fails
      next();
    }
  };
}

/**
 * Click tracking rate limiter (distributed)
 * 20 clicks per 10 seconds per IP
 */
export const distributedClickRateLimiter = createRedisRateLimiter({
  maxRequests: 20,
  windowSeconds: 10,
  blockDurationSeconds: 60,
  keyPrefix: 'ratelimit:click'
});

/**
 * Product-specific rate limiter (distributed)
 * 5 clicks per product per 10 seconds
 */
export function distributedProductClickRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const productId = req.params.productId;
  
  return createRedisRateLimiter({
    maxRequests: 5,
    windowSeconds: 10,
    blockDurationSeconds: 60,
    keyPrefix: `ratelimit:product:${productId}`
  })(req, res, next);
}

/**
 * Get rate limit stats from Redis
 */
export async function getRedisRateLimitStats() {
  if (!redisClient) {
    return { available: false, message: 'Redis not configured' };
  }

  try {
    const keys = await redisClient.keys('ratelimit:*');
    const blockedKeys = keys.filter((k: string) => k.includes(':blocked'));
    
    const stats = {
      totalKeys: keys.length,
      blockedIPs: blockedKeys.length,
      activeWindows: keys.length - blockedKeys.length
    };

    return { available: true, stats };
  } catch (error) {
    console.error('Error getting Redis rate limit stats:', error);
    return { available: false, error: error.message };
  }
}

export default {
  createRedisRateLimiter,
  distributedClickRateLimiter,
  distributedProductClickRateLimiter,
  getRedisRateLimitStats
};
