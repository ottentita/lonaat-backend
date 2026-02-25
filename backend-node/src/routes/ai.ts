import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import aiController from '../ai/aiController'

const router = Router()

// Analyze user
router.get('/analyze-user/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const uid = Number(req.params.userId)
    const report = await aiController.analyzeUser(uid)
    return res.json(report)
  } catch (err: any) {
    console.error('AI analyze-user error', err)
    return res.status(500).json({ error: err.message || 'AI error' })
  }
})

// Generate ad blueprint
router.get('/generate-ad/:productId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const pid = Number(req.params.productId)
    const ad = await aiController.generateAd(pid)
    return res.json(ad)
  } catch (err: any) {
    console.error('AI generate-ad error', err)
    return res.status(500).json({ error: err.message || 'AI error' })
  }
})

// Commission analysis
router.get('/commission-analysis/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const uid = Number(req.params.userId)
    const pending = await (await import('../prisma')).default.commission.findMany({ where: { user_id: uid, status: 'pending' } })
    const releaseProb = 0.75
    const flagged = pending.filter(p => (p as any).approved_by == null)
    return res.json({ pendingCount: pending.length, releaseProbability: releaseProb, flaggedDelayed: flagged.length })
  } catch (err: any) {
    console.error('commission-analysis error', err)
    return res.status(500).json({ error: err.message || 'AI error' })
  }
})

export default router
