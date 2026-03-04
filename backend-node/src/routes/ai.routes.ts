import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import aiManager from '../services/ai.manager'
import prisma from '../prisma'
import { generateAffiliateContent } from '../services/ai.service'
import aiController from '../ai/aiController'
import { validate } from '../middleware/validation'
import { earningsPredictionSchema } from '../schemas/requestSchemas'

// Dev-mode auth passthrough for AI helper endpoints
const maybeAuth = (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV === 'development') return next()
  return (authMiddleware as any)(req, res, next)
}

const router = Router()
// In-memory fallback for content drafts when test Prisma schema omits the model
const inMemoryDrafts: Record<number, any[]> = {}

// Health check for AI routes (protected)
router.get('/health', authMiddleware, async (req: AuthRequest, res) => {
  return res.json({ status: 'ok', ai: 'mounted' })
})

// Specific content generation endpoint (compatibility with legacy tests)
router.post('/generate-content', authMiddleware, async (req: AuthRequest & any, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { offerId, affiliateLink, description, audience } = req.body || {}
    if (!offerId) return res.status(400).json({ error: 'offerId required' })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const wallet = await prisma.adTokenWallet.findUnique({ where: { userId } })
    const tokenCost = 1
    if (!wallet || wallet.balance < tokenCost) return res.status(402).json({ error: 'Insufficient tokens' })

    const offer = await prisma.offer.findUnique({ where: { id: Number(offerId) } })
    const productName = offer?.name || 'Product'

    const aiResult = await generateAffiliateContent({ productName, description: description || offer?.description || 'Check this out', audience: audience || 'everyone' })

    let draft: any = null
    if ((prisma as any).contentDraft && typeof (prisma as any).contentDraft.create === 'function') {
      draft = await (prisma as any).contentDraft.create({ data: { userId, offerId: Number(offerId), hooks: JSON.stringify(aiResult.hooks), script: aiResult.script, caption: aiResult.caption, hashtags: aiResult.hashtags.join(' '), status: 'generated' } })
    } else {
      // fallback: store in-memory for test runs when model missing
      const newDraft = { id: `mem-${Date.now()}-${Math.floor(Math.random()*10000)}`, userId, offerId: Number(offerId), hooks: aiResult.hooks, script: aiResult.script, caption: aiResult.caption, hashtags: aiResult.hashtags.join(' '), status: 'generated', createdAt: new Date() }
      inMemoryDrafts[userId] = inMemoryDrafts[userId] || []
      inMemoryDrafts[userId].unshift(newDraft)
      draft = newDraft
    }

    await prisma.adTokenWallet.update({ where: { userId }, data: { balance: { decrement: tokenCost } } })
    if ((prisma as any).aiUsage && typeof (prisma as any).aiUsage.create === 'function') {
      await (prisma as any).aiUsage.create({ data: { userId, tokensUsed: tokenCost } })
    }

    const updatedWallet = await prisma.adTokenWallet.findUnique({ where: { userId } })

    return res.json({ success: true, draftId: draft.id, content: aiResult, remainingTokens: updatedWallet ? updatedWallet.balance : null })
  } catch (error: any) {
    console.error('Generate content error:', error)
    return res.status(500).json({ error: error.message || 'Failed to generate content' })
  }
})

// Get all content drafts for user (legacy compatibility)
router.get('/my-content', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    let drafts: any[] = []
    if ((prisma as any).contentDraft && typeof (prisma as any).contentDraft.findMany === 'function') {
      drafts = await (prisma as any).contentDraft.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, email: true } } } })
    } else {
      drafts = inMemoryDrafts[userId] || []
    }

    return res.json({ success: true, count: drafts.length, drafts })
  } catch (error: any) {
    console.error('Get content error:', error)
    return res.status(500).json({ error: error.message || 'Failed to retrieve content' })
  }
})

// Centralized AI feature runner (catch-all for mounted features)
router.post('/:feature', authMiddleware, async (req: AuthRequest & any, res) => {
  try {
    const featureName = req.params.feature
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const payload = req.body || {}
    // allow per-request dry-run via header or query param
    const headerDry = String(req.header('x-ai-dry-run') || '').toLowerCase() === 'true'
    const queryDry = String((req.query && req.query.dry) || '').toLowerCase() === 'true'
    const dry = headerDry || queryDry
    const result = await aiManager.runFeature(userId, featureName, payload, { dry })
    return res.json(result)
  } catch (err: any) {
    console.error('AI routes error:', err)
    return res.status(400).json({ error: err.message || 'AI feature failed' })
  }
})

export default router

// Recommendations (allow dev bypass)
router.get('/recommendations', maybeAuth, async (req: any, res: any) => {
  try {
    const recs = await aiController.getRecommendations()
    return res.json({ recommendations: recs })
  } catch (err: any) {
    console.error('AI recommendations error', err)
    return res.status(500).json({ error: err.message || 'AI error' })
  }
})

// Earnings prediction (allow dev bypass and validate query)
router.get('/earnings-prediction', maybeAuth, validate(earningsPredictionSchema, 'query'), async (req: any, res: any) => {
  try {
    const offerId = Number(req.query.offerId)
    const clicks = Number(req.query.clicks)
    let userId = req.user?.userId
    if (!userId && process.env.NODE_ENV === 'development') {
      const fallback = await prisma.user.findFirst()
      userId = fallback?.id
    }
    if (!offerId || !clicks || !userId) return res.status(400).json({ error: 'offerId, clicks and auth required' })
    const result = await aiController.earningsPrediction(userId, offerId, clicks)
    return res.json(result)
  } catch (err: any) {
    console.error('AI earnings-prediction error', err)
    return res.status(500).json({ error: err.message || 'AI error' })
  }
})
