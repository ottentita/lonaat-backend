import express from 'express'
import prisma from '../prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'

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
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    try {
      const { name, email, password } = req.body

      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) return res.status(409).json({ error: 'User with that email already exists' })

      const hash = await bcrypt.hash(password, 10)
      const user = await prisma.user.create({ data: { name, email, password: hash } })

      const token = genTokenFromUser(user)
      return res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, token })
    } catch (err) {
      console.error('Register error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  },
)

router.post(
  '/login',
  [body('email').isEmail().withMessage('Valid email required'), body('password').notEmpty().withMessage('Password required')],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    try {
      const { email, password } = req.body
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) return res.status(401).json({ error: 'Invalid email or password' })

      const valid = await bcrypt.compare(password, (user as any).password)
      if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

      const token = genTokenFromUser(user)
      return res.json({ user: { id: user.id, email: user.email, name: user.name }, token })
    } catch (err) {
      console.error('Login error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  },
)

router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Authorization header required' })

    const token = auth.substring(7)
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

export default router
