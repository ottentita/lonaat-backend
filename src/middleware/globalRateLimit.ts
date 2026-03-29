/**
 * GLOBAL RATE LIMITING MIDDLEWARE
 * Protects all API endpoints from abuse
 */

import rateLimit from 'express-rate-limit';

/**
 * Global rate limiting for all API endpoints
 * - 100 requests per minute per IP
 * - Protects against general API abuse
 */
export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    retryAfter: 60
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use IP address for rate limiting
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  skip: (req) => {
    // Skip rate limiting for health checks and static assets
    const skipPaths = ['/health', '/robots.txt', '/sitemap.xml'];
    return skipPaths.some(path => req.path?.startsWith(path));
  }
});

/**
 * Stricter rate limiting for sensitive endpoints
 * - 20 requests per minute per IP
 * - Used for search, SEO, and expensive operations
 */
export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: {
    success: false,
    error: 'Rate limit exceeded for this endpoint',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

/**
 * Very strict rate limiting for admin endpoints
 * - 10 requests per minute per authenticated user
 * - Additional protection for admin operations
 */
export const adminRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    success: false,
    error: 'Admin rate limit exceeded',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // For admin endpoints, use user ID if available, otherwise IP
    const user = (req as any).user;
    return user?.id ? `user-${user.id}` : (req.ip || 'unknown');
  },
  skip: (req) => {
    // Don't skip admin endpoints - always rate limit
    return false;
  }
});

/**
 * API endpoint specific rate limiting
 * - Different limits for different endpoint types
 */
export const apiRateLimits = {
  // Products API - moderate usage
  products: rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    message: { success: false, error: 'Products API rate limit exceeded' }
  }),

  // Search API - stricter due to computational cost
  search: rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { success: false, error: 'Search API rate limit exceeded' }
  }),

  // SEO API - moderate usage
  seo: rateLimit({
    windowMs: 60 * 1000,
    max: 40,
    message: { success: false, error: 'SEO API rate limit exceeded' }
  }),

  // Tracking API - high usage allowed but with some limits
  tracking: rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    message: { success: false, error: 'Tracking API rate limit exceeded' }
  }),

  // Analytics API - strict due to computational cost
  analytics: rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { success: false, error: 'Analytics API rate limit exceeded' }
  })
};

/**
 * Create custom rate limit for specific needs
 */
export const createRateLimit = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs || 60 * 1000,
    max: options.max || 100,
    message: {
      success: false,
      error: options.message || 'Rate limit exceeded'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress || 'unknown';
    }
  });
};

/**
 * Rate limiting middleware factory for different endpoint types
 */
export const getRateLimitForEndpoint = (endpointType: keyof typeof apiRateLimits) => {
  return apiRateLimits[endpointType] || globalRateLimit;
};
