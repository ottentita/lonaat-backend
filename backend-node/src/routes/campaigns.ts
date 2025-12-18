import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest, creditCheckMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const CAMPAIGN_COST = 10;

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
  body('boost_type').notEmpty().withMessage('Boost type is required'),
  body('product_id').optional().isInt()
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { boost_type, product_id, config, duration_days } = req.body;
    const isAdminCampaign = req.user!.isAdmin;
    
    const creditCost = isAdminCampaign ? 0 : CAMPAIGN_COST;

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

    const expiresAt = duration_days 
      ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const campaign = await prisma.adBoost.create({
      data: {
        user_id: req.user!.id,
        product_id: product_id ? parseInt(product_id) : null,
        boost_type,
        credits_spent: creditCost,
        status: 'active',
        is_admin_campaign: isAdminCampaign,
        campaign_config: config || {},
        expires_at: expiresAt
      }
    });

    await prisma.transaction.create({
      data: {
        user_id: req.user!.id,
        type: 'campaign',
        amount: -creditCost,
        status: 'completed',
        description: `Campaign created: ${boost_type}`,
        extra_data: { campaign_id: campaign.id, is_admin: isAdminCampaign }
      }
    });

    res.status(201).json({ 
      message: 'Campaign created successfully',
      campaign,
      credits_used: creditCost
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
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
