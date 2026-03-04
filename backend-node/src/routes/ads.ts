import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateProductAd } from '../services/ai';

const router = Router();


router.post('/launch', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { product_id, boost_type } = req.body;
    
    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const product = await prisma.product.findUnique({
      where: { id: parseInt(product_id) }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!product.affiliate_link) {
      return res.status(400).json({ error: 'Product must have an affiliate URL to run ads' });
    }

    const isAdmin = req.user?.isAdmin;
    const creditCost = isAdmin ? 0 : 10;

    if (!isAdmin) {
      try {
        await prisma.$transaction(async (tx) => {
          const wallet = await tx.creditWallet.findUnique({
            where: { user_id: req.user!.id }
          });
          if (!wallet || wallet.credits < creditCost) {
            // propagate details in error message
            const avail = wallet ? wallet.credits : 0;
            throw new Error(`INSUFFICIENT:${avail}`);
          }
          await tx.creditWallet.update({
            where: { user_id: req.user!.id },
            data: {
              credits: { decrement: creditCost },
              total_spent: { increment: creditCost }
            }
          });

          // record the debit in the transaction ledger within the same
          // transaction so it only persists if the wallet update succeeds.
          await tx.transactionLedger.create({
            data: {
              userId: req.user!.id,
              amount: creditCost,
              type: 'debit',
              reason: 'ad_launch'
            }
          });
        });
      } catch (e: any) {
        if (e.message && e.message.startsWith('INSUFFICIENT:')) {
          const parts = e.message.split(':');
          const avail = Number(parts[1] || 0);
          return res.status(403).json({
            error: 'Insufficient credits',
            required: creditCost,
            available: avail
          });
        }
        throw e; // rethrow unexpected
      }
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const campaign = await prisma.adBoost.create({
      data: {
        user_id: req.user!.id,
        product_id: parseInt(product_id),
        boost_type: boost_type || 'standard',
        credits_spent: creditCost,
        status: 'active',
        is_admin_campaign: isAdmin,
        auto_boost: true,
        boost_intensity: 1,
        expires_at: expiresAt,
        campaign_config: {
          product_name: product.name,
          duration_hours: 24,
          auto_boost_enabled: true
        }
      }
    });

    res.json({
      success: true,
      message: isAdmin ? 'Campaign launched (Admin - FREE)' : 'Campaign launched successfully',
      campaign,
      credits_used: creditCost,
      expires_at: expiresAt
    });
  } catch (error: any) {
    console.error('Launch campaign error:', error);
    res.status(500).json({ error: error.message || 'Failed to launch campaign' });
  }
});

router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    
    const where: any = { 
      status: 'active',
      OR: [
        { expires_at: null },
        { expires_at: { gt: now } }
      ]
    };

    if (!req.user?.isAdmin) {
      where.user_id = req.user!.id;
    }

    const campaigns = await prisma.adBoost.findMany({
      where,
      orderBy: { started_at: 'desc' },
      take: 50
    });

    await prisma.adBoost.updateMany({
      where: {
        status: 'active',
        expires_at: { lt: now }
      },
      data: { status: 'expired' }
    });

    res.json({
      campaigns,
      total: campaigns.length,
      active_count: campaigns.filter(c => c.status === 'active').length
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get campaign status' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await prisma.adBoost.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!req.user?.isAdmin && campaign.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const product = campaign.product_id 
      ? await prisma.product.findUnique({
          where: { id: campaign.product_id },
          select: { id: true, name: true, image_url: true, affiliate_link: true }
        })
      : null;

    res.json({ campaign, product });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get campaign' });
  }
});

router.post('/:id/pause', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await prisma.adBoost.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!req.user?.isAdmin && campaign.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.adBoost.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'paused' }
    });

    res.json({ success: true, message: 'Campaign paused' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to pause campaign' });
  }
});

router.post('/:id/resume', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await prisma.adBoost.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!req.user?.isAdmin && campaign.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.adBoost.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'active' }
    });

    res.json({ success: true, message: 'Campaign resumed' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to resume campaign' });
  }
});

router.post('/:id/stop', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await prisma.adBoost.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!req.user?.isAdmin && campaign.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.adBoost.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'stopped' }
    });

    res.json({ success: true, message: 'Campaign stopped' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to stop campaign' });
  }
});

router.post('/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const product = await prisma.product.findUnique({
      where: { id: parseInt(product_id) }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const adText = await generateProductAd(product);

    await prisma.product.update({
      where: { id: parseInt(product_id) },
      data: { ai_generated_ad: adText }
    });

    res.json({
      success: true,
      product_id: product.id,
      ad_copy: adText
    });
  } catch (error: any) {
    console.error('Generate ad error:', error);
    res.status(500).json({ error: 'Failed to generate ad' });
  }
});

export default router;
