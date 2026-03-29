import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { authenticate } from '../middleware/auth'
import { requireTokens } from '../middleware/tokenGuard'
import { premiumGuard } from '../middleware/premiumGuard'
import { validate } from '../middleware/validation'
import { earningsPredictionSchema } from '../schemas/requestSchemas'
import aiController from '../ai/aiController'
import prisma from '../prisma'
import { generateAffiliateContent } from '../services/ai.service'
import { finalizeTokens, releaseTokens } from '../services/tokenService'

const router = Router()

// Middleware that uses auth in non-dev, but allows anonymous access in development.
const maybeAuth = (req: any, res: any, next: any) => {
  console.log('ai.ts maybeAuth called, NODE_ENV:', process.env.NODE_ENV);
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode detected, skipping authentication');
    return next();
  }
  console.log('Production mode, requiring authentication');
  return (authMiddleware as any)(req, res, next)
}

// Analyze user
router.get('/analyze-user/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const uid = Number(req.params.userId)
    const report = await aiController.analyzeUser(uid)
    return res.json(report)
  } catch (err: any) {
    console.error('AI analyze-user error', err)
    return res.status(500).json({ error: err.message || 'AI error' })
  }
})

// Test route protected by token guard (deducts 5 tokens)
router.post(
  '/generate-ai-content-test',
  authenticate,
  requireTokens(5),
  async (req: AuthRequest & any, res) => {
    res.json({ message: 'AI content generated (test)', success: true })
  },
)

// Generate ad blueprint
router.get('/generate-ad/:productId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const pid = Number(req.params.productId)
    const ad = await aiController.generateAd(pid)
    return res.json(ad)
  } catch (err: any) {
    console.error('AI generate-ad error', err)
    return res.status(500).json({ error: err.message || 'AI error' })
  }
})

// Example script generation endpoint utilizing premiumGuard
router.post(
  '/generate-script',
  authMiddleware,
  premiumGuard('SCRIPT_GENERATION', 5),
  async (req: AuthRequest & any, res) => {
    try {
      const result = await aiController.generateScript(req.body)
      await finalizeTokens(req.user.id, 5, 'SCRIPT_GENERATION')
      res.json(result)
    } catch (error: any) {
      await releaseTokens(req.user.id, 5, 'SCRIPT_GENERATION')
      res.status(500).json({ error: 'Generation failed' })
    }
  }
)

// Commission analysis
router.get('/commission-analysis/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const uid = Number(req.params.userId)
    const pending = await (await import('../prisma')).default.commission.findMany({ where: { user_id: uid, status: 'pending' } })
    const releaseProb = 0.75
    const flagged = pending.filter(p => (p as any).approved_by == null)
    return res.json({ pendingCount: pending.length, releaseProbability: releaseProb, flaggedDelayed: flagged.length })
  } catch (err: any) {
    console.error('commission-analysis error', err)
    return res.status(500).json({ error: err.message || 'AI error' })
  }
})

// Offer recommendations
router.get('/recommendations', maybeAuth, async (req: AuthRequest, res) => {
  try {
    const recs = await aiController.getRecommendations()
    return res.json({ recommendations: recs })
  } catch (err: any) {
    console.error('AI recommendations error', err)
    return res.status(500).json({ error: err.message || 'AI error' })
  }
})

// Earnings prediction for a given offer and projected clicks
router.get('/earnings-prediction', maybeAuth, validate(earningsPredictionSchema, 'query'), async (req: AuthRequest, res) => {
  try {
    const offerId = Number(req.query.offerId)
    const clicks = Number(req.query.clicks)
    let userId = req.user?.userId
    // In development mode, allow anonymous requests by using a fallback user if none provided
    if (!userId && process.env.NODE_ENV === 'development') {
      const fallback = await prisma.user.findFirst()
      userId = fallback?.id
    }
    if (!offerId || !clicks || !userId) {
      return res.status(400).json({ error: 'offerId, clicks and auth required' })
    }
    const result = await aiController.earningsPrediction(userId, offerId, clicks)
    return res.json(result)
  } catch (err: any) {
    console.error('AI earnings-prediction error', err)
    return res.status(500).json({ error: err.message || 'AI error' })
  }
})

// Generate content for an offer
// Plan rules:
// - free plan: 1 generation allowed per request (1 token deducted)
// - pro plan: batch generation allowed with advanced variations (1 token per generation)
router.post('/generate-content', authMiddleware, premiumGuard('CONTENT_GEN', 1), async (req: AuthRequest & any, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { offerId, affiliate_link, description, audience } = req.body
    if (!offerId) {
      return res.status(400).json({ error: 'offerId required' })
    }

    // Fetch user and check ad token wallet balance (tests use adTokenWallet)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const wallet = await prisma.adTokenWallet.findUnique({ where: { userId } })
    const tokenCost = 1
    if (!wallet || wallet.balance < tokenCost) {
      return res.status(402).json({ error: 'Insufficient tokens' })
    }

    // Generate content using OpenAI
    const offer = await prisma.offer.findUnique({ where: { id: offerId } })
    const productName = offer?.name || 'Product'
    
    const aiResult = await generateAffiliateContent({
      productName,
      description: description || offer?.description || 'Check this out',
      audience: audience || 'everyone'
    })

    // Save content draft

    // deduct tokens after successful generation (update adTokenWallet)
    try {
      await prisma.adTokenWallet.update({ where: { userId }, data: { balance: { decrement: tokenCost } } })
    } catch (tokenErr) {
      console.error('token finalize error', tokenErr)
    }
    const draft = await prisma.contentDraft.create({
      data: {
        userId,
        offerId,
        hooks: JSON.stringify(aiResult.hooks),
        script: aiResult.script,
        caption: aiResult.caption,
        hashtags: aiResult.hashtags.join(' '),
        status: 'generated'
      }
    })

    // Deduct tokens
    // Log AI usage
    await prisma.aiUsage.create({ data: { userId, tokensUsed: tokenCost } })

    // fetch updated wallet balance for remainingTokens
    const updatedWallet = await prisma.adTokenWallet.findUnique({ where: { userId } })

    return res.json({ success: true, draftId: draft.id, content: aiResult, remainingTokens: updatedWallet ? updatedWallet.balance : null })
  } catch (error: any) {
    console.error('Generate content error:', error)
    return res.status(500).json({ error: error.message || 'Failed to generate content' })
  }
})

// Get all content drafts for the user
router.get('/my-content', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const drafts = await prisma.contentDraft.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } }
      }
    })

    return res.json({
      success: true,
      count: drafts.length,
      drafts
    })
  } catch (error: any) {
    console.error('Get content error:', error)
    return res.status(500).json({ error: error.message || 'Failed to retrieve content' })
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

// POST /api/ai/generate - New simplified content generation endpoint
router.post('/generate', maybeAuth, async (req: any, res) => {
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

// POST /api/ai/generate-content - Generate AI content for products (no auth required for now)
router.post('/generate-content', async (req: any, res) => {
  try {
    const { product, platform, niche } = req.body;

    if (!product || !platform) {
      return res.status(400).json({ error: "Product and platform are required" });
    }

    const { title, description, price, commission } = product;
    const commissionAmount = price && commission ? (price * commission / 100).toFixed(2) : "0";

    let content: any = {};

    // Viral hooks based on niche
    const viralHooks: any = {
      'make-money': [
        `"I made $${commissionAmount} promoting this... here's how 💰"`,
        `"This ${title} is literally printing money 🤑"`,
        `"POV: You discover how to earn $${commissionAmount} per sale 💸"`
      ],
      'fitness': [
        `"This ${title} changed my body in 30 days... 😱"`,
        `"Nobody talks about ${title} but it WORKS 💪"`,
        `"The fitness secret nobody tells you about 🔥"`
      ],
      'tech': [
        `"This ${title} is the future... and nobody knows yet 🚀"`,
        `"Tech companies don't want you to know about this 😳"`,
        `"I tested ${title} for 30 days... mind blown 🤯"`
      ],
      'business': [
        `"This ${title} 10x'd my productivity overnight 📈"`,
        `"Every entrepreneur needs ${title} (here's why) 💼"`,
        `"The business tool that changed everything for me 🎯"`
      ]
    };

    const selectedNiche = niche || 'make-money';
    const hooks = viralHooks[selectedNiche] || viralHooks['make-money'];
    const randomHook = hooks[Math.floor(Math.random() * hooks.length)];

    switch (platform.toLowerCase()) {
      case 'tiktok':
      case 'youtube-shorts':
        content = {
          hook: randomHook,
          script: `🔥 STOP SCROLLING! 🔥\n\nYou NEED to see this...\n\n${title} just dropped and it's INSANE! 💯\n\n${description || 'This is the real deal, no cap'}\n\n💰 Only $${price}\n✨ I earn $${commissionAmount} per sale\n\nLink in bio! 👆 Don't sleep on this!`,
          cta: "Link in bio - grab it before it's gone! 🔥",
          hashtags: "#${selectedNiche.replace('-', '')} #affiliate #viral #fyp #trending #musthave",
          postInstructions: {
            bestTime: "6-9 PM (peak engagement)",
            linkPlacement: "In bio or first comment",
            format: "15-30 second video with trending audio"
          }
        };
        break;

      case 'instagram':
      case 'instagram-reels':
        content = {
          hook: randomHook,
          caption: `✨ ${title} ✨\n\nThis is NOT a drill... 🚨\n\n${description || 'Game-changing product alert!'}\n\n💵 Price: $${price}\n💰 My cut: $${commissionAmount}\n\nLink in bio! 👆 Tag someone who needs this!`,
          script: `First 3 seconds: Show product dramatically\n\nHook: ${randomHook}\n\nBody: Demonstrate key features\n\nCTA: "Link in bio - don't miss out!"`,
          hashtags: "#${selectedNiche.replace('-', '')} #reels #viral #trending #affiliate",
          postInstructions: {
            bestTime: "11 AM - 1 PM or 7-9 PM",
            linkPlacement: "In bio (update link)",
            format: "Reels 15-30 seconds with trending audio"
          }
        };
        break;

      case 'youtube':
        content = {
          hook: randomHook,
          title: `${title} - Brutally Honest Review (Worth $${price}?)`,
          script: `INTRO (0-3 sec): ${randomHook}\n\nHOOK (3-10 sec): "I spent $${price} on ${title} so you don't have to..."\n\nBODY (10-45 sec):\n- Unboxing/First impressions\n- ${description || 'Key features demonstration'}\n- Pros and cons\n- Real results\n\nCTA (45-60 sec): "Link below - use my code for best price!"`,
          description: `${title} Review\n\n${description || 'Full breakdown'}\n\n⏰ Timestamps:\n0:00 - Intro\n0:03 - First Impressions\n0:15 - Features\n0:35 - Verdict\n\n💰 Price: $${price}\n🔗 Get it: [YOUR AFFILIATE LINK]\n\n#${selectedNiche.replace('-', '')} #review #shorts`,
          cta: "Link in description! Subscribe for honest reviews!",
          postInstructions: {
            bestTime: "2-4 PM or 8-10 PM",
            linkPlacement: "First line of description",
            format: "60 second Shorts or 3-5 min full video"
          }
        };
        break;

      default:
        content = {
          generic: `Check out ${title}!\n\n${description || 'Amazing product'}\n\nPrice: $${price}\nCommission: $${commissionAmount}\n\nGet it now!`
        };
    }

    res.json({
      success: true,
      platform,
      content,
      product: { title, price, commission }
    });
  } catch (error: any) {
    console.error("AI content generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate content" });
  }
});

// GET /api/ai/status - Check if AI service is available
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    service: 'mock-ai',
    platforms: ['tiktok', 'youtube', 'instagram'],
    features: ['hooks', 'script', 'caption', 'hashtags']
  });
});

// POST /api/ai/generate - Ollama integration for AI content generation
router.post('/generate-ollama', async (req, res) => {
  console.log('🤖 OLLAMA GENERATE REQUEST');
  
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
    console.log('🔗 Calling Ollama at http://localhost:11434/api/generate');

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3",
        prompt,
        stream: false
      })
    });

    if (!response.ok) {
      console.error('❌ Ollama API error:', response.status);
      return res.status(500).json({ error: 'Ollama API request failed' });
    }

    const data = await response.json();
    console.log('✅ Ollama response received');

    res.json({ 
      success: true,
      content: data.response,
      model: 'llama3'
    });

  } catch (error: any) {
    console.error('❌ Ollama generation error:', error);
    res.status(500).json({ 
      error: 'AI generation failed',
      details: error.message,
      suggestion: 'Ensure Ollama is running on port 11434'
    });
  }
});

export default router
