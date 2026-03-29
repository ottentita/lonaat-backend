/**
 * AI ACCESS GUARDS
 * Middleware for AI route access control
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Require ADMIN role for AI system access
 */
export function requireAdminAI(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  if (user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  next();
}

/**
 * Require ADMIN or PREMIUM role for AI features
 */
export function requirePremiumAI(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  if (user.role !== 'ADMIN' && user.role !== 'PREMIUM') {
    res.status(403).json({ error: 'Premium access required' });
    return;
  }
  
  next();
}
