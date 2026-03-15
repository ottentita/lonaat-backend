import { Router } from 'express'
import prisma from '../prisma'

const router = Router()

// GET /api/dashboard/stats/:userId
router.get('/stats/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId)
    if (Number.isNaN(userId)) return res.status(400).json({ message: 'Invalid userId' })

    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) return res.status(404).json({ message: 'User not found' })

    // Count commissions (used as conversions/credits for this user)
    const totalConversions = await prisma.commission.count({ where: { user_id: userId } })

    // Map Prisma snake_case fields to camelCase for frontend
    const response = {
      balance: Number(user.balance || 0),
      pendingEarnings: Number((user as any).pending_earnings || 0),
      withdrawableBalance: Number((user as any).withdrawable_balance || 0),
      totalConversions
    }

    return res.json(response)
  } catch (err) {
    console.error('Dashboard stats error', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
