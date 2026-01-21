import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { generateToken, generateRefreshToken, verifyToken, JWTPayload } from '../utils/jwt';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();
const prisma = new PrismaClient();

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again after 10 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.headers['x-bypass-ratelimit'] === process.env.SECRET_KEY;
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many registration attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

router.post('/register', registerLimiter, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, referralCode } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const newReferralCode = generateReferralCode();
    
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
        referral_code: newReferralCode,
        referred_by: referralCode || null,
        role: 'user',
        balance: 0,
        verified: false,
        is_admin: false,
        is_active: true,
        is_blocked: false,
        trial_ends_at: trialEndsAt
      }
    });

    await prisma.creditWallet.create({
      data: {
        user_id: user.id,
        credits: 0,
        total_purchased: 0,
        total_spent: 0
      }
    });

    const payload: JWTPayload = {
      id: user.id,
      role: 'user',
      email: user.email
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.status(201).json({
      message: 'Registration successful',
      access_token: token,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        balance: user.balance,
        is_admin: false
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Account is blocked', reason: user.block_reason });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload: JWTPayload = {
      id: user.id,
      role: (user.is_admin || user.role === 'admin') ? 'admin' : 'user',
      email: user.email
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      message: 'Login successful',
      access_token: token,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: payload.role,
        balance: user.balance,
        is_admin: user.is_admin || user.role === 'admin'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        balance: true,
        is_admin: true,
        verified: true,
        referral_code: true,
        created_at: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const wallet = await prisma.creditWallet.findUnique({
      where: { user_id: user.id }
    });

    res.json({
      ...user,
      is_admin: user.is_admin || user.role === 'admin',
      credits: wallet?.credits || 0
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const refreshToken = authHeader.substring(7);
    const decoded = verifyToken(refreshToken) as any;
    
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, is_admin: true, is_blocked: true, is_active: true }
    });

    if (!user || user.is_blocked || !user.is_active) {
      return res.status(401).json({ error: 'Session expired, please login again' });
    }

    const payload: JWTPayload = {
      id: user.id,
      role: (user.is_admin || user.role === 'admin') ? 'admin' : 'user',
      email: user.email
    };

    const newAccessToken = generateToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    res.json({ 
      access_token: newAccessToken,
      refresh_token: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(401).json({ error: 'Session expired, please login again' });
  }
});

export default router;
