/**
 * ANTI-BOT PROTECTION MIDDLEWARE
 * Validates requests and blocks suspicious bot activity
 */

import { Request, Response, NextFunction } from 'express';
import { validateHeaders, isLikelyBot } from '../utils/fingerprint';

interface BotDetectionResult {
  isBot: boolean;
  confidence: number;
  reasons: string[];
}

/**
 * Anti-bot middleware for click tracking endpoints
 */
export function antiBotProtection(req: Request, res: Response, next: NextFunction) {
  const detection = detectBot(req);

  if (detection.isBot && detection.confidence > 0.7) {
    console.warn(`🤖 Bot detected and blocked:`, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      reasons: detection.reasons,
      confidence: detection.confidence
    });

    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Automated access detected. Please use a web browser.'
    });
  }

  // Log suspicious activity but allow (for monitoring)
  if (detection.confidence > 0.5) {
    console.warn(`⚠️ Suspicious activity detected:`, {
      ip: req.ip,
      confidence: detection.confidence,
      reasons: detection.reasons
    });
  }

  next();
}

/**
 * Detect if request is from a bot
 */
function detectBot(req: Request): BotDetectionResult {
  const reasons: string[] = [];
  let confidence = 0;

  // Check 1: User-Agent validation
  const headerValidation = validateHeaders(req);
  if (!headerValidation.valid) {
    reasons.push(headerValidation.reason || 'Invalid headers');
    confidence += 0.3;
  }

  // Check 2: Known bot patterns in User-Agent
  const userAgent = req.headers['user-agent'] || '';
  if (isLikelyBot(userAgent)) {
    reasons.push('Bot pattern in user-agent');
    confidence += 0.4;
  }

  // Check 3: Missing common browser headers
  const browserHeaders = [
    'accept',
    'accept-language',
    'accept-encoding'
  ];

  const missingHeaders = browserHeaders.filter(h => !req.headers[h]);
  if (missingHeaders.length > 0) {
    reasons.push(`Missing browser headers: ${missingHeaders.join(', ')}`);
    confidence += 0.2 * missingHeaders.length;
  }

  // Check 4: Suspicious referrer
  const referer = req.headers['referer'] || req.headers['referrer'];
  if (!referer) {
    reasons.push('Missing referrer');
    confidence += 0.1;
  }

  // Check 5: No cookies (suspicious for repeat visitors)
  if (!req.headers['cookie']) {
    reasons.push('No cookies present');
    confidence += 0.05;
  }

  // Check 6: Suspicious accept header
  const accept = req.headers['accept'];
  if (accept && !accept.includes('text/html')) {
    reasons.push('Non-browser accept header');
    confidence += 0.2;
  }

  // Check 7: Missing DNT or other privacy headers (bots often don't set these)
  // This is a weak signal, so low weight
  if (!req.headers['dnt'] && !req.headers['sec-fetch-site']) {
    confidence += 0.05;
  }

  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);

  return {
    isBot: confidence > 0.7,
    confidence,
    reasons
  };
}

/**
 * Strict anti-bot protection (for sensitive endpoints)
 */
export function strictAntiBotProtection(req: Request, res: Response, next: NextFunction) {
  const detection = detectBot(req);

  // Stricter threshold
  if (detection.isBot || detection.confidence > 0.5) {
    console.warn(`🚫 Strict bot protection triggered:`, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      confidence: detection.confidence,
      reasons: detection.reasons
    });

    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'This endpoint requires browser access.'
    });
  }

  next();
}

/**
 * Challenge-response for suspicious requests
 * (Can be extended with CAPTCHA integration)
 */
export function challengeIfSuspicious(req: Request, res: Response, next: NextFunction) {
  const detection = detectBot(req);

  if (detection.confidence > 0.6 && detection.confidence < 0.8) {
    // In production, this would trigger a CAPTCHA
    console.warn(`🎯 Challenge triggered for suspicious request:`, {
      ip: req.ip,
      confidence: detection.confidence
    });

    // For now, just log and allow
    // TODO: Integrate CAPTCHA service (hCaptcha, reCAPTCHA, etc.)
  }

  next();
}

/**
 * Get bot detection statistics
 */
export function getBotDetectionStats(req: Request): BotDetectionResult {
  return detectBot(req);
}

export default {
  antiBotProtection,
  strictAntiBotProtection,
  challengeIfSuspicious,
  getBotDetectionStats
};
