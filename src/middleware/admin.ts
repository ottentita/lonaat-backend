import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * CENTRALIZED ADMIN-ONLY MIDDLEWARE
 * Single source of truth for admin authorization
 * Apply this to ALL admin routes
 */
export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  // Check if user has admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }

  // User is authenticated and has admin role
  next();
};

export default adminOnly;
