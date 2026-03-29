import { Router } from 'express'
import { simulateVideoCost } from '../ai/pricing/videoCostSimulator'
import { authMiddleware, adminOnlyMiddleware } from '../middleware/auth'

const router = Router()

router.use(authMiddleware)
router.use(adminOnlyMiddleware)

router.get('/simulate-video', (req, res) => {
  try {
    const durationSeconds = Number(req.query.durationSeconds)
    const resolution = String(req.query.resolution || '')
    const tokenDollarValue = Number(req.query.tokenDollarValue)

    if (!Number.isFinite(durationSeconds) || !resolution || !Number.isFinite(tokenDollarValue)) {
      return res.status(400).json({ error: 'Missing required query parameters' })
    }

    const sim = simulateVideoCost({ durationSeconds, resolution, tokenDollarValue })
    const revenue = sim.tokenCost * tokenDollarValue
    const marginUSD = Number((revenue - sim.estimatedProviderCostUSD).toFixed(6))
    const marginPercent = sim.estimatedProviderCostUSD === 0 ? null : Number(((marginUSD / sim.estimatedProviderCostUSD) * 100).toFixed(4))

    return res.json({
      tokenCost: sim.tokenCost,
      estimatedProviderCostUSD: sim.estimatedProviderCostUSD,
      effectiveRevenueIfTokenDollarValue: sim.effectiveRevenueIfTokenDollarValue,
      marginUSD,
      marginPercent,
    })
  } catch (err: any) {
    if (String(err.message).includes('ERR_INVALID_VIDEO_INPUT')) {
      return res.status(400).json({ error: 'ERR_INVALID_VIDEO_INPUT' })
    }
    return res.status(500).json({ error: String(err && err.message ? err.message : err) })
  }
})

// Token pack simulation endpoint
router.post('/simulate-token-pack', (req, res) => {
  try {
    const { tokenAmount, priceUSD } = req.body as any
    const ta = Number(tokenAmount)
    const p = Number(priceUSD)
    if (!Number.isFinite(ta) || ta <= 0 || !Number.isFinite(p) || p <= 0) {
      return res.status(400).json({ error: 'Missing or invalid tokenAmount/priceUSD' })
    }
    const costPerToken = p / ta
    const PROVIDER_COST_RATIO = 0.20
    const effectiveMargin = Number((costPerToken * (1 - PROVIDER_COST_RATIO)).toFixed(6))
    return res.json({ costPerToken, effectiveMargin })
  } catch (err: any) {
    return res.status(500).json({ error: String(err && err.message ? err.message : err) })
  }
})

export default router
