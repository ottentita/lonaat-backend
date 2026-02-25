import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { verifyToken, JWTPayload } from "../utils/jwt";
import { PrismaClient } from "@prisma/client";

// instantiate Prisma lazily to avoid side-effects during module import
let prismaClient: PrismaClient | null = null;
async function getPrisma() {
  if (!prismaClient) {
    // dynamically import to let vitest/esbuild resolve TypeScript path
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: client } = await import('../../prisma');
    prismaClient = client;
  }
  return prismaClient;
}

export interface AuthRequest extends Request {
  user?: JWTPayload & {
    isAdmin: boolean;
    isAuthority: boolean;
    balance: number;
    name: string;
    userId?: number;
  };
  file?: Express.Multer.File;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  // In development mode inject a mock user to simplify local dev
  if (process.env.NODE_ENV === 'development') {
    req.user = {
      id: 1,
      userId: 1,
      role: 'admin',
      email: 'dev@localhost',
      isAdmin: true,
      isAuthority: true,
      balance: 0,
      name: 'Dev'
    } as any;
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);

  if (!payload || !payload.id) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const prisma = await getPrisma()
    const user = await prisma.user.findUnique({ where: { id: Number(payload.id) },
      select: {
        id: true,
        role: true,
        email: true,
        balance: true,
        isActive: true,
        name: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: "Account is inactive" });
    }

    req.user = {
      id: user.id,
      userId: user.id,
      role: (user.role as any) || 'user',
      email: user.email,
      isAdmin: (user.role || '').toLowerCase() === 'admin',
      isAuthority: (user.role || '').toLowerCase() === 'authority' || (user.role || '').toLowerCase() === 'admin',
      balance: Number(user.balance || 0),
      name: user.name || user.email,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

export async function adminOnlyMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

export async function authorityMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!req.user.isAuthority) {
    return res
      .status(403)
      .json({ error: "Government/Authority access required" });
  }

  next();
}

export function creditCheckMiddleware(requiredCredits: number = 0) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.user.isAdmin) {
      next();
      return;
    }

    if (requiredCredits > 0 && req.user.balance < requiredCredits) {
      return res.status(403).json({
        error: "Insufficient credits",
        required: requiredCredits,
        available: req.user.balance,
      });
    }

    next();
  };
}
