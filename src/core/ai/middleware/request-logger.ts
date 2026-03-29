/**
 * REQUEST LOGGER
 * Logs every request to ai_logs table
 */

import { Request, Response, NextFunction } from 'express';
import { logInfo } from '../logs/logger.service';

/**
 * Request logger middleware
 * Logs method, path, status, response time
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const { method, path } = req;
  
  // Capture response finish event
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const { statusCode } = res;
    
    // Log asynchronously without delaying response
    setImmediate(() => {
      logInfo('REQUEST', {
        method,
        path,
        status: statusCode,
        responseTime: `${responseTime}ms`
      }).catch((error) => {
        // Silent fail - don't break request flow
        console.error('Failed to log request:', error);
      });
    });
  });
  
  next();
}
