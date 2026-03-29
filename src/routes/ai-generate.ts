import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import prisma from '../prisma'
import { generateAffiliateContent } from '../services/ai.service'

const router = Router()

// AI Generation Handler
async function handleAIGeneration(req: AuthRequest, res: any) {
  console.log('🤖 UNIFIED AI GENERATE REQUEST');
  console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const { prompt, platform = 'tiktok', product, productId } = req.body || {};

    if (!prompt && !product && !productId) {
      return res.status(400).json({ 
        success: false,
        error: 'Either prompt, product object, or productId required' 
      });
    }

    // TOKEN VALIDATION
    const TOKEN_COST = 1;
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { tokenBalance: true, role: true }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Admin users bypass token check
    if (user.role !== 'admin') {
      if (user.tokenBalance < TOKEN_COST) {
        return res.status(402).json({ 
          success: false, 
          error: 'Insufficient tokens. Required: ' + TOKEN_COST + ', Available: ' + user.tokenBalance 
        });
      }
    }

    // Get product details if productId provided
    let productDetails = product;
    if (productId && !product) {
      const productRecord = await prisma.product.findUnique({
        where: { id: productId }
      });
      
      if (!productRecord) {
        return res.status(404).json({ 
          success: false, 
          error: 'Product not found' 
        });
      }
      
      productDetails = {
        id: productRecord.id,
        title: productRecord.name,
        description: productRecord.description,
        price: productRecord.price,
        affiliateLink: productRecord.affiliateLink
      };
    }

    // Generate content
    let generatedContent: any;
    let finalPrompt: string;

    if (productDetails) {
      // Product-based generation with platform-specific content
      finalPrompt = `Generate ${platform} content for product: ${productDetails.title || 'this amazing product'}\nDescription: ${productDetails.description || ''}\nPrice: ${productDetails.price || 'N/A'}\nCommission: Available`;
      
      const title = productDetails.title || 'this amazing product';
      const desc = productDetails.description || 'Check this out';
      const price = productDetails.price || 0;
      
      // Platform-specific content generation
      if (platform === 'tiktok') {
        generatedContent = {
          hook: `🔥 Stop scrolling! You NEED to see this ${title}!`,
          script: `Okay so I just found ${title} and I'm OBSESSED! 😍\n\n${desc}\n\nAnd get this - it's only $${price}! I was skeptical at first but after trying it, I'm blown away. The results speak for themselves.\n\nLink in bio if you want to check it out! 🔗`,
          caption: `This ${title} changed everything for me! 💯 ${desc} Worth every penny at $${price}. Link in bio! 🔗✨`,
          cta: `Tap the link in my bio to get yours before they sell out! 🚀`,
          hashtags: '#tiktokmademebuyit #amazonfinds #musthave #viral #fyp #productreview #worthit #gamechanger',
          affiliateLink: productDetails.affiliateLink
        };
      } else if (platform === 'youtube-shorts' || platform === 'youtube') {
        generatedContent = {
          hook: `The ${title} That Changed Everything - My Honest Review`,
          script: `[INTRO]\nHey everyone! Today I'm reviewing ${title} and honestly, I wish I found this sooner.\n\n[MAIN CONTENT]\n${desc}\n\nAt $${price}, I was hesitant, but after using it, I can confidently say it's worth every cent. The quality exceeded my expectations.\n\n[RESULTS]\nAfter using it for a week, I noticed significant improvements. This isn't just hype - it actually works.\n\n[CTA]\nLink in description if you want to grab one for yourself!`,
          caption: `Honest review of ${title}! ${desc} Full breakdown in the video. Link in description! 👇`,
          cta: `Check the description for the link! Don't miss out on this game-changer! 🎯`,
          hashtags: '#productreview #honest #review #worthit #recommended #musthave #gamechanger',
          affiliateLink: productDetails.affiliateLink
        };
      } else if (platform === 'instagram-reels' || platform === 'instagram') {
        generatedContent = {
          hook: `✨ ${title} - Is it worth the hype? Let's find out!`,
          script: `POV: You finally found ${title} everyone's been talking about 🎯\n\n${desc}\n\nPrice: $${price}\nMy rating: ⭐⭐⭐⭐⭐\n\nWould I recommend? ABSOLUTELY! This is one of those rare finds that actually lives up to the hype.\n\nSwipe up for the link! 🔗`,
          caption: `Found the perfect ${title}! 💎 ${desc}\n\nHonestly one of my best purchases this year. At $${price}, it's a steal! Link in bio! 🔗\n\n`,
          cta: `Link in bio! Grab yours before they're gone! 💫`,
          hashtags: '#instagramfinds #productreview #musthave #worthit #viral #trending #recommended #gamechanger #instagood',
          affiliateLink: productDetails.affiliateLink
        };
      } else {
        // Default fallback
        generatedContent = {
          script: `Check out ${title}! ${desc}`,
          hook: `🔥 ${title} alert!`,
          cta: 'Get it now!',
          hashtags: '#affiliate #product #musthave',
          affiliateLink: productDetails.affiliateLink
        };
      }
    } else {
      // Prompt-based generation
      finalPrompt = prompt;
      generatedContent = await generateAffiliateContent({ 
        productName: 'Product', 
        description: prompt, 
        audience: 'everyone' 
      });
    }

    // DEDUCT TOKENS (for non-admin users)
    if (user.role !== 'admin') {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          tokenBalance: { 
            decrement: TOKEN_COST 
          } 
        }
      });
    }

    // Save to database
    let content: any = null;
    try {
      content = await prisma.content.create({
        data: {
          userId,
          prompt: finalPrompt,
          result: JSON.stringify({
            ...generatedContent,
            platform,
            productId: productDetails?.id || null,
            generatedAt: new Date().toISOString()
          }),
          type: platform
        }
      });
      
      console.log("Generated + Saved:", content.id);
    } catch (error) {
      console.error('❌ Failed to save AI content:', error);
      // Continue without saving - don't block the response
    }

    // Get updated token balance
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokenBalance: true }
    });

    return res.json({
      success: true,
      content: generatedContent,
      data: generatedContent,
      saved: !!content,
      id: content?.id,
      tokensUsed: user.role !== 'admin' ? TOKEN_COST : 0,
      remainingTokens: updatedUser?.tokenBalance || 0
    });

  } catch (error: any) {
    console.error('❌ Unified AI generation error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to generate content' 
    });
  }
}

// UNIFIED AI GENERATION ENDPOINT
router.post('/generate', authMiddleware, handleAIGeneration);

// ALIAS for frontend compatibility
router.post('/generate-content', authMiddleware, handleAIGeneration);

export default router;
