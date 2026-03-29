import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import { createViralContent, analyzeViralPotential } from '../utils/viralContentGenerator';
import { findBestProduct } from '../utils/productMatcher';
import { generateHashtags } from '../utils/hashtagGenerator';

const router = Router();

// POST /api/ai/generate-viral - Generate viral-ready content with Hook → Value → Curiosity → CTA
router.post('/generate-viral', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🔥 VIRAL GENERATION REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, topic, forceProductId, includeAnalysis = true } = req.body;

    if (!prompt && !topic) {
      return res.status(400).json({ error: 'Prompt or topic is required' });
    }

    const contentTopic = topic || prompt;
    console.log('👤 User:', userId);
    console.log('📝 Topic:', contentTopic.substring(0, 50) + '...');

    // Fetch active affiliate products
    const affiliateProducts = await prisma.affiliateProduct.findMany({
      where: { isActive: true }
    });

    console.log('📦 Found', affiliateProducts.length, 'active products');

    // Auto-match or use forced product
    let selectedProduct = null;
    if (forceProductId) {
      selectedProduct = affiliateProducts.find((p: any) => p.id === forceProductId);
      console.log('🎯 Using forced product:', selectedProduct?.name);
    } else if (affiliateProducts.length > 0) {
      selectedProduct = findBestProduct(prompt || topic, affiliateProducts);
      console.log('🤖 Auto-matched product:', selectedProduct?.name);
    }

    // Generate viral content with Hook → Value → Curiosity → CTA structure
    const viralContent = createViralContent(
      contentTopic,
      prompt || topic,
      selectedProduct ? {
        name: selectedProduct.name,
        link: selectedProduct.link,
        commission: selectedProduct.commission
      } : undefined
    );

    // Generate hashtags based on topic
    const hashtags = generateHashtags(contentTopic, 'general', 15);

    // Analyze viral potential if requested
    let analysis = null;
    if (includeAnalysis) {
      analysis = analyzeViralPotential(viralContent.fullContent);
      console.log('📊 Viral score:', analysis.score);
    }

    console.log('✅ Viral content generated');
    console.log('🎯 Hook type:', viralContent.hookType);
    console.log('💰 Monetized:', !!selectedProduct);

    res.json({
      success: true,
      data: {
        // Main content
        selectedHook: viralContent.selectedHook,
        hookType: viralContent.hookType,
        fullContent: viralContent.fullContent,
        
        // Structure breakdown
        structure: {
          hook: viralContent.selectedHook,
          value: viralContent.value,
          curiosity: viralContent.curiosity,
          cta: viralContent.cta
        },
        
        // Alternative hooks for A/B testing
        alternativeHooks: viralContent.alternativeHooks,
        
        // Platform-ready versions
        platformReady: viralContent.platformReady,
        
        // Hashtags
        hashtags,
        
        // Product info (if monetized)
        product: selectedProduct ? {
          id: selectedProduct.id,
          name: selectedProduct.name,
          niche: selectedProduct.niche,
          commission: selectedProduct.commission,
          link: selectedProduct.link
        } : null,
        
        // Viral analysis
        analysis
      },
      monetization: {
        enabled: !!selectedProduct,
        autoMatched: !forceProductId && !!selectedProduct
      },
      message: selectedProduct 
        ? `Viral content generated and monetized with ${selectedProduct.name}` 
        : 'Viral content generated'
    });

  } catch (error: any) {
    console.error('❌ Viral generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate viral content',
      details: error.message 
    });
  }
});

// POST /api/ai/batch-viral - Batch generate viral content
router.post('/batch-viral', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🔄🔥 BATCH VIRAL GENERATION');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, topic, count = 3, varyHooks = true } = req.body;

    if (!prompt && !topic) {
      return res.status(400).json({ error: 'Prompt or topic is required' });
    }

    if (count < 1 || count > 10) {
      return res.status(400).json({ error: 'Count must be between 1 and 10' });
    }

    const contentTopic = topic || prompt;
    console.log('👤 User:', userId);
    console.log('📊 Generating', count, 'viral variations');

    // Fetch active affiliate products
    const affiliateProducts = await prisma.affiliateProduct.findMany({
      where: { isActive: true }
    });

    const variations = [];

    for (let i = 0; i < count; i++) {
      console.log(`🔥 Generating variation ${i + 1}/${count}...`);

      // Auto-match product
      let selectedProduct = null;
      if (affiliateProducts.length > 0) {
        selectedProduct = findBestProduct(contentTopic, affiliateProducts);
      }

      // Generate viral content
      const viralContent = createViralContent(
        contentTopic,
        prompt || topic,
        selectedProduct ? {
          name: selectedProduct.name,
          link: selectedProduct.link,
          commission: selectedProduct.commission
        } : undefined
      );

      // Generate hashtags
      const hashtags = generateHashtags(contentTopic, 'general', 15);

      // If varyHooks is true, use different hook types for each variation
      let hookToUse = viralContent.selectedHook;
      if (varyHooks && i < 5) {
        const hookTypes = ['controversial', 'curiosity', 'fear', 'opportunity', 'direct'];
        const hookType = hookTypes[i] as keyof typeof viralContent.alternativeHooks;
        hookToUse = viralContent.alternativeHooks[hookType];
      }

      variations.push({
        selectedHook: hookToUse,
        hookType: viralContent.hookType,
        fullContent: viralContent.fullContent,
        structure: {
          hook: hookToUse,
          value: viralContent.value,
          curiosity: viralContent.curiosity,
          cta: viralContent.cta
        },
        platformReady: viralContent.platformReady,
        hashtags,
        product: selectedProduct ? {
          id: selectedProduct.id,
          name: selectedProduct.name,
          niche: selectedProduct.niche,
          commission: selectedProduct.commission
        } : null
      });
    }

    console.log('✅ Batch viral generation complete');

    res.json({
      success: true,
      variations,
      count: variations.length,
      monetized: variations.filter(v => v.product).length,
      message: `Generated ${variations.length} viral variations`
    });

  } catch (error: any) {
    console.error('❌ Batch viral generation error:', error);
    res.status(500).json({ 
      error: 'Failed to batch generate viral content',
      details: error.message 
    });
  }
});

// POST /api/ai/analyze-viral - Analyze content for viral potential
router.post('/analyze-viral', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📊 VIRAL ANALYSIS REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Analyze viral potential
    const analysis = analyzeViralPotential(content);

    console.log('✅ Analysis complete');
    console.log('📊 Viral score:', analysis.score);

    res.json({
      success: true,
      analysis: {
        score: analysis.score,
        rating: analysis.score >= 80 ? 'Excellent' : analysis.score >= 60 ? 'Good' : analysis.score >= 40 ? 'Fair' : 'Needs Improvement',
        strengths: analysis.strengths,
        improvements: analysis.improvements
      },
      message: `Viral potential: ${analysis.score}/100`
    });

  } catch (error: any) {
    console.error('❌ Viral analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze viral potential',
      details: error.message 
    });
  }
});

export default router;
