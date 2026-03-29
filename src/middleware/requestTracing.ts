import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request type to include request ID
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Request tracing middleware
 * Adds unique ID to each request for debugging and traceability
 */
export const requestTracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate unique request ID
  req.id = uuidv4();

  // Log request start
  console.log(`📌 Request ${req.id}: ${req.method} ${req.path}`);

  // Log request completion
  res.on('finish', () => {
    console.log(`✅ Request ${req.id}: ${res.statusCode} ${req.method} ${req.path}`);
  });

  next();
};

export default requestTracingMiddleware;
