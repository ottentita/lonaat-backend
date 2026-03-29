import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { maybeAuth } from '../middleware/maybeAuth'
import aiManager from '../services/ai.manager'
import prisma from '../prisma'
import { generateAffiliateContent } from '../services/ai.service'
import aiController from '../ai/aiController'
import { validate } from '../middleware/validation'
import { earningsPredictionSchema } from '../schemas/requestSchemas'

const router = Router()
// In-memory fallback for content drafts when test Prisma schema omits the model
const inMemoryDrafts: Record<number, any[]> = {}

// Health check for AI routes (protected)
router.get('/health', authMiddleware, async (req: AuthRequest, res) => {
  return res.json({ status: 'ok', ai: 'mounted' })
})

// DISABLED DUPLICATE: /generate-content is handled by ai-generate.ts (mounted first)
// Keeping unique endpoints only: /health, /my-content, /quick-generate, /:feature, /recommendations, /earnings-prediction, /status, /test
/*
router.post('/generate-content', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🤖 AI GENERATE-CONTENT REQUEST (WITH AUTH)');
  try {
    console.log('🤖 AI GENERATE-CONTENT REQUEST');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

    // Make userId optional for testing
    const userId = req.user?.id || 'test-user-id'

    const { offerId, affiliate_link, description, audience, product, platform } = req.body || {}
    
    // Support both old format (offerId) and new format (product)
    if (!offerId && !product) {
      return res.status(400).json({ 
        error: 'Either offerId or product object required',
        received: Object.keys(req.body)
      })
    }
    
    // If using new format with product object, generate simple response
    if (product && platform) {
      console.log('✅ Using new format with product object');
      const mockContent = {
        script: `Check out ${product.title || 'this amazing product'}! ${product.description || ''}`,
        hook: `🔥 ${product.title || 'Amazing product'} alert!`,
        cta: 'Get it now!',
        hashtags: '#affiliate #product #musthave'
      };

      // Save to database
      let content: any = null
      try {
        const userId = req.user?.id || 'anonymous'
        const prompt = `Generate ${platform} content for product: ${product.title}\nDescription: ${product.description}\nPrice: ${product.price}\nCommission: ${product.commission}`
        const result = JSON.stringify({
          ...mockContent,
          platform,
          productInfo: product
        })
        
        content = await prisma.content.create({
          data: {
            userId,
            prompt,
            result,
            type: platform
          }
        })
        
        console.log('✅ New format AI Content saved to database:', content.id)
      } catch (error) {
        console.error('❌ Failed to save new format AI content:', error)
      }
      
      console.log("Generated + Saved:", content?.id);
      
      return res.json({
        success: true,
        content: JSON.stringify(mockContent),
        saved: !!content,
        id: content?.id
      });
    }
    
    if (!offerId) return res.status(400).json({ error: 'offerId required for legacy format' })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    // Admin users bypass token check
    if (user.role === 'admin') {
      console.log('🔓 Admin user bypassing token check');
    } else {
      const wallet = await prisma.adTokenWallet.findUnique({ where: { userId } })
      const tokenCost = 1
      if (!wallet || wallet.balance < tokenCost) return res.status(402).json({ error: 'Insufficient tokens' })
    }

    const offer = await prisma.offer.findUnique({ where: { id: Number(offerId) } })
    const productName = offer?.name || 'Product'

    const aiResult = await generateAffiliateContent({ productName, description: description || offer?.description || 'Check this out', audience: audience || 'everyone' })

    // Save AI content to persistent Content model
    let content: any = null
    try {
      const prompt = `Generate ${platform} content for product: ${productName}\nDescription: ${description || offer?.description || 'Check this out'}\nAudience: ${audience || 'everyone'}`
      const result = JSON.stringify({
        hooks: aiResult.hooks,
        script: aiResult.script,
        caption: aiResult.caption,
        hashtags: aiResult.hashtags,
        platform,
        productInfo: {
          name: productName,
          description: description || offer?.description,
          audience: audience || 'everyone'
        }
      })
      
      content = await prisma.content.create({
        data: {
          userId,
          prompt,
          result,
          type: platform // tiktok, ad, youtube, story
        }
      })
      
      console.log('✅ AI Content saved to database:', content.id)
    } catch (error) {
      console.error('❌ Failed to save AI content:', error)
      // Continue without saving - don't block the response
    }

    await prisma.adTokenWallet.update({ where: { userId }, data: { balance: { decrement: tokenCost } } })
    if ((prisma as any).aiUsage && typeof (prisma as any).aiUsage.create === 'function') {
      await (prisma as any).aiUsage.create({ data: { userId, tokensUsed: tokenCost } })
    }

    const updatedWallet = await prisma.adTokenWallet.findUnique({ where: { userId } })

    console.log("Generated + Saved:", content?.id);

    return res.json({ 
      success: true, 
      content: JSON.stringify(aiResult), 
      saved: !!content,
      id: content?.id
    })
  } catch (error: any) {
    console.error('Generate content error:', error)
    return res.status(500).json({ error: error.message || 'Failed to generate content' })
  }
})

*/

// Get all content drafts for user (legacy compatibility)
router.get('/my-content', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    let dbDrafts: any[] = []
    try {
      if ((prisma as any).contentDraft && typeof (prisma as any).contentDraft.findMany === 'function') {
        dbDrafts = await (prisma as any).contentDraft.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, email: true } } } })
      }
    } catch { /* table may not exist */ }

    // Merge DB drafts with in-memory quick-generate drafts
    const memDrafts = inMemoryDrafts[userId] || []
    const drafts = [...memDrafts, ...dbDrafts]

    return res.json({ success: true, count: drafts.length, drafts })
  } catch (error: any) {
    console.error('Get content error:', error)
    return res.status(500).json({ error: error.message || 'Failed to retrieve content' })
  }
})

// Quick content generation — lightweight endpoint for dashboard UI
// Does not require offers or token wallets; calls generateAffiliateContent directly.
router.post('/quick-generate', authMiddleware, async (req: AuthRequest & any, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { productName, description, audience } = req.body || {}
    if (!productName) return res.status(400).json({ error: 'productName is required' })

    const content = await generateAffiliateContent({
      productName,
      description: description || 'Check this out',
      audience: audience || 'everyone',
    })

    // Store in memory for retrieval via /my-content
    const draft = {
      id: `qg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId,
      productName,
      hooks: content.hooks,
      script: content.script,
      caption: content.caption,
      hashtags: content.hashtags.join(' '),
      status: 'generated',
      createdAt: new Date(),
    }
    inMemoryDrafts[userId] = inMemoryDrafts[userId] || []
    inMemoryDrafts[userId].unshift(draft)

    return res.json({ success: true, draftId: draft.id, content })
  } catch (error: any) {
    console.error('Quick generate error:', error)
    return res.status(500).json({ error: error.message || 'Failed to generate content' })
  }
})

// Centralized AI feature runner (catch-all for mounted features)
router.post('/:feature', authMiddleware, async (req: AuthRequest & any, res) => {
  try {
    const featureName = req.params.feature
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const payload = req.body || {}
    // allow per-request dry-run via header or query param
    const headerDry = String(req.header('x-ai-dry-run') || '').toLowerCase() === 'true'
    const queryDry = String((req.query && req.query.dry) || '').toLowerCase() === 'true'
    const dry = headerDry || queryDry
    const result = await aiManager.runFeature(userId, featureName, payload, { dry })
    return res.json(result)
  } catch (err: any) {
    console.error('AI routes error:', err)
    return res.status(400).json({ error: err.message || 'AI feature failed' })
  }
})

// Recommendations (allow dev bypass)
router.get('/recommendations', maybeAuth, async (req: any, res: any) => {
  try {
    const recs = await aiController.getRecommendations()
    return res.json({ recommendations: recs })
  } catch (err: any) {
    console.error('AI recommendations error:', err)
    return res.status(500).json({ error: err.message || 'AI error' })
  }
})

// Earnings prediction (allow dev bypass and validate query)
router.get('/earnings-prediction', maybeAuth, validate(earningsPredictionSchema, 'query'), async (req: any, res: any) => {
  try {
    const offerId = Number(req.query.offerId)
    const clicks = Number(req.query.clicks)
    let userId = req.user?.userId
    if (!userId && process.env.NODE_ENV === 'development') {
      const fallback = await prisma.user.findFirst()
      userId = fallback?.id
    }
    if (!offerId || !clicks || !userId) return res.status(400).json({ error: 'offerId, clicks and auth required' })
    const result = await aiController.earningsPrediction(userId, offerId, clicks)
    return res.json(result)
  } catch (err: any) {
    console.error('AI earnings-prediction error:', err)
    return res.status(500).json({ error: err.message || 'AI error' })
  }
})

// Mock AI content generation function for the new endpoint
function generateMockContent(productTitle: string, productDescription: string, platform: 'tiktok' | 'youtube' | 'instagram') {
  const platformSpecific = {
    tiktok: {
      hooks: [
        `Stop scrolling! This ${productTitle} is changing the game! 🚀`,
        `You won't believe what this ${productTitle} can do! 🤯`,
        `POV: You just discovered the ${productTitle} 🎯`,
        `This ${productTitle} sold out in 5 minutes... here's why! ⏰`,
        `The ${productTitle} everyone's talking about! 🔥`
      ],
      script: `🎵 (Upbeat trending music starts)

🗣️ "Yo! Stop what you're doing! 

You NEED to see this ${productTitle}! 

${productDescription}

Watch this! (demonstrate product)

Mind blown! Right?! 

Link in bio! GO! 

🎵 (Music fades with call to action)`,
      caption: `🔥 This ${productTitle} is absolutely INSANE! 🤯 ${productDescription} 

Get yours before they're gone! 

👇 Tap the link in bio! 

#tiktokmademebuyit #viral #fyp #${productTitle.toLowerCase().replace(/\s+/g, '')}`,
      hashtags: ['#tiktokmademebuyit', '#viral', '#fyp', '#trending', '#musthave', `#${productTitle.toLowerCase().replace(/\s+/g, '')}`]
    },
    youtube: {
      hooks: [
        `The ${productTitle} That Changed Everything - You Won't Believe This!`,
        `Is This ${productTitle} Worth The Hype? Honest Review & Demo!`,
        `This ${productTitle} Sold Out Worldwide - Here's Why!`,
        `I Tested The ${productTitle} For 30 Days - Results Shocked Me!`,
        `The ${productTitle} They Don't Want You To Know About!`
      ],
      script: `🎬 (Intro music with dynamic visuals)

🗣️ "What's up everyone! Welcome back to the channel!

Today we're diving deep into the ${productTitle} - 
and trust me, this is something you need to see.

${productDescription}

(Detailed demonstration with close-ups)

Let me show you exactly how this works...

(Feature breakdown)

The results? Absolutely incredible!

(Performance testing)

Should you buy it? Stick around for my final verdict!

🎬 (Outro with subscribe reminder)`,
      caption: `🎥 FULL REVIEW: The ${productTitle} That's Taking Over! 

${productDescription}

In this video, I test everything you need to know before buying!

🔔 Subscribe for more honest reviews!

👇 Check it out here: 

#youtube #review #tech #${productTitle.toLowerCase().replace(/\s+/g, '')} #unboxing`,
      hashtags: ['#youtube', '#review', '#techreview', '#unboxing', '#productreview', `#${productTitle.toLowerCase().replace(/\s+/g, '')}`]
    },
    instagram: {
      hooks: [
        `✨ This ${productTitle} has my heart! 💕`,
        `Obsessed with this ${productTitle}! 🌟`,
        `Your ${productTitle} is waiting for you! 🎁`,
        `Life-changing ${productTitle} alert! 🚨`,
        `This ${productTitle} = INSTANT happiness! 😊`
      ],
      script: `📸 (Aesthetic product shots with transitions)

🗣️ "Had to share this find with you all!

This ${productTitle} is absolutely everything! 

${productDescription}

Perfect for [use case]

I'm genuinely obsessed! 

You need this in your life! 

📸 (Final beauty shot with call to action)`,
      caption: `✨ OBSESSED is an understatement! 

This ${productTitle} is everything I've been looking for! 

${productDescription}

Perfect for daily use! 💕

🛍️ Available now - link in bio!

📸 Tag someone who needs this!

#instagram #instagood #shopping #${productTitle.toLowerCase().replace(/\s+/g, '')} #lifestyle #musthave`,
      hashtags: ['#instagram', '#instagood', '#shopping', '#lifestyle', '#musthave', '#aesthetic', `#${productTitle.toLowerCase().replace(/\s+/g, '')}`]
    }
  };

  return platformSpecific[platform];
}

// DISABLED DUPLICATE: /generate is handled by ai-generate.ts (mounted first)
/*
router.post('/generate', maybeAuth, async (req: any, res) => {
  console.log('Generate endpoint called, NODE_ENV:', process.env.NODE_ENV);
  try {
    const { productTitle, productDescription, platform } = req.body;

    // Validation
    if (!productTitle || !productDescription || !platform) {
      return res.status(400).json({
        error: 'Missing required fields: productTitle, productDescription, platform'
      });
    }

    if (!['tiktok', 'youtube', 'instagram'].includes(platform)) {
      return res.status(400).json({
        error: 'Invalid platform. Must be: tiktok, youtube, or instagram'
      });
    }

    // Generate content using mock AI
    const generatedContent = generateMockContent(productTitle, productDescription, platform);

    // Return success response
    res.json({
      success: true,
      data: {
        hooks: generatedContent.hooks,
        script: generatedContent.script,
        caption: generatedContent.caption,
        hashtags: generatedContent.hashtags
      },
      metadata: {
        productTitle,
        productDescription,
        platform,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('AI generation error:', error);
    res.status(500).json({
      error: 'Failed to generate content',
      details: error.message
    });
  }
});

*/

// GET /api/ai/status - Check if AI service is available
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    service: 'mock-ai',
    platforms: ['tiktok', 'youtube', 'instagram'],
    features: ['hooks', 'script', 'caption', 'hashtags'],
    nodeEnv: process.env.NODE_ENV
  });
});

// GET /api/ai/test - Simple test endpoint without auth
router.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working',
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

export default router
