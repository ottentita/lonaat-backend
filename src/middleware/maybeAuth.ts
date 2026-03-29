import { Request, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from './auth';

/**
 * Middleware that uses auth in non-dev, but allows anonymous access in development.
 * This is useful for AI endpoints and other features that should work without
 * authentication during development.
 */
export function maybeAuth(req: Request, res: Response, next: NextFunction) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log('maybeAuth called, NODE_ENV:', nodeEnv);
  
  if (nodeEnv === 'development' || !process.env.NODE_ENV) {
    // In development or when NODE_ENV is not set, allow requests without authentication
    console.log('Development mode detected, skipping authentication');
    return next();
  }
  
  // In production, require full authentication
  console.log('Production mode, requiring authentication');
  return (authMiddleware as any)(req, res, next);
}

export type MaybeAuthRequest = Request & {
  user?: any;
};
