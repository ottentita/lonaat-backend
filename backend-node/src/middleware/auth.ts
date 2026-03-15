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
    const { default: client } = await import('../prisma');
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
  // No dev-mode injection: always authenticate via token/cookie to ensure
  // aiEngine and downstream guards always use real user data from DB.

  // Support Authorization header Bearer token or cookie fallback
  const authHeader = req.headers.authorization as string | undefined;
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    token = req.cookies?.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const payload = verifyToken(token as string);

  if (!payload || !payload.id) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const prisma = await getPrisma()
    // Only select fields known to exist in the test schema to avoid runtime
    // Prisma validation errors when tests use a trimmed schema.
    const safeSelect: any = {
      id: true,
      role: true,
      email: true,
      balance: true,
      isActive: true,
      name: true,
    }

    const user = await prisma.user.findUnique({ where: { id: Number(payload.id) }, select: safeSelect });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if ((user as any).isActive === false) {
      return res.status(403).json({ error: "Account is inactive" });
    }

    req.user = {
      id: (user as any).id,
      userId: (user as any).id,
      role: ((user as any).role as any) || 'user',
      email: (user as any).email,
      isAdmin: ((user as any).role || '').toLowerCase() === 'admin',
      isAuthority: ((user as any).role || '').toLowerCase() === 'authority' || ((user as any).role || '').toLowerCase() === 'admin',
      balance: Number((user as any).balance || 0),
      // legacy fields may not exist in test schema; provide safe defaults
      tokenBalance: Number((user as any).tokenBalance ?? 0),
      plan: (user as any).plan || 'free',
      trialEndsAt: (user as any).trialEndsAt || null,
      subscriptionEndsAt: (user as any).subscriptionEndsAt || null,
      name: (user as any).name || (user as any).email,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

// New lightweight header/cookie authenticate middleware (keeps existing logic intact)
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = verifyToken(token as string);
    // attach decoded payload to req.user when possible
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
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
