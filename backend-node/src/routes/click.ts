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

    const click = await prisma.click.create({
      data: {
        offerId: offer.id,
        clickId,
        clickToken: token,
        user_id: req.user!.id,
        ip: req.ip || (req.headers['x-forwarded-for'] as string) || undefined,
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
