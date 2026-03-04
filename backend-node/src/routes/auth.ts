import express from 'express'
import { PLAN_CONFIG } from '../config/planConfig'
import { prisma } from '../prisma'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import crypto from 'crypto'
import { generateResetToken } from '../utils/generateResetToken'

const router = express.Router()

import { generateToken, verifyToken } from '../utils/jwt'

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
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    try {
      const { name, email, password } = req.body

      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) return res.status(409).json({ error: 'User with that email already exists' })

      const hash = await bcrypt.hash(password, 10)
      // Create user with core fields only; some test schemas omit legacy plan/token fields
      const user = await prisma.user.create({ data: { name, email, password: hash } })

      // create token account for new user if model exists in the runtime Prisma client
      const freePlan = 'FREE'
      const { monthlyTokens, rolloverCap, overdraft } = PLAN_CONFIG[freePlan]
      if ((prisma as any).tokenAccount && typeof (prisma as any).tokenAccount.create === 'function') {
        await (prisma as any).tokenAccount.create({
          data: {
            userId: user.id,
            balance: monthlyTokens,
            reservedBalance: 0,
            planType: freePlan,
            rolloverCap: rolloverCap,
            overdraftLimit: overdraft
          }
        })
      } else {
        // Fallback for trimmed test Prisma schema: seed user's tokenBalance and plan fields
        await prisma.user.update({ where: { id: user.id } as any, data: { tokenBalance: monthlyTokens, plan: (freePlan || 'FREE').toString().toLowerCase() } as any })
      }

      const token = genTokenFromUser(user)
      // set cookie instead of returning token
      res.cookie('token', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' })
      return res.status(201).json({ user: { id: user.id, email: user.email, name: user.name } })
    } catch (err) {
      console.error('Register error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  },
)

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    // also set cookie for compatibility with tests expecting `set-cookie`
    res.cookie('token', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' })

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });


  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/me', async (req: express.Request, res: express.Response) => {
  try {
    const token = req.cookies?.token
    if (!token) return res.status(401).json({ error: 'No auth cookie' })

    const payload = verifyToken(token)
    if (!payload || !payload.id) return res.status(401).json({ error: 'Invalid or expired token' })

    const user = await prisma.user.findUnique({ where: { id: Number(payload.id) } as any })
    if (!user) return res.status(404).json({ error: 'User not found' })

    return res.json({ id: user.id, email: user.email, name: user.name })
  } catch (err) {
    console.error('Me error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

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
      where: { id: Number(payload.id) } as any,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        balance: true,
        created_at: true
      }
    })
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    return res.json({ 
      user: {
        id: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role || 'user',
        balance: Number(user.balance || 0),
        created_at: user.created_at
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

      const rawToken = generateResetToken()
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
      const expiry = new Date(Date.now() + 1000 * 60 * 15)

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: hashedToken, resetTokenExpiry: expiry }
      })

      const resetURL = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`

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
      const { token, password } = req.body
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

      const user = await prisma.user.findFirst({
        where: { resetToken: hashedToken, resetTokenExpiry: { gt: new Date() } }
      })
      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired token' })
      }

      const hashedPassword = await bcrypt.hash(password, 12)
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null }
      })

      return res.status(200).json({ message: 'Password successfully reset' })
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
      where: { id: Number(payload.id) } as any,
      data: {
        ...(name && { name }),
        ...(email && { email })
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        balance: true,
        created_at: true
      }
    })

    return res.json({ user })
  } catch (err) {
    console.error('Update profile error:', err)
    return res.status(500).json({ error: 'Failed to update profile', data: {} })
  }
})

export default router
