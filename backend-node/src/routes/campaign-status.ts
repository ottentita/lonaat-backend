import { Router } from 'express'
import { prisma } from '../prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const isAdmin = req.user!.isAdmin

    const where: any = {}
    if (!isAdmin) where.user_id = userId
    // prisma.adBoost may not exist in the local schema; guard against undefined
    if (!(prisma as any).adBoost || typeof (prisma as any).adBoost.count !== 'function') {
      return res.json({ total: 0, active: 0, expired: 0 })
    }

    const [total, active, expired] = await Promise.all([
      (prisma as any).adBoost.count({ where }),
      (prisma as any).adBoost.count({ where: { ...where, status: 'active' } }),
      (prisma as any).adBoost.count({ where: { ...where, status: 'expired' } })
    ])

    res.json({ total: total || 0, active: active || 0, expired: expired || 0 })
  } catch (err: any) {
    console.error('Campaign status error:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch campaign status' })
  }
})

export default router
