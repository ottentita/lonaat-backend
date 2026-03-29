import express from 'express'
import { PLAN_CONFIG } from '../config/planConfig'
import { prisma } from '../prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import crypto from 'crypto'
import { generateResetToken } from '../utils/generateResetToken'

const router = express.Router()

import { generateToken, verifyToken } from '../utils/jwt'
import { authMiddleware, AuthRequest } from '../middleware/auth'

function genTokenFromUser(user: any) {
  return generateToken({ id: user.id, role: (user.role as any) || 'user', email: user.email, name: user.name })
}

router.post(
  '/register',
  [
    body('name').optional().isString().trim().isLength({ max: 100 }).withMessage('Name must be at most 100 characters'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req: express.Request, res: express.Response) => {
    console.log("🔐 REGISTER BODY:", req.body)
    console.log("📧 EMAIL:", req.body.email)
    console.log("👤 NAME:", req.body.name)
    console.log("🔑 PASSWORD LENGTH:", req.body.password ? req.body.password.length : 0)
    
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.log("❌ VALIDATION ERRORS:", errors.array())
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      const { name, email, password } = req.body
      console.log("✅ Validation passed - Creating user...")
      console.log("🔍 Checking for existing user:", email)

      const existing = await prisma.user.findUnique({ where: { email } })
      console.log("👤 EXISTING USER FOUND:", !!existing)
      if (existing) {
        console.log("❌ User already exists:", existing.email)
        return res.status(409).json({ error: 'User with that email already exists' })
      }

      console.log("🔐 Hashing password...")
      const hash = await bcrypt.hash(password, 10)
      console.log("🔒 HASH GENERATED:", hash.substring(0, 20) + "...")
      console.log("📝 HASH LENGTH:", hash.length)
      
      // Create user with core fields only; some test schemas omit legacy plan/token fields
      console.log("💾 Creating user in database...")
      const user = await prisma.user.create({ data: { name, email, password: hash } })
      console.log("✅ USER CREATED:", { id: user.id, email: user.email, name: user.name })

      // Set initial token balance for new user
      const freePlan = 'FREE'
      const { monthlyTokens } = PLAN_CONFIG[freePlan]
      await prisma.user.update({ 
        where: { id: user.id }, 
        data: { 
          tokenBalance: monthlyTokens,
          plan: freePlan.toLowerCase()
        } 
      })

      // Wallet and token account creation skipped for simplicity
      console.log('💰 User registration completed successfully');

      const token = genTokenFromUser(user)
      // set cookie and return token
      res.cookie('token', token, { 
      httpOnly: true, 
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better cross-browser compatibility
      secure: process.env.NODE_ENV === 'production',
      path: '/' // Ensure cookie is available for all paths
    })
      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'user'
        }
      })
    } catch (err) {
      const error = err as Error
      console.error('❌ REGISTER ERROR:', error)
      console.error('❌ ERROR MESSAGE:', error.message)
      console.error('❌ ERROR STACK:', error.stack)
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  },
)

router.post("/login", async (req, res) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 LOGIN REQUEST');
  console.log('🔐 LOGIN REQUEST BODY:', JSON.stringify(req.body, null, 2));
  console.log('📧 Email:', req.body.email);
  console.log('🔑 Password provided:', !!req.body.password);
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ LOGIN FAILED: Missing credentials');
      return res.status(400).json({ 
        success: false,
        error: "Missing credentials" 
      });
    }

    console.log('🔍 Looking up user in database with raw query...');
    
    // Use safe raw query to avoid Prisma type issues
    const result = await prisma.$queryRawUnsafe(
      `SELECT id, email, password, name, role FROM users WHERE email = $1 LIMIT 1`,
      email
    );

    if (!result || (result as any[]).length === 0) {
      console.log('❌ LOGIN FAILED: User not found');
      return res.status(401).json({ 
        success: false,
        error: "Invalid credentials" 
      });
    }

    const user = (result as any[])[0];
    console.log('✅ User found:', user.id, user.email);
    
    console.log('🔑 Comparing password...');
    const isValid = await bcrypt.compare(password, user.password);
    console.log('🔑 PASSWORD MATCH:', isValid);

    if (!isValid) {
      console.log('❌ LOGIN FAILED: Invalid password');
      return res.status(401).json({ 
        success: false,
        error: "Invalid credentials" 
      });
    }

    console.log('✅ Password valid, generating token...');
    
    const userRole = user.role || 'user';
    const tokenPayload = { 
      id: user.id,
      email: user.email, 
      role: userRole,
      name: user.name
    };
    
    console.log('📝 Token payload:', JSON.stringify(tokenPayload, null, 2));
    
    const token = generateToken(tokenPayload);

    console.log('🎫 Token generated');
    console.log('🍪 Setting cookie...');
    
    res.cookie('token', token, { 
      httpOnly: true, 
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });

    console.log("✅ LOGIN SUCCESS:", { userId: user.id });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: userRole
      }
    });

  } catch (error: any) {
    console.error("❌❌❌ LOGIN ERROR:", error);
    console.error("❌ ERROR MESSAGE:", error?.message || 'Unknown error');
    console.error("❌ ERROR STACK:", error?.stack || 'No stack trace');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return res.status(500).json({ 
      success: false,
      error: error?.message || 'Login failed'
    });
  }
});

// PRODUCTION FIX: /auth/me with comprehensive error handling
router.get("/me", authMiddleware, async (req: AuthRequest, res: express.Response) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 GET /auth/me REQUEST');
    console.log('🔐 AUTH HEADER:', req.headers.authorization || 'None');
    console.log('🍪 COOKIE:', req.cookies?.token ? 'Present' : 'None');
    
    // CRITICAL: Validate req.user exists (set by authMiddleware)
    if (!req.user) {
      console.error('❌ No user attached by middleware - auth failed');
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Authentication required" 
      });
    }
    
    // CRITICAL: Handle both userId and id from JWT payload
    const userId = req.user.userId || req.user.id;
    
    if (!userId) {
      console.error('❌ No userId in req.user:', req.user);
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Invalid token payload" 
      });
    }
    
    console.log('✅ User ID from token:', userId, 'Type:', typeof userId);
    
    // Fetch user from database
    // User IDs are integers in the database
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) }
    });

    if (!user) {
      console.error('❌ User not found in database:', userId);
      return res.status(404).json({ 
        error: "User not found",
        message: "User account does not exist" 
      });
    }
    
    console.log('✅ User found:', user.email, 'ID:', user.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      tokenBalance: user.tokenBalance ?? 0,
      plan: user.plan || 'free'
    });
    
  } catch (err: any) {
    console.error("❌❌❌ /auth/me ERROR:", err);
    console.error("❌ ERROR MESSAGE:", err?.message || 'Unknown error');
    console.error("❌ ERROR STACK:", err?.stack || 'No stack trace');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return res.status(500).json({
      error: "Failed to get user info",
      message: err?.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err?.stack : undefined
    });
  }
});

// User profile endpoint - used by authAPI.getProfile()
router.get('/user/profile', async (req: express.Request, res: express.Response) => {
  try {
    const token = req.cookies?.token
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const payload = verifyToken(token)
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const user = await prisma.user.findUnique({ 
      where: { id: String(payload.id) }
    })
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    return res.json({ 
      user: {
        id: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role || 'user'
      }
    })
  } catch (err) {
    console.error('Get profile error:', err)
    return res.status(500).json({ error: 'Failed to get profile', data: {} })
  }
})

// logout
router.post('/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ ok: true })
})
 
// Refresh token endpoint
// Re-issues a new JWT (and cookie) for an existing session.
// This implementation is stateless (no refresh-token store) and intended for local/dev.
router.post('/refresh', async (req: express.Request, res: express.Response) => {
  try {
    const token = req.cookies?.token
    if (!token) return res.status(401).json({ error: 'No auth cookie' })

    // allow refresh even if access token is expired (signature must still be valid)
    const payload: any = jwt.verify(token, process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'test_jwt_secret', {
      ignoreExpiration: true,
    })

    if (!payload || !payload.id) return res.status(401).json({ error: 'Invalid token' })

    const user = await prisma.user.findUnique({ where: { id: String(payload.id) } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const newToken = genTokenFromUser(user)
    res.cookie('token', newToken, { 
      httpOnly: true, 
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better cross-browser compatibility
      secure: process.env.NODE_ENV === 'production',
      path: '/' // Ensure cookie is available for all paths
    })

    return res.status(200).json({ success: true, token: newToken })
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
})

// Email verification (dev-friendly)
// These endpoints generate/verify a short-lived token.
// In production you would email the token as a link and persist verification state in DB.
router.post('/send-verification', async (req: express.Request, res: express.Response) => {
  try {
    const token = req.cookies?.token
    if (!token) return res.status(401).json({ error: 'No auth cookie' })

    const payload: any = verifyToken(token)
    if (!payload || !payload.id) return res.status(401).json({ error: 'Invalid or expired token' })

    const user = await prisma.user.findUnique({ where: { id: String(payload.id) } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const verificationToken = jwt.sign(
      { sub: user.id, email: user.email, type: 'email_verification' },
      (process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'test_jwt_secret') as string,
      { expiresIn: '30m' },
    )

    // No email provider wired in this repo; return the token so the UI/dev can proceed.
    return res.status(200).json({ success: true, verificationToken })
  } catch (err) {
    console.error('Send verification error:', err)
    return res.status(500).json({ error: 'Failed to generate verification token' })
  }
})

router.post('/verify-email', async (req: express.Request, res: express.Response) => {
  try {
    const { token } = (req.body || {}) as { token?: string }
    if (!token) return res.status(400).json({ error: 'Token required' })

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'test_jwt_secret')
    if (!decoded || decoded.type !== 'email_verification' || !decoded.sub) {
      return res.status(400).json({ error: 'Invalid verification token' })
    }

    const user = await prisma.user.findUnique({ where: { id: String(decoded.sub) } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    // Stateless verification: we currently do not persist an "email verified" flag in DB.
    // Issue a fresh auth token cookie to complete the flow.
    const authToken = genTokenFromUser(user)
    res.cookie('token', authToken, { 
      httpOnly: true, 
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better cross-browser compatibility
      secure: process.env.NODE_ENV === 'production',
      path: '/' // Ensure cookie is available for all paths
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    return res.status(400).json({ error: 'Invalid or expired token' })
  }
})
// TODO: later add csrfProtection middleware when route definitions updated
// apply CSRF to mutating routes


// Forgot password endpoint
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email required')],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    try {
      const { email } = req.body

      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        // always respond success to avoid user enumeration
        return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' })
      }

      // Password reset not yet wired (resetToken fields not in current schema)
      return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' })
    } catch (error) {
      console.error('Forgot password error:', error)
      return res.status(500).json({ error: 'Password reset failed' })
    }
  },
)

// Reset password endpoint
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    try {
      // Password reset not yet wired (resetToken fields not in current schema)
      return res.status(501).json({ error: 'Password reset not yet implemented' })
    } catch (error) {
      console.error('Reset password error:', error)
      return res.status(500).json({ error: 'Reset failed' })
    }
  },
)

// Update user profile endpoint
router.put('/user/profile', async (req: express.Request, res: express.Response) => {
  try {
    const auth = req.headers.authorization
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' })
    }

    const token = auth.substring(7)
    const payload = verifyToken(token)
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const { name, email } = req.body
    const user = await prisma.user.update({
      where: { id: String(payload.id) },
      data: {
        ...(name && { name }),
        ...(email && { email })
      }
    })

    return res.json({ user })
  } catch (err) {
    console.error('Update profile error:', err)
    return res.status(500).json({ error: 'Failed to update profile', data: {} })
  }
})

export default router
