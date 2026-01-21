import jwt from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRETE_KEY || process.env.JWT_SECRET_KEY || '';
const JWT_EXPIRY = '12h';
const REFRESH_EXPIRY = '7d';

if (!JWT_SECRET) {
  console.error('WARNING: JWT secret environment variable is not set');
}

export interface JWTPayload {
  id: number;
  role: 'admin' | 'user' | 'authority';
  email: string;
  name?: string;
}

export function generateToken(payload: JWTPayload): string {
  if (!JWT_SECRET) {
    throw new Error('JWT secret environment variable is required');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function generateRefreshToken(payload: JWTPayload): string {
  if (!JWT_SECRET) {
    throw new Error('JWT secret environment variable is required');
  }
  return jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  if (!JWT_SECRET) {
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload | null;
  } catch (error) {
    return null;
  }
}
