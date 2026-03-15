import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { authenticate } from '../middleware/auth'
import { requireTokens } from '../middleware/tokenGuard'
import { premiumGuard } from '../middleware/premiumGuard'
import { validate } from '../middleware/validation'
import { earningsPredictionSchema } from '../schemas/requestSchemas'
import aiController from '../ai/aiController'
import prisma from '../prisma'
import { generateAffiliateContent } from '../services/ai.service'
import { finalizeTokens, releaseTokens } from '../services/tokenService'

const router = Router()

// Middleware that uses auth in non-dev, but allows anonymous access in development.
const maybeAuth = (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV === 'development') return next()
  return (authMiddleware as any)(req, res, next)
}

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

// Test route protected by token guard (deducts 5 tokens)
router.post(
  '/generate-ai-content-test',
  authenticate,
  requireTokens(5),
  async (req: AuthRequest & any, res) => {
    res.json({ message: 'AI content generated (test)', success: true })
  },
)

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

// Example script generation endpoint utilizing premiumGuard
router.post(
  '/generate-script',
  authMiddleware,
  premiumGuard('SCRIPT_GENERATION', 5),
  async (req: AuthRequest & any, res) => {
    try {
      const result = await aiController.generateScript(req.body)
      await finalizeTokens(req.user.id, 5, 'SCRIPT_GENERATION')
      res.json(result)
    } catch (error: any) {
      await releaseTokens(req.user.id, 5, 'SCRIPT_GENERATION')
      res.status(500).json({ error: 'Generation failed' })
    }
  }
)

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

// Offer recommendations
router.get('/recommendations', maybeAuth, async (req: AuthRequest, res) => {
  try {
    const recs = await aiController.getRecommendations()
    return res.json({ recommendations: recs })
  } catch (err: any) {
    console.error('AI recommendations error', err)
    return res.status(500).json({ error: err.message || 'AI error' })
  }
})

// Earnings prediction for a given offer and projected clicks
router.get('/earnings-prediction', maybeAuth, validate(earningsPredictionSchema, 'query'), async (req: AuthRequest, res) => {
  try {
    const offerId = Number(req.query.offerId)
    const clicks = Number(req.query.clicks)
    let userId = req.user?.userId
    // In development mode, allow anonymous requests by using a fallback user if none provided
    if (!userId && process.env.NODE_ENV === 'development') {
      const fallback = await prisma.user.findFirst()
      userId = fallback?.id
    }
    if (!offerId || !clicks || !userId) {
      return res.status(400).json({ error: 'offerId, clicks and auth required' })
    }
    const result = await aiController.earningsPrediction(userId, offerId, clicks)
    return res.json(result)
  } catch (err: any) {
    console.error('AI earnings-prediction error', err)
    return res.status(500).json({ error: err.message || 'AI error' })
  }
})

// Generate content for an offer
// Plan rules:
// - free plan: 1 generation allowed per request (1 token deducted)
// - pro plan: batch generation allowed with advanced variations (1 token per generation)
router.post('/generate-content', authMiddleware, premiumGuard('CONTENT_GEN', 1), async (req: AuthRequest & any, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { offerId, affiliateLink, description, audience } = req.body
    if (!offerId) {
      return res.status(400).json({ error: 'offerId required' })
    }

    // Fetch user and check ad token wallet balance (tests use adTokenWallet)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const wallet = await prisma.adTokenWallet.findUnique({ where: { userId } })
    const tokenCost = 1
    if (!wallet || wallet.balance < tokenCost) {
      return res.status(402).json({ error: 'Insufficient tokens' })
    }

    // Generate content using OpenAI
    const offer = await prisma.offer.findUnique({ where: { id: offerId } })
    const productName = offer?.name || 'Product'
    
    const aiResult = await generateAffiliateContent({
      productName,
      description: description || offer?.description || 'Check this out',
      audience: audience || 'everyone'
    })

    // Save content draft

    // deduct tokens after successful generation (update adTokenWallet)
    try {
      await prisma.adTokenWallet.update({ where: { userId }, data: { balance: { decrement: tokenCost } } })
    } catch (tokenErr) {
      console.error('token finalize error', tokenErr)
    }
    const draft = await prisma.contentDraft.create({
      data: {
        userId,
        offerId,
        hooks: JSON.stringify(aiResult.hooks),
        script: aiResult.script,
        caption: aiResult.caption,
        hashtags: aiResult.hashtags.join(' '),
        status: 'generated'
      }
    })

    // Deduct tokens
    // Log AI usage
    await prisma.aiUsage.create({ data: { userId, tokensUsed: tokenCost } })

    // fetch updated wallet balance for remainingTokens
    const updatedWallet = await prisma.adTokenWallet.findUnique({ where: { userId } })

    return res.json({ success: true, draftId: draft.id, content: aiResult, remainingTokens: updatedWallet ? updatedWallet.balance : null })
  } catch (error: any) {
    console.error('Generate content error:', error)
    return res.status(500).json({ error: error.message || 'Failed to generate content' })
  }
})

// Get all content drafts for the user
router.get('/my-content', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const drafts = await prisma.contentDraft.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } }
      }
    })

    return res.json({
      success: true,
      count: drafts.length,
      drafts
    })
  } catch (error: any) {
    console.error('Get content error:', error)
    return res.status(500).json({ error: error.message || 'Failed to retrieve content' })
  }
})

export default router
