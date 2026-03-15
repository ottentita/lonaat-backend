import { Router } from 'express'
import { adminOnlyMiddleware } from '../middleware/auth'
import networkEngine from '../ai/networkEngine'

const router = Router()

router.get('/network-analysis', adminOnlyMiddleware, async (req, res) => {
  try {
    const report = await networkEngine.analyzeNetworks()
    return res.json(report)
  } catch (err: any) {
    console.error('admin ai network-analysis error', err)
    return res.status(500).json({ error: err.message || 'AI error' })
  }
})

export default router
