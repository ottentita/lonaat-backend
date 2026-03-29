import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import { findBestProduct, analyzeMonetizationPotential } from '../utils/productMatcher';
import { autoMonetizeContent, createMonetizationPackage } from '../utils/enhancedCTA';

const router = Router();

// Mock AI generation function
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

// POST /api/ai/generate-auto - Generate AI content with automatic product matching and monetization
router.post('/generate-auto', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🤖💰 AUTO-MONETIZED GENERATION REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, templateType = 'tiktok', forceProductId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('👤 User:', userId);
    console.log('📝 Prompt:', prompt.substring(0, 50) + '...');
    console.log('🎯 Template:', templateType);

    // Generate AI content first
    const aiContent = generateMockContent(prompt);
    const baseContent = `${aiContent.script}`;

    console.log('✅ AI content generated');

    // Fetch all active affiliate products
    const affiliateProducts = await prisma.affiliateProduct.findMany({
      where: { is_active: true }
    });

    console.log('📦 Found', affiliateProducts.length, 'active products');

    let selectedProduct = null;
    let monetizedContent = baseContent;
    let cta = null;
    let ctaVariations: string[] = [];
    let matchAnalysis = null;

    if (affiliateProducts.length > 0) {
      // Use forced product or auto-match
      if (forceProductId) {
        selectedProduct = affiliateProducts.find(p => p.id === forceProductId);
        console.log('🎯 Using forced product:', selectedProduct?.name);
      } else {
        // Auto-match best product
        selectedProduct = findBestProduct(baseContent, affiliateProducts);
        console.log('🤖 Auto-matched product:', selectedProduct?.name);

        // Analyze monetization potential
        matchAnalysis = analyzeMonetizationPotential(baseContent, affiliateProducts);
        console.log('📊 Match confidence:', matchAnalysis.confidence);
        console.log('🏷️ Detected niches:', matchAnalysis.detectedNiches.join(', '));
      }

      if (selectedProduct) {
        // Auto-monetize content
        const monetizationPackage = createMonetizationPackage(baseContent, selectedProduct);
        
        monetizedContent = monetizationPackage.monetized;
        cta = monetizationPackage.cta;
        ctaVariations = monetizationPackage.ctaVariations;

        console.log('💰 Content auto-monetized');
        console.log('📏 Original length:', monetizationPackage.stats.originalLength);
        console.log('📏 Monetized length:', monetizationPackage.stats.monetizedLength);
      }
    } else {
      console.log('⚠️ No affiliate products available');
    }

    // Format final response
    const response = {
      success: true,
      data: {
        hooks: aiContent.hooks,
        script: monetizedContent,
        caption: aiContent.caption,
        hashtags: aiContent.hashtags,
        cta: cta,
        ctaVariations: ctaVariations,
        product: selectedProduct ? {
          id: selectedProduct.id,
          name: selectedProduct.name,
          niche: selectedProduct.niche,
          commission: selectedProduct.commission,
          link: selectedProduct.link
        } : null
      },
      monetization: {
        enabled: !!selectedProduct,
        autoMatched: !forceProductId && !!selectedProduct,
        confidence: matchAnalysis?.confidence || 'unknown',
        detectedNiches: matchAnalysis?.detectedNiches || [],
        suggestions: matchAnalysis?.suggestions || []
      },
      message: selectedProduct 
        ? `Content generated and auto-monetized with ${selectedProduct.name}` 
        : 'Content generated (no monetization - add affiliate products)'
    };

    console.log('✅ Auto-monetized generation complete');

    res.json(response);

  } catch (error: any) {
    console.error('❌ Auto-monetized generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate auto-monetized content',
      details: error.message 
    });
  }
});

// POST /api/ai/batch-auto - Batch generate with auto-monetization
router.post('/batch-auto', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🔄💰 BATCH AUTO-MONETIZED GENERATION');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, count = 3, templateType = 'tiktok' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (count < 1 || count > 10) {
      return res.status(400).json({ error: 'Count must be between 1 and 10' });
    }

    console.log('👤 User:', userId);
    console.log('📊 Generating', count, 'variations');

    // Fetch all active affiliate products
    const affiliateProducts = await prisma.affiliateProduct.findMany({
      where: { is_active: true }
    });

    const variations = [];

    for (let i = 0; i < count; i++) {
      console.log(`🤖 Generating variation ${i + 1}/${count}...`);

      // Generate AI content
      const aiContent = generateMockContent(prompt);
      const baseContent = aiContent.script;

      let monetizedContent = baseContent;
      let cta = null;
      let selectedProduct = null;

      // Auto-match and monetize if products available
      if (affiliateProducts.length > 0) {
        selectedProduct = findBestProduct(baseContent, affiliateProducts);
        
        if (selectedProduct) {
          const result = autoMonetizeContent(baseContent, selectedProduct, {
            includeUrgency: i % 2 === 0, // Vary urgency
            includeSocialProof: i % 3 === 0 // Vary social proof
          });
          
          monetizedContent = result.monetizedContent;
          cta = result.cta;
        }
      }

      variations.push({
        hooks: aiContent.hooks,
        script: monetizedContent,
        caption: aiContent.caption,
        hashtags: aiContent.hashtags,
        cta,
        product: selectedProduct ? {
          id: selectedProduct.id,
          name: selectedProduct.name,
          niche: selectedProduct.niche,
          commission: selectedProduct.commission
        } : null
      });
    }

    console.log('✅ Batch auto-monetization complete');

    res.json({
      success: true,
      variations,
      count: variations.length,
      monetized: variations.filter(v => v.product).length,
      message: `Generated ${variations.length} variations, ${variations.filter(v => v.product).length} monetized`
    });

  } catch (error: any) {
    console.error('❌ Batch auto-monetization error:', error);
    res.status(500).json({ 
      error: 'Failed to batch generate auto-monetized content',
      details: error.message 
    });
  }
});

// GET /api/ai/monetization-analysis - Analyze content for monetization potential
router.post('/monetization-analysis', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📊 MONETIZATION ANALYSIS REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Fetch all active affiliate products
    const affiliateProducts = await prisma.affiliateProduct.findMany({
      where: { is_active: true }
    });

    if (affiliateProducts.length === 0) {
      return res.json({
        success: true,
        analysis: {
          detectedNiches: [],
          bestProduct: null,
          alternativeProducts: [],
          confidence: 'low',
          suggestions: ['Add affiliate products to enable monetization']
        }
      });
    }

    // Analyze monetization potential
    const analysis = analyzeMonetizationPotential(content, affiliateProducts);

    console.log('✅ Analysis complete');
    console.log('🏷️ Niches:', analysis.detectedNiches.join(', '));
    console.log('🎯 Confidence:', analysis.confidence);

    res.json({
      success: true,
      analysis: {
        detectedNiches: analysis.detectedNiches,
        bestProduct: analysis.bestProduct ? {
          id: analysis.bestProduct.id,
          name: analysis.bestProduct.name,
          niche: analysis.bestProduct.niche,
          commission: analysis.bestProduct.commission
        } : null,
        alternativeProducts: analysis.alternativeProducts.map(p => ({
          id: p.id,
          name: p.name,
          niche: p.niche,
          commission: p.commission
        })),
        confidence: analysis.confidence,
        suggestions: analysis.suggestions
      }
    });

  } catch (error: any) {
    console.error('❌ Monetization analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze monetization potential',
      details: error.message 
    });
  }
});

export default router;
