import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Middleware to enforce role-based access control
 * @param requiredRoles - Array of allowed roles
 */
export function roleGuard(requiredRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role?.toUpperCase() || 'USER';
    const hasRequiredRole = requiredRoles.some(
      (role) => userRole === role.toUpperCase()
    );

    if (!hasRequiredRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${requiredRoles.join(', ')}`
      });
    }

    next();
  };
}

/**
 * Middleware to ensure user is an admin
 */
export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const isAdmin = req.user.isAdmin === true || req.user.role?.toUpperCase() === 'ADMIN';

  if (!isAdmin) {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'This endpoint is restricted to administrators only'
    });
  }

  next();
}

/**
 * Middleware to ensure user is not suspended
 */
export function notSuspended(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if suspended property exists on user object
  const isSuspended = (req.user as any)?.suspended === true;
  if (isSuspended) {
    return res.status(403).json({
      error: 'Account suspended',
      message: 'Your account has been suspended. Please contact support.'
    });
  }

  next();
}

/**
 * Middleware to ensure user owns the resource (for self-service endpoints)
 * @param paramName - Name of the parameter containing the user ID
 */
export function ownsResource(paramName: string = 'userId') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const resourceUserId = req.params[paramName];
    const currentUserId = String(req.user.userId || req.user.id);

    // Admins can access any resource
    if (req.user.isAdmin === true || req.user.role?.toUpperCase() === 'ADMIN') {
      return next();
    }

    // Non-admins can only access their own resources
    if (resourceUserId !== currentUserId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources'
      });
    }

    next();
  };
}

/**
 * Combined middleware for common admin-only scenarios
 */
export function adminOnlyRoute(req: AuthRequest, res: Response, next: NextFunction) {
  adminOnly(req, res, () => {
    notSuspended(req, res, next);
  });
}
