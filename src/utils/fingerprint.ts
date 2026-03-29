/**
 * FINGERPRINT UTILITY - Strengthened Device/User Identification
 * Prevents click inflation and bot spoofing
 */

import crypto from 'crypto';

interface FingerprintData {
  ip: string;
  userAgent: string;
  acceptLanguage?: string;
  acceptEncoding?: string;
  userId?: number;
}

/**
 * Generate strong fingerprint combining multiple signals
 * This prevents simple spoofing and ensures unique click tracking
 */
export function generateFingerprint(data: FingerprintData): string {
  const {
    ip,
    userAgent,
    acceptLanguage = '',
    acceptEncoding = '',
    userId
  } = data;

  // Combine multiple signals for stronger fingerprint
  const fingerprintString = [
    ip,
    userAgent,
    acceptLanguage,
    acceptEncoding,
    userId || 'guest'
  ].join('|');

  // Generate SHA-256 hash
  return crypto
    .createHash('sha256')
    .update(fingerprintString)
    .digest('hex');
}

/**
 * Extract fingerprint data from Express request
 */
export function extractFingerprintData(req: any): FingerprintData {
  return {
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    acceptLanguage: req.headers['accept-language'],
    acceptEncoding: req.headers['accept-encoding'],
    userId: req.user?.id
  };
}

/**
 * Get real client IP (handles proxies and load balancers)
 */
export function getClientIp(req: any): string {
  // Check X-Forwarded-For header (proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // Take first IP if multiple
    const ips = forwarded.split(',');
    return ips[0].trim();
  }

  // Check X-Real-IP header
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }

  // Fallback to connection remote address
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

/**
 * Validate if request looks like a bot
 */
export function isLikelyBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /http/i,
    /axios/i,
    /postman/i
  ];

  return botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Validate request headers for suspicious activity
 */
export function validateHeaders(req: any): { valid: boolean; reason?: string } {
  const userAgent = req.headers['user-agent'];
  
  // Missing user agent is suspicious
  if (!userAgent) {
    return { valid: false, reason: 'Missing user-agent header' };
  }

  // Very short user agent is suspicious
  if (userAgent.length < 10) {
    return { valid: false, reason: 'Suspicious user-agent (too short)' };
  }

  // Check for bot patterns
  if (isLikelyBot(userAgent)) {
    return { valid: false, reason: 'Bot detected in user-agent' };
  }

  // Missing accept headers is suspicious
  if (!req.headers['accept']) {
    return { valid: false, reason: 'Missing accept header' };
  }

  return { valid: true };
}

/**
 * Generate session-based fingerprint (for cookie/session tracking)
 */
export function generateSessionFingerprint(sessionId: string, fingerprint: string): string {
  return crypto
    .createHash('sha256')
    .update(`${sessionId}:${fingerprint}`)
    .digest('hex');
}

export default {
  generateFingerprint,
  extractFingerprintData,
  getClientIp,
  isLikelyBot,
  validateHeaders,
  generateSessionFingerprint
};
