import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest, creditCheckMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const CAMPAIGN_COST = 0;
const CAMPAIGN_DURATION_HOURS = 24;
const MAX_AI_BOOSTS_PER_DAY = 5;

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const where: any = {};
    
    if (!req.user!.isAdmin) {
      where.user_id = req.user!.id;
    }

    const campaigns = await prisma.adBoost.findMany({
      where,
      orderBy: { started_at: 'desc' },
      take: 50
    });

    res.json({ campaigns });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get campaigns' });
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

    if (!req.user!.isAdmin && campaign.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ campaign });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get campaign' });
  }
});

router.post('/', [
  authMiddleware,
  body('product_id').notEmpty().withMessage('Product ID is required').isInt()
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { product_id, boost_type } = req.body;
    const isAdminCampaign = req.user!.isAdmin;
    
    const creditCost = isAdminCampaign ? 0 : CAMPAIGN_COST;

    const product = await prisma.product.findUnique({
      where: { id: parseInt(product_id) }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!isAdminCampaign) {
      const wallet = await prisma.creditWallet.findUnique({
        where: { user_id: req.user!.id }
      });

      if (!wallet || wallet.credits < creditCost) {
        return res.status(403).json({ 
          error: 'Insufficient credits',
          required: creditCost,
          available: wallet?.credits || 0
        });
      }

      await prisma.creditWallet.update({
        where: { user_id: req.user!.id },
        data: {
          credits: { decrement: creditCost },
          total_spent: { increment: creditCost }
        }
      });
    }

    const expiresAt = new Date(Date.now() + CAMPAIGN_DURATION_HOURS * 60 * 60 * 1000);

    const campaign = await prisma.adBoost.create({
      data: {
        user_id: req.user!.id,
        product_id: parseInt(product_id),
        boost_type: boost_type || 'standard',
        credits_spent: creditCost,
        status: 'active',
        is_admin_campaign: isAdminCampaign,
        auto_boost: true,
        boost_intensity: 1,
        expires_at: expiresAt,
        campaign_config: { 
          product_name: product.name,
          duration_hours: CAMPAIGN_DURATION_HOURS,
          auto_boost_enabled: true
        }
      }
    });

    if (creditCost > 0) {
      await prisma.transaction.create({
        data: {
          user_id: req.user!.id,
          type: 'campaign',
          amount: -creditCost,
          status: 'completed',
          description: `Campaign launched for: ${product.name}`,
          extra_data: { campaign_id: campaign.id, is_admin: isAdminCampaign }
        }
      });
    }

    res.status(201).json({ 
      message: isAdminCampaign ? 'Campaign launched (FREE - Admin)' : 'Campaign launched successfully',
      campaign,
      credits_used: creditCost,
      expires_at: expiresAt,
      duration_hours: CAMPAIGN_DURATION_HOURS
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

router.post('/:id/click', async (req: AuthRequest, res: Response) => {
  try {
    const campaignId = parseInt(req.params.id);
    const campaign = await prisma.adBoost.findUnique({ where: { id: campaignId } });

    if (!campaign || campaign.status !== 'active') {
      return res.status(404).json({ error: 'Campaign not found or inactive' });
    }

    if (campaign.expires_at && new Date() > campaign.expires_at) {
      await prisma.adBoost.update({
        where: { id: campaignId },
        data: { status: 'expired' }
      });
      return res.status(400).json({ error: 'Campaign expired' });
    }

    const newClicks = campaign.clicks_received + 1;
    const newIntensity = Math.min(10, Math.floor(newClicks / 10) + 1);

    await prisma.adBoost.update({
      where: { id: campaignId },
      data: {
        clicks_received: newClicks,
        boost_intensity: newIntensity,
        total_impressions: { increment: 1 },
        last_boost_at: new Date()
      }
    });

    res.json({ 
      status: 'ok',
      clicks: newClicks,
      boost_intensity: newIntensity
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record click' });
  }
});

router.get('/active', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    
    const campaigns = await prisma.adBoost.findMany({
      where: {
        status: 'active',
        OR: [
          { expires_at: null },
          { expires_at: { gt: now } }
        ]
      },
      orderBy: { boost_intensity: 'desc' },
      take: 50
    });

    await prisma.adBoost.updateMany({
      where: {
        status: 'active',
        expires_at: { lt: now }
      },
      data: { status: 'expired' }
    });

    res.json({ campaigns, total: campaigns.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get active campaigns' });
  }
});

router.put('/:id/pause', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const campaignId = parseInt(req.params.id);
    const campaign = await prisma.adBoost.findUnique({ where: { id: campaignId } });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!req.user!.isAdmin && campaign.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.adBoost.update({
      where: { id: campaignId },
      data: { status: 'paused' }
    });

    res.json({ message: 'Campaign paused' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to pause campaign' });
  }
});

router.put('/:id/resume', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const campaignId = parseInt(req.params.id);
    const campaign = await prisma.adBoost.findUnique({ where: { id: campaignId } });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!req.user!.isAdmin && campaign.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.adBoost.update({
      where: { id: campaignId },
      data: { status: 'active' }
    });

    res.json({ message: 'Campaign resumed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resume campaign' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const campaignId = parseInt(req.params.id);
    const campaign = await prisma.adBoost.findUnique({ where: { id: campaignId } });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!req.user!.isAdmin && campaign.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.adBoost.update({
      where: { id: campaignId },
      data: { status: 'expired' }
    });

    res.json({ message: 'Campaign deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

export default router;
