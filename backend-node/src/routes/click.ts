import { Router } from 'express'
import prisma from '../prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

router.post('/:offerId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const offerId = Number(req.params.offerId)
    if (!offerId) return res.status(400).json({ error: 'invalid offerId' })

    const offer = await prisma.offer.findUnique({ where: { id: offerId } })
    if (!offer) return res.status(404).json({ error: 'offer not found' })

    const clickId = `c_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    const token = Math.random().toString(36).slice(2)

    const timeBucket = Math.floor(Date.now() / 5000)
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || undefined
    const hashIp = (str?: string) => {
      if (!str) return 0
      let n = 0
      for (let i = 0; i < str.length; i++) n = ((n << 5) - n) + str.charCodeAt(i) | 0
      return Math.abs(n)
    }
    const userKey = req.user?.id || hashIp(ip)
    const click = await prisma.click.create({
      data: {
        offerId: offer.id,
        adId: offer.id,
        userId: userKey,
        timeBucket,
        clickId,
        clickToken: token,
        user_id: req.user!.id,
        ip,
        userAgent: req.get('user-agent') || undefined
      }
    })

    const payout = (offer.payout as any) ? Number(offer.payout) : 0

    const commission = await prisma.commission.create({
      data: {
        user_id: req.user!.id,
        click_id: click.id,
        amount: payout,
        status: 'pending',
        network: offer.network || null,
      }
    })

    res.json({ ok: true, click, commission })
  } catch (err: any) {
    console.error('Click create error:', err)
    res.status(500).json({ error: 'Failed to create click' })
  }
})

export default router
