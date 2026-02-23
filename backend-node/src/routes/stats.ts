import { Router } from 'express'
import prisma from '../prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id

    const [totalClicks, totalCommissions, earningsAgg] = await Promise.all([
      prisma.click.count({ where: { user_id: userId } as any }),
      prisma.commission.count({ where: { user_id: userId } as any }),
      prisma.commission.aggregate({ where: { user_id: userId } as any, _sum: { amount: true } })
    ])

    const totalEarnings = earningsAgg._sum.amount ? Number(earningsAgg._sum.amount) : 0

    // Ensure default zeros when no data
    res.json({ totalClicks: totalClicks || 0, totalCommissions: totalCommissions || 0, totalEarnings: totalEarnings || 0 })
  } catch (err: any) {
    console.error('Stats error:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch stats' })
  }
})

export default router
