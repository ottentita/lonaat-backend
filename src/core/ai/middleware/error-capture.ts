/**
 * ERROR CAPTURE
 * Captures all errors and logs to ai_logs table
 */

import { Request, Response, NextFunction } from 'express';
import { logError } from '../logs/logger.service';

/**
 * Sanitize error message
 * Remove sensitive data and truncate if too long
 */
function sanitizeErrorMessage(message: string): string {
  if (!message) return 'Unknown error';
  
  // Remove sensitive patterns
  let sanitized = message
    .replace(/authorization[:\s]+[^\s]+/gi, 'authorization: [REDACTED]')
    .replace(/bearer\s+[^\s]+/gi, 'bearer [REDACTED]')
    .replace(/token[:\s]+[^\s]+/gi, 'token: [REDACTED]')
    .replace(/password[:\s]+[^\s]+/gi, 'password: [REDACTED]')
    .replace(/api[_-]?key[:\s]+[^\s]+/gi, 'api_key: [REDACTED]')
    .replace(/secret[:\s]+[^\s]+/gi, 'secret: [REDACTED]');
  
  // Truncate if too long (max 300 chars)
  if (sanitized.length > 300) {
    sanitized = sanitized.substring(0, 297) + '...';
  }
  
  return sanitized;
}

/**
 * Error capture middleware
 * Logs errors without exposing details to user
 */
export function errorCapture(err: any, req: Request, res: Response, next: NextFunction): void {
  const { method, path } = req;
  
  // Sanitize error message
  const sanitizedMessage = sanitizeErrorMessage(err.message || '');
  
  // Sanitize stack trace (first 2 lines only, remove sensitive data)
  let sanitizedStack = '';
  if (err.stack) {
    const stackLines = err.stack.split('\n').slice(0, 2);
    sanitizedStack = stackLines
      .map((line: string) => sanitizeErrorMessage(line))
      .join('\n');
  }
  
  // Log error asynchronously without delaying response
  setImmediate(() => {
    logError('ERROR_CAPTURED', {
      path,
      method,
      message: sanitizedMessage,
      stack: sanitizedStack
    }).catch((logErr) => {
      console.error('Failed to log error:', logErr);
    });
  });
  
  // Pass to next error handler (do not expose error to user here)
  next(err);
}
