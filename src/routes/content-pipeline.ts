import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// ============================================
// PHASE 3: AI CONTENT PIPELINE
// ============================================

// Helper function to generate content (same as traffic content generator)
function generateContentDraft(productName: string, niche: string, price?: number, commission?: number) {
  const emotionalTriggers: Record<string, string[]> = {
    health: ['Transform your life', 'Feel amazing', 'Get your energy back', 'Look younger'],
    wealth: ['Make money fast', 'Financial freedom', 'Earn while you sleep', 'Get rich'],
    relationships: ['Find true love', 'Save your marriage', 'Attract anyone', 'Be irresistible'],
    fitness: ['Get fit fast', 'Lose weight now', 'Build muscle quick', 'Transform your body'],
    beauty: ['Look stunning', 'Glow up', 'Be gorgeous', 'Turn heads'],
    tech: ['Latest tech', 'Game changer', 'Must have', 'Revolutionary'],
    default: ['Change your life', 'Amazing results', 'You need this', 'Don\'t miss out']
  };

  const triggers = emotionalTriggers[niche.toLowerCase()] || emotionalTriggers.default;
  const hook = triggers[Math.floor(Math.random() * triggers.length)];

  const tiktokScript = {
    hook: `🔥 ${hook}! Watch this...`,
    body: `I found ${productName} and it's CRAZY good. ${niche === 'wealth' ? 'Making money' : niche === 'health' ? 'Feeling better' : 'Getting results'} has never been easier. Seriously, check this out.`,
    cta: `Link in bio! Don't wait, limited time only! 👆`
  };

  const whatsappMessage = `Hey! 👋 Just found something amazing - ${productName}. Perfect for ${niche}. ${commission ? `I earn ${commission.toFixed(0)} XAF commission if you buy through my link` : 'Check it out'}. Want the link?`;

  const storyPost = `✨ JUST DISCOVERED ✨\n\n${productName}\n\n${hook}! This is exactly what you need for ${niche}.\n\n${price ? `Only ${price.toFixed(0)} XAF` : 'Great price'}\n\nSwipe up to get it! 👆`;

  const nicheHashtags: Record<string, string[]> = {
    health: ['#health', '#wellness', '#healthy', '#fitness', '#healthylifestyle'],
    wealth: ['#money', '#wealth', '#business', '#entrepreneur', '#makemoney'],
    relationships: ['#love', '#relationship', '#dating', '#romance', '#couples'],
    fitness: ['#fitness', '#gym', '#workout', '#fit', '#bodybuilding'],
    beauty: ['#beauty', '#makeup', '#skincare', '#beautytips', '#glowup'],
    tech: ['#tech', '#technology', '#gadgets', '#innovation', '#techreview'],
    default: ['#trending', '#viral', '#musthave', '#amazing', '#deals']
  };

  const baseHashtags = ['#affiliate', '#recommendation', '#review'];
  const specificHashtags = nicheHashtags[niche.toLowerCase()] || nicheHashtags.default;
  const hashtags = [...baseHashtags, ...specificHashtags].join(' ');

  return {
    script: tiktokScript,
    message: whatsappMessage,
    story: storyPost,
    hashtags
  };
}

// POST /api/content-pipeline/generate - Generate content and save as draft
router.post('/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId, productName, niche } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!productId || !productName || !niche) {
      return res.status(400).json({
        success: false,
        error: 'productId, productName, and niche are required'
      });
    }

    console.log('🎨 GENERATE CONTENT DRAFT:', { userId, productId, productName, niche });

    // Get product details
    const product = await prisma.offers.findUnique({
      where: { id: Number(productId) }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const price = product.payout ? Number(product.payout) : 0;
    const commission = price * 0.98;

    // Generate content
    const content = generateContentDraft(productName, niche, price, commission);

    // Generate tracking links
    const trackingId = crypto.randomBytes(8).toString('hex');
    const baseUrl = process.env.APP_URL || 'http://localhost:4000';

    const trackingLink = {
      short: `${baseUrl}/r/${trackingId}?userId=${userId}&productId=${productId}`,
      landing: `${baseUrl}/api/growth/landing/${productId}/${userId}`
    };

    // Save as DRAFT
    const draft = await prisma.content.create({
      data: {
        userId: String(userId),
        prompt: `Generate content for ${productName} in ${niche} niche`,
        result: JSON.stringify({
          ...content,
          trackingLink,
          productId,
          productName,
          niche,
          status: 'draft' // DRAFT status
        }),
        type: 'content-draft'
      }
    });

    console.log('✅ CONTENT DRAFT CREATED:', draft.id);

    return res.json({
      success: true,
      data: {
        draftId: draft.id,
        script: content.script,
        message: content.message,
        story: content.story,
        hashtags: content.hashtags,
        trackingLink,
        productInfo: {
          id: productId,
          name: productName,
          price,
          commission,
          niche
        },
        status: 'draft'
      }
    });

  } catch (error: any) {
    console.error('❌ GENERATE CONTENT DRAFT ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/content-pipeline/:id/edit - Edit draft content
router.put('/:id/edit', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { script, message, story, hashtags } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    console.log('✏️ EDIT CONTENT DRAFT:', { userId, draftId: id });

    // Get existing draft
    const draft = await prisma.content.findUnique({
      where: { id }
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: 'Draft not found'
      });
    }

    if (draft.userId !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to edit this draft'
      });
    }

    // Parse existing content
    const existingContent = JSON.parse(draft.result);

    // Update with new values
    const updatedContent = {
      ...existingContent,
      script: script || existingContent.script,
      message: message || existingContent.message,
      story: story || existingContent.story,
      hashtags: hashtags || existingContent.hashtags,
      status: 'draft' // Keep as draft
    };

    // Save updated draft
    const updated = await prisma.content.update({
      where: { id },
      data: {
        result: JSON.stringify(updatedContent)
      }
    });

    console.log('✅ DRAFT UPDATED:', id);

    return res.json({
      success: true,
      data: {
        draftId: id,
        ...updatedContent
      }
    });

  } catch (error: any) {
    console.error('❌ EDIT DRAFT ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/content-pipeline/:id/approve - Approve draft for publishing
router.post('/:id/approve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    console.log('✅ APPROVE CONTENT DRAFT:', { userId, draftId: id });

    // Get draft
    const draft = await prisma.content.findUnique({
      where: { id }
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: 'Draft not found'
      });
    }

    if (draft.userId !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to approve this draft'
      });
    }

    // Parse and update status
    const content = JSON.parse(draft.result);
    content.status = 'approved';
    content.approvedAt = new Date().toISOString();

    // Update draft
    const approved = await prisma.content.update({
      where: { id },
      data: {
        result: JSON.stringify(content),
        type: 'content-approved' // Change type to approved
      }
    });

    console.log('✅ DRAFT APPROVED:', id);

    return res.json({
      success: true,
      data: {
        draftId: id,
        status: 'approved',
        approvedAt: content.approvedAt,
        content
      }
    });

  } catch (error: any) {
    console.error('❌ APPROVE DRAFT ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/content-pipeline/drafts - Get all user drafts
router.get('/drafts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    console.log('📋 GET CONTENT DRAFTS:', { userId, status });

    const where: any = {
      userId: String(userId),
      type: { in: ['content-draft', 'content-approved'] }
    };

    const drafts = await prisma.content.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Parse and filter by status if provided
    let parsedDrafts = drafts.map(draft => ({
      id: draft.id,
      createdAt: draft.createdAt,
      ...JSON.parse(draft.result)
    }));

    if (status) {
      parsedDrafts = parsedDrafts.filter(d => d.status === status);
    }

    console.log(`✅ Found ${parsedDrafts.length} drafts`);

    return res.json({
      success: true,
      data: {
        drafts: parsedDrafts,
        total: parsedDrafts.length
      }
    });

  } catch (error: any) {
    console.error('❌ GET DRAFTS ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
