import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import { generateCTA, generateMonetizedFooter, enhancePromptWithProduct, formatAffiliateLink } from '../utils/ctaGenerator';

const router = Router();

// Mock AI generation function (replace with actual AI API call)
function generateMockContent(prompt: string) {
  return {
    hooks: [
      "Stop scrolling! This will change your life 🔥",
      "You won't believe what I just discovered...",
      "This is the secret nobody tells you about 💎"
    ],
    script: `Here's something amazing I need to share with you!

${prompt}

I've been using this for weeks now and the results are incredible. It's exactly what I needed and I know you'll love it too.

The best part? It's super easy to get started and you'll see results right away.`,
    caption: "Game-changing discovery! You need to see this 🚀 #viral #musthave",
    hashtags: ["#trending", "#viral", "#musthave", "#gamechange", "#discover"]
  };
}

// POST /api/ai/generate-monetized - Generate AI content with automatic monetization
router.post('/generate-monetized', authMiddleware, async (req: AuthRequest, res) => {
  console.log('💰 GENERATE MONETIZED CONTENT REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, productId, templateType = 'tiktok' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('👤 User:', userId);
    console.log('📝 Prompt:', prompt.substring(0, 50) + '...');
    console.log('📦 Product ID:', productId || 'none');

    let product = null;
    let enhancedPrompt = prompt;
    let cta = "Check the link in bio! 👉";
    let affiliateLink = "";

    // If product ID provided, fetch product and enhance prompt
    if (productId) {
      product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      if (product.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden - not your product' });
      }

      console.log('✅ Product found:', product.name);

      // Enhance prompt with product information
      enhancedPrompt = generateEnhancedPrompt({
        name: product.name,
        description: product.description,
        affiliateLink: product.affiliate_link,
        category: product.category
      });

      // Generate CTA
      cta = generateCTA({
        name: product.name,
        description: product.description,
        affiliateLink: product.affiliate_link,
        category: product.category
      });

      affiliateLink = formatAffiliateLink(product.affiliate_link);

      console.log('🎯 Enhanced prompt with product info');
      console.log('💬 Generated CTA:', cta);
    }

    // Generate AI content (mock for now)
    const aiContent = generateMockContent(enhancedPrompt);

    // Auto-inject affiliate link into script
    let finalScript = aiContent.script;
    if (product) {
      finalScript = `${aiContent.script}\n\n${cta}\n${affiliateLink}`;
    }

    // Format response
    const response = {
      success: true,
      data: {
        hooks: aiContent.hooks,
        script: finalScript,
        caption: aiContent.caption,
        hashtags: aiContent.hashtags,
        cta: product ? cta : null,
        affiliateLink: product ? product.affiliateLink : null,
        productName: product ? product.name : null
      },
      monetized: !!product,
      message: product ? 'Content generated with monetization' : 'Content generated'
    };

    console.log('✅ Monetized content generated successfully');

    res.json(response);

  } catch (error: any) {
    console.error('❌ Generate monetized content error:', error);
    res.status(500).json({ 
      error: 'Failed to generate monetized content',
      details: error.message 
    });
  }
});

// POST /api/ai/batch-monetized - Generate multiple monetized variations
router.post('/batch-monetized', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🔄 BATCH MONETIZED GENERATION REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, productId, count = 3 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (count < 1 || count > 10) {
      return res.status(400).json({ error: 'Count must be between 1 and 10' });
    }

    console.log('👤 User:', userId);
    console.log('📊 Generating', count, 'variations');

    let product = null;
    if (productId) {
      product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (product && product.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden - not your product' });
      }
    }

    const variations = [];

    for (let i = 0; i < count; i++) {
      const aiContent = generateMockContent(prompt);
      
      let finalScript = aiContent.script;
      let cta = null;
      
      if (product) {
        cta = generateCTA({
          name: product.name,
          description: product.description,
          affiliateLink: product.affiliateLink,
          category: product.category
        });
        
        const link = formatAffiliateLink(product.affiliateLink);
        finalScript = `${aiContent.script}\n\n${cta}\n${link}`;
      }

      variations.push({
        hooks: aiContent.hooks,
        script: finalScript,
        caption: aiContent.caption,
        hashtags: aiContent.hashtags,
        cta,
        affiliateLink: product ? product.affiliateLink : null
      });
    }

    console.log('✅ Generated', variations.length, 'monetized variations');

    res.json({
      success: true,
      variations,
      count: variations.length,
      monetized: !!product
    });

  } catch (error: any) {
    console.error('❌ Batch monetized generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate batch monetized content',
      details: error.message 
    });
  }
});

export default router;
