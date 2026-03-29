import jwt, { type Secret, type SignOptions } from "jsonwebtoken";

export type JWTPayload = {
  id: number | string;
  email?: string;
  role?: string;
  name?: string;
  iat?: number;
  exp?: number;
};

const SECRET = process.env.JWT_SECRET || "supersecretkey123";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// CRITICAL: Validate JWT_SECRET exists
if (!SECRET || SECRET.length < 10) {
  console.error('❌ CRITICAL: JWT_SECRET is not set or too short!');
  console.error('❌ Using fallback secret - NOT SECURE FOR PRODUCTION');
}

console.log("✅ JWT SECRET configured:", SECRET.substring(0, 10) + '...');

export function generateToken(payload: object) {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as any,
  };
  return jwt.sign(payload as any, SECRET, options);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    if (!token) {
      console.error('❌ verifyToken: No token provided');
      return null;
    }
    
    const decoded = jwt.verify(token, SECRET) as any;
    
    if (!decoded) {
      console.error('❌ verifyToken: Token verification failed');
      return null;
    }
    
    return {
      ...decoded,
      id: decoded?.id || decoded?.userId, // Handle both id and userId
    } as JWTPayload;
  } catch (error: any) {
    console.error('❌ verifyToken ERROR:', error?.message || error);
    return null;
  }
}
