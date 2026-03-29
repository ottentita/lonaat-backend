import { Router } from 'express'
import { prisma } from '../prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// POST /api/click - Track product click
router.post('/click', authMiddleware, async (req: AuthRequest, res) => {
  try {
    console.log('🔗 PRODUCT CLICK TRACKING - Request received:', req.body);
    
    const { product_id, product_name, affiliate_link, network } = req.body;
    
    if (!product_id || !network) {
      console.log('❌ PRODUCT CLICK TRACKING - Missing required fields');
      return res.status(400).json({ error: 'Missing product_id or network' });
    }

    // Get user ID from authenticated request
    const userId = req.user?.userId || req.user?.id;
    const userIdStr = userId ? String(userId) : null;

    console.log('👤 PRODUCT CLICK TRACKING - User ID:', userIdStr);
    console.log('📦 PRODUCT CLICK TRACKING - Product ID:', product_id);
    console.log('🌐 PRODUCT CLICK TRACKING - Network:', network);

    // Save click to database with error handling
    const click = await prisma.productClick?.create?.({
      data: {
        productId: String(product_id),
        userId: userIdStr,
        network: String(network),
      }
    });

    console.log('✅ PRODUCT CLICK TRACKING - Click saved:', click.id);
    
    res.status(200).json({ 
      success: true, 
      clickId: click.id,
      message: 'Click tracked successfully'
    });

  } catch (error: any) {
    console.error('❌ PRODUCT CLICK TRACKING - Error:', error);
    res.status(500).json({ 
      error: 'Failed to track click',
      message: error.message 
    });
  }
});

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
    // perform the click insert in a transaction to let the DB enforce uniqueness
    let click
    try {
      click = await prisma.$transaction(async (tx) => {
        return tx.click.create({
          data: {
            offerId: offer.id,
            adId: null,
            userId: userKey,
            timeBucket,
            clickId,
            clickToken: token,
            user_id: req.user!.id,
            ip,
            userAgent: req.get('user-agent') || undefined
          }
        })
      })
    } catch (e: any) {
      if (e.code === 'P2002') {
        return res.status(409).json({ error: 'Duplicate click' })
      }
      throw e
    }

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
