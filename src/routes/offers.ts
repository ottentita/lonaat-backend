import express from 'express'
import prisma from '../prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const offers = await prisma.offer.findMany({ where: { isActive: true } })
    // ensure an array is always returned
    if (Array.isArray(offers)) {
      return res.json(offers)
    }
    // fall back to empty array if unexpected shape
    return res.json([])
  } catch (err) {
    console.error('Get offers error:', err)
    res.status(500).json({ error: 'Failed to fetch offers' })
  }
})

// Create offer (basic)
router.post('/', async (req, res) => {
  try {
    const { title, name, description, url, payout, network, externalOfferId, networkName, trackingUrl, isActive, slug } = req.body
    if (!title || !url) return res.status(400).json({ error: 'title and url required' })

    const offer = await prisma.offers.create({
      data: {
        title,
        name,
        slug,
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

// Import/upsert offers from external CPA feeds
router.post('/import', async (req, res) => {
  try {
    const payload = req.body
    const items = Array.isArray(payload) ? payload : [payload]
    const results: any[] = []

    for (const it of items) {
      const {
        externalOfferId,
        slug,
        name,
        title,
        description,
        url,
        payout,
        network,
        networkName,
        trackingUrl,
        isActive,
      } = it

      if (externalOfferId) {
        const upserted = await prisma.offer.upsert({
          where: { externalOfferId },
          create: {
            externalOfferId,
            slug,
            name,
            title,
            description,
            url,
            payout,
            network,
            networkName,
            trackingUrl,
            isActive: isActive ?? true,
          },
          update: {
            slug,
            name,
            title,
            description,
            url,
            payout,
            network,
            networkName,
            trackingUrl,
            isActive: isActive ?? true,
          },
        })
        results.push(upserted)
      } else {
        // fallback: create new offer if no externalOfferId provided
        if (!title || !url) {
          results.push({ error: 'title and url required when externalOfferId missing', item: it })
          continue
        }

        const created = await prisma.offer.create({
          data: {
            title,
            description,
            url,
            payout,
            network,
            networkName,
            trackingUrl,
            isActive: isActive ?? true,
          },
        })
        results.push(created)
      }
    }

    res.json({ ok: true, results })
  } catch (err: any) {
    console.error('Import offers error:', err)
    res.status(500).json({ error: 'Failed to import offers' })
  }
})

// TRACKING LINK GENERATION ENDPOINT
// GET /:offerId/generate-link
router.get('/:offerId/generate-link', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { offerId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const offer = await prisma.offers.findUnique({
      where: { id: Number(offerId) }
    });

    if (!offer || !offer.url) {
      return res.status(404).json({ error: "Offer not found" });
    }

    // Inject subid for tracking
    const trackingLink = `${offer.url}?subid=${userId}`;

    console.log("TRACKING LINK GENERATED:", {
      userId,
      offerId,
      link: trackingLink
    });

    return res.json({
      success: true,
      data: {
        trackingLink
      }
    });

  } catch (error: any) {
    console.error("LINK GENERATION ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router
