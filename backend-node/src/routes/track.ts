import express from 'express'
import prisma from '../prisma'
import crypto from 'crypto'

const router = express.Router()

router.post('/click', async (req, res) => {
  try {
    const { offerId, clickId, ip, userAgent } = req.body
    if (!offerId || !clickId) return res.status(400).json({ error: 'offerId and clickId required' })

    const click = await prisma.click.create({ data: { offerId, clickId, ip, userAgent } })
    res.json({ ok: true, click })
  } catch (err: any) {
    console.error('Track click error:', err)
    if (err.code === 'P2002') return res.status(409).json({ error: 'Duplicate clickId' })
    res.status(500).json({ error: 'Failed to record click' })
  }
})

router.post('/conversion', async (req, res) => {
  try {
    const { offerId, clickId, amount, status } = req.body
    if (!offerId) return res.status(400).json({ error: 'offerId required' })

    const conv = await prisma.conversion.create({ data: { offerId, clickId, amount, status } })
    res.json({ ok: true, conversion: conv })
  } catch (err) {
    console.error('Track conversion error:', err)
    res.status(500).json({ error: 'Failed to record conversion' })
  }
})

// Redirect endpoint: create a Click with a generated token and redirect to offer.trackingUrl
router.get('/redirect/:offerId', async (req, res) => {
  try {
    const offerId = Number(req.params.offerId)
    if (!offerId) return res.status(400).send('invalid offerId')

    const offer = await prisma.offer.findUnique({ where: { id: offerId } })
    if (!offer || !offer.trackingUrl) return res.status(404).send('offer not found or has no trackingUrl')

    const token = crypto.randomBytes(16).toString('hex')
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || undefined
    const userAgent = req.get('user-agent')

    const click = await prisma.click.create({
      data: {
        offerId: offer.id,
        clickId: `c_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        clickToken: token,
        ip: Array.isArray(ip) ? ip[0] : ip,
        userAgent,
      }
    })

    let redirectUrl = offer.trackingUrl
    if (redirectUrl.includes('{click_token}')) {
      redirectUrl = redirectUrl.replace(/\{click_token\}/g, encodeURIComponent(token))
    } else {
      const sep = redirectUrl.includes('?') ? '&' : '?'
      redirectUrl = `${redirectUrl}${sep}click_token=${encodeURIComponent(token)}`
    }

    res.redirect(302, redirectUrl)
  } catch (err) {
    console.error('Redirect error:', err)
    res.status(500).send('redirect failed')
  }
})

export default router

