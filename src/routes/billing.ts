import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import prisma from '../prisma'

const router = Router()

// Token package definitions
const TOKEN_PACKAGES = {
  small: 50,
  medium: 150,
  large: 500
}

// GET /api/billing/balance - Get user's token balance and usage info
router.get('/balance', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        tokens: true,
        aiUsage: {
          select: { tokensUsed: true }
        }
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const totalUsed = user.aiUsage.reduce((sum, usage) => sum + usage.tokensUsed, 0)

    return res.json({
      plan: user.plan,
      tokens: user.tokens,
      totalUsed
    })
  } catch (error: any) {
    console.error('Balance endpoint error:', error)
    return res.status(500).json({ error: error.message || 'Failed to fetch balance' })
  }
})

// POST /api/billing/purchase-tokens - Purchase token packages
router.post('/purchase-tokens', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { package: packageName } = req.body
    if (!packageName || !TOKEN_PACKAGES[packageName as keyof typeof TOKEN_PACKAGES]) {
      return res.status(400).json({
        error: 'Invalid package. Use: small, medium, or large'
      })
    }

    const amount = TOKEN_PACKAGES[packageName as keyof typeof TOKEN_PACKAGES]

    // Update user tokens
    const user = await prisma.user.update({
      where: { id: userId },
      data: { tokens: { increment: amount } }
    })

    // Log purchase
    await prisma.tokenPurchase.create({
      data: {
        userId,
        amount
      }
    })

    return res.json({
      success: true,
      package: packageName,
      amount,
      newBalance: user.tokens
    })
  } catch (error: any) {
    console.error('Purchase tokens error:', error)
    return res.status(500).json({ error: error.message || 'Purchase failed' })
  }
})

// GET /api/billing/usage-summary - Get detailed usage and revenue stats
router.get('/usage-summary', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Aggregate AI usage
    const aiUsageData = await prisma.aiUsage.aggregate({
      where: { userId },
      _sum: { tokensUsed: true }
    })

    // Count content drafts
    const draftCount = await prisma.contentDraft.count({
      where: { userId }
    })

    // Sum token purchases as revenue
    const purchaseData = await prisma.tokenPurchase.aggregate({
      where: { userId },
      _sum: { amount: true }
    })

    const totalUsed = aiUsageData._sum.tokensUsed || 0
    const totalPurchased = purchaseData._sum.amount || 0
    
    // Estimated cost: $0.002 per token (rough estimate for GPT-4o-mini)
    const avgCostPerToken = 0.002
    const estimatedCost = (totalUsed * avgCostPerToken).toFixed(3)

    return res.json({
      totalTokensUsed: totalUsed,
      totalDraftsCreated: draftCount,
      estimatedAICost: parseFloat(estimatedCost),
      totalTokensPurchased: totalPurchased
    })
  } catch (error: any) {
    console.error('Usage summary error:', error)
    return res.status(500).json({ error: error.message || 'Failed to fetch usage summary' })
  }
})

export default router
