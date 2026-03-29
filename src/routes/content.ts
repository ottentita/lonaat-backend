import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import crypto from 'crypto';

const router = Router();

// ============================================
// TRAFFIC-DRIVING CONTENT GENERATOR
// ============================================

// Helper function to generate traffic-driving content
function generateTrafficContent(productName: string, niche: string, price?: number, commission?: number) {
  // Emotional triggers based on niche
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

  // TikTok Script (15-30 seconds)
  const tiktokScript = {
    hook: `🔥 ${hook}! Watch this...`,
    body: `I found ${productName} and it's CRAZY good. ${niche === 'wealth' ? 'Making money' : niche === 'health' ? 'Feeling better' : 'Getting results'} has never been easier. Seriously, check this out.`,
    cta: `Link in bio! Don't wait, limited time only! 👆`
  };

  // WhatsApp Message (short and personal)
  const whatsappMessage = `Hey! 👋 Just found something amazing - ${productName}. Perfect for ${niche}. ${commission ? `I earn ${commission.toFixed(0)} XAF commission if you buy through my link` : 'Check it out'}. Want the link?`;

  // Story-style post (Instagram/Facebook)
  const storyPost = `✨ JUST DISCOVERED ✨\n\n${productName}\n\n${hook}! This is exactly what you need for ${niche}.\n\n${price ? `Only ${price.toFixed(0)} XAF` : 'Great price'}\n\nSwipe up to get it! 👆`;

  // Hashtags (trending + niche-specific)
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
    tiktokScript,
    whatsappMessage,
    storyPost,
    hashtags
  };
}

// POST /api/content/generate-traffic - Generate traffic-driving content
router.post('/generate-traffic', authMiddleware, async (req: AuthRequest, res) => {
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

    console.log('🚀 GENERATE TRAFFIC CONTENT:', { userId, productId, productName, niche });

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
    const content = generateTrafficContent(productName, niche, price, commission);

    // Generate tracking links (integrate with growth system)
    const trackingId = crypto.randomBytes(8).toString('hex');
    const baseUrl = process.env.APP_URL || 'http://localhost:4000';

    const trackingLink = {
      short: `${baseUrl}/r/${trackingId}?userId=${userId}&productId=${productId}`,
      landing: `${baseUrl}/api/growth/landing/${productId}/${userId}`
    };

    // Save to content history
    const savedContent = await prisma.content.create({
      data: {
        userId: String(userId),
        prompt: `Generate traffic content for ${productName} in ${niche} niche`,
        result: JSON.stringify({
          ...content,
          trackingLink,
          productId,
          productName,
          niche
        }),
        type: 'traffic-content'
      }
    });

    console.log('✅ TRAFFIC CONTENT GENERATED:', savedContent.id);

    return res.json({
      success: true,
      data: {
        tiktokScript: content.tiktokScript,
        whatsappMessage: content.whatsappMessage,
        storyPost: content.storyPost,
        hashtags: content.hashtags,
        trackingLink,
        productInfo: {
          id: productId,
          name: productName,
          price,
          commission,
          niche
        }
      },
      contentId: savedContent.id
    });

  } catch (error: any) {
    console.error('❌ GENERATE TRAFFIC CONTENT ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/content/save - Save generated content
router.post('/save', authMiddleware, async (req: AuthRequest, res) => {
  console.log('💾 SAVE CONTENT REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, result, type } = req.body;

    if (!prompt || !result || !type) {
      return res.status(400).json({ 
        error: 'Missing required fields: prompt, result, type' 
      });
    }

    console.log('📝 Saving content for user:', userId);
    console.log('📋 Type:', type);
    console.log('📏 Prompt length:', prompt.length);
    console.log('📏 Result length:', result.length);

    const content = await prisma.content.create({
      data: {
        userId,
        prompt,
        result,
        type
      }
    });

    console.log('✅ Content saved:', content.id);

    res.json({
      success: true,
      contentId: content.id,
      message: 'Content saved successfully'
    });

  } catch (error: any) {
    console.error('❌ Save content error:', error);
    res.status(500).json({ 
      error: 'Failed to save content',
      details: error.message 
    });
  }
});

// GET /api/content/history - Get user's content history
router.get('/history', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📚 GET CONTENT HISTORY REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, limit = 50, offset = 0 } = req.query;

    console.log('👤 User:', userId);
    console.log('🔍 Type filter:', type || 'all');
    console.log('📊 Limit:', limit, '| Offset:', offset);

    const where: any = { userId };
    if (type && type !== 'all') {
      where.type = type;
    }

    const [contents, total] = await Promise.all([
      prisma.content.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
        select: {
          id: true,
          prompt: true,
          result: true,
          type: true,
          createdAt: true
        }
      }),
      prisma.content.count({ where })
    ]);

    console.log('✅ Found', contents.length, 'contents out of', total, 'total');

    res.json({
      success: true,
      contents,
      total,
      limit: Number(limit),
      offset: Number(offset)
    });

  } catch (error: any) {
    console.error('❌ Get history error:', error);
    res.status(500).json({ 
      error: 'Failed to get content history',
      details: error.message 
    });
  }
});

// DELETE /api/content/:id - Delete a content item
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🗑️ DELETE CONTENT REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    console.log('🔍 Looking for content:', id);
    console.log('👤 User:', userId);

    // Verify ownership
    const content = await prisma.content.findUnique({
      where: { id }
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (content.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden - not your content' });
    }

    await prisma.content.delete({
      where: { id }
    });

    console.log('✅ Content deleted:', id);

    res.json({
      success: true,
      message: 'Content deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Delete content error:', error);
    res.status(500).json({ 
      error: 'Failed to delete content',
      details: error.message 
    });
  }
});

// GET /api/content/:id - Get single content item
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📄 GET SINGLE CONTENT REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const content = await prisma.content.findUnique({
      where: { id }
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (content.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden - not your content' });
    }

    console.log('✅ Content found:', id);

    res.json({
      success: true,
      content
    });

  } catch (error: any) {
    console.error('❌ Get content error:', error);
    res.status(500).json({ 
      error: 'Failed to get content',
      details: error.message 
    });
  }
});

export default router;
