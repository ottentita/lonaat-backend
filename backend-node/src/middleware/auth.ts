import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: JWTPayload & { isAdmin: boolean; balance: number; name: string };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload || !payload.id) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(payload.id) },
      select: { id: true, role: true, email: true, is_admin: true, balance: true, is_blocked: true, is_active: true, name: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Account is blocked' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    req.user = {
      id: user.id,
      role: user.role as 'admin' | 'user',
      email: user.email,
      isAdmin: user.is_admin || user.role === 'admin',
      balance: user.balance,
      name: user.name || user.email
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

export async function adminOnlyMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

export function creditCheckMiddleware(requiredCredits: number = 0) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.isAdmin) {
      next();
      return;
    }

    if (requiredCredits > 0 && req.user.balance < requiredCredits) {
      return res.status(403).json({ 
        error: 'Insufficient credits', 
        required: requiredCredits, 
        available: req.user.balance 
      });
    }

    next();
  };
}
