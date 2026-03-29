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
    tokenBalance?: number;
    plan?: string;
    trialEndsAt?: any;
    subscriptionEndsAt?: any;
    role?: any;
    email?: string;
  };
  file?: Express.Multer.File;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 AUTH MIDDLEWARE - REQUEST:', req.method, req.path);
    
    // 1. SAFE TOKEN EXTRACTION
    const authHeader = req.headers.authorization;
    let token: string | undefined;
    
    console.log('🔍 Authorization Header:', authHeader ? 'PRESENT' : 'NOT PRESENT');
    console.log('🍪 Cookie Token:', req.cookies?.token ? 'PRESENT' : 'NOT PRESENT');
    
    // Extract from Authorization header first
    if (authHeader) {
      if (!authHeader.startsWith('Bearer ')) {
        console.error('❌ Invalid Authorization header format');
        return res.status(401).json({ message: "Invalid token format" });
      }
      
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || !parts[1]) {
        console.error('❌ Malformed Authorization header');
        return res.status(401).json({ message: "Invalid token format" });
      }
      
      token = parts[1];
      console.log('✅ Token extracted from Authorization header');
    } else if (req.cookies?.token) {
      // Fallback to cookie
      token = req.cookies.token;
      console.log('✅ Token extracted from cookie');
    }

    if (!token) {
      console.error('❌ No token provided');
      return res.status(401).json({ message: "No token provided" });
    }

    // 2. SAFE JWT VERIFY
    console.log('🔓 Verifying JWT token...');
    let decoded: JWTPayload;
    
    try {
      decoded = verifyToken(token);
      
      // PHASE 1 AUDIT: Inspect JWT payload structure
      console.log("🔍 TOKEN DECODED:", JSON.stringify(decoded, null, 2));
      console.log("🔍 TYPE OF ID:", typeof decoded.id);
      console.log("🔍 RAW ID VALUE:", decoded.id);
      
      if (!decoded || !decoded.id) {
        console.error('❌ Invalid token payload - missing id');
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      console.log('✅ Token verified successfully');
    } catch (err) {
      console.error('❌ JWT verification failed:', err);
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // 3. HARD VALIDATION (PHASE 3 FIX 2)
    console.log('🔍 Looking up user in database...');
    const prisma = await getPrisma();
    
    if (!prisma) {
      console.error('❌ Database unavailable');
      return res.status(500).json({ message: "Internal server error" });
    }

    // Extract rawId
    const rawId = decoded.id || (decoded as any).userId;
    
    if (!rawId) {
      console.error('❌ Token missing user id');
      throw new Error("Token missing user id");
    }
    
    // User IDs are integers in the database
    const userId = Number(rawId);
    
    console.log("✅ Final userId:", userId, typeof userId);

    const user = await prisma.user.findUnique({ 
      where: { id: userId } 
    });

    if (!user) {
      console.error('❌ User not found in database:', userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log('✅ User found:', user.email);
    console.log('👤 User role:', user.role || 'user');
    console.log('💰 Token balance:', user.tokenBalance ?? 0);

    // 4. ATTACH USER TO REQUEST
    const isAdminUser = (user.role || '').toLowerCase() === 'admin';
    
    req.user = {
      id: userId,  // String UUID
      userId: userId,
      role: user.role || 'user',
      email: user.email,
      isAdmin: isAdminUser,
      isAuthority: (user.role || '').toLowerCase() === 'authority' || isAdminUser,
      balance: 0,
      tokenBalance: user.tokenBalance ?? 0,
      plan: user.plan || 'free',
      trialEndsAt: null,
      subscriptionEndsAt: null,
      name: user.name || user.email,
    };

    console.log('✅ AUTH SUCCESS - User authenticated:', user.email);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    next();
    
  } catch (error) {
    // 5. GLOBAL ERROR HANDLER
    console.error('❌ AUTH MIDDLEWARE ERROR:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    return res.status(500).json({ message: "Internal server error" });
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
    (req as any).user = {
      ...(decoded as any),
      id: (decoded as any).id,
      userId: (decoded as any).id,
    };
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
