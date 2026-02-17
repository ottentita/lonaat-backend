import express from 'express'
import prisma from '../prisma'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const offers = await prisma.offer.findMany({ where: { isActive: true } })
    res.json(offers)
  } catch (err) {
    console.error('Get offers error:', err)
    res.status(500).json({ error: 'Failed to fetch offers' })
  }
})

// Create offer (basic)
router.post('/', async (req, res) => {
  try {
    const { title, description, url, payout, network, externalOfferId, networkName, trackingUrl, isActive } = req.body
    if (!title || !url) return res.status(400).json({ error: 'title and url required' })

    const offer = await prisma.offer.create({
      data: {
        title,
        description,
        url,
        payout,
        network,
        externalOfferId,
        networkName,
        trackingUrl,
        isActive: isActive ?? true,
      },
    })

    res.status(201).json(offer)
  } catch (err: any) {
    console.error('Create offer error:', err)
    if (err.code === 'P2002') return res.status(409).json({ error: 'externalOfferId must be unique' })
    res.status(500).json({ error: 'Failed to create offer' })
  }
})

export default router
