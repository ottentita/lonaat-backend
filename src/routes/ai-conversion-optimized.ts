import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import { createViralContent } from '../utils/viralContentGenerator';
import { findBestProduct } from '../utils/productMatcher';
import { generateHashtags } from '../utils/hashtagGenerator';
import { generateOptimizedContent } from '../utils/conversionOptimizer';

const router = Router();

// POST /api/ai/generate-optimized - Generate conversion-optimized content
router.post('/generate-optimized', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🎯 CONVERSION-OPTIMIZED GENERATION REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, topic, forceProductId } = req.body;

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

    if (!selectedProduct) {
      return res.status(400).json({ 
        error: 'No product available for monetization',
        message: 'Please add affiliate products to enable conversion optimization'
      });
    }

    // Generate viral content with 5 hooks
    const viralContent = createViralContent(
      contentTopic,
      prompt || topic,
      {
        name: selectedProduct.name,
        link: selectedProduct.link,
        commission: selectedProduct.commission
      }
    );

    // Generate conversion-optimized content with 3 CTA variants
    const optimizedContent = generateOptimizedContent(
      viralContent.alternativeHooks as unknown as { [key: string]: string },
      {
        name: selectedProduct.name,
        link: selectedProduct.link,
        commission: selectedProduct.commission,
        niche: selectedProduct.niche
      }
    );

    // Generate hashtags
    const hashtags = generateHashtags(contentTopic, selectedProduct.niche, 15);

    // Build final content with best combination
    const finalContent = `${optimizedContent.bestCombination.hook}

${viralContent.value}

${viralContent.curiosity}

${optimizedContent.bestCombination.cta}`;

    // Format for platforms
    const tiktokVersion = `${optimizedContent.bestCombination.hook} 🔥

${viralContent.value}

${viralContent.curiosity} 💯

${optimizedContent.bestCombination.cta}

${hashtags.slice(0, 10).join(' ')}`;

    const instagramVersion = `${optimizedContent.bestCombination.hook} 🔥
.
${viralContent.value}
.
${viralContent.curiosity} 💯
.
${optimizedContent.bestCombination.cta}
.
━━━━━━━━━━━━━━━
${hashtags.slice(0, 30).join(' ')}`;

    console.log('✅ Conversion-optimized content generated');
    console.log('🎯 Best hook:', optimizedContent.bestCombination.hookType);
    console.log('💬 Best CTA:', optimizedContent.bestCombination.ctaType);
    console.log('📊 Combination score:', optimizedContent.bestCombination.score);

    res.json({
      success: true,
      data: {
        // Final optimized content
        finalContent,
        
        // Best combination selected
        bestCombination: {
          hook: optimizedContent.bestCombination.hook,
          hookType: optimizedContent.bestCombination.hookType,
          cta: optimizedContent.bestCombination.cta,
          ctaType: optimizedContent.bestCombination.ctaType,
          score: optimizedContent.bestCombination.score
        },
        
        // All 5 hooks
        hooks: optimizedContent.hooks,
        
        // All 3 CTA variants
        ctaVariants: optimizedContent.ctaVariants,
        
        // Top 10 combinations
        topCombinations: optimizedContent.allCombinations,
        
        // Platform-ready versions
        platformReady: {
          tiktok: tiktokVersion,
          instagram: instagramVersion
        },
        
        // Hashtags
        hashtags,
        
        // Product info
        product: {
          id: selectedProduct.id,
          name: selectedProduct.name,
          niche: selectedProduct.niche,
          commission: selectedProduct.commission,
          link: selectedProduct.link
        },
        
        // Structure
        structure: {
          hook: optimizedContent.bestCombination.hook,
          value: viralContent.value,
          curiosity: viralContent.curiosity,
          cta: optimizedContent.bestCombination.cta
        }
      },
      optimization: {
        hooksGenerated: 5,
        ctaVariantsGenerated: 3,
        totalCombinations: optimizedContent.allCombinations.length,
        bestScore: optimizedContent.bestCombination.score
      },
      message: `Conversion-optimized content generated with ${optimizedContent.bestCombination.hookType} hook + ${optimizedContent.bestCombination.ctaType} CTA`
    });

  } catch (error: any) {
    console.error('❌ Conversion-optimized generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate conversion-optimized content',
      details: error.message 
    });
  }
});

// POST /api/ai/batch-optimized - Batch generate conversion-optimized content
router.post('/batch-optimized', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🔄🎯 BATCH CONVERSION-OPTIMIZED GENERATION');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, topic, count = 3 } = req.body;

    if (!prompt && !topic) {
      return res.status(400).json({ error: 'Prompt or topic is required' });
    }

    if (count < 1 || count > 10) {
      return res.status(400).json({ error: 'Count must be between 1 and 10' });
    }

    const contentTopic = topic || prompt;
    console.log('👤 User:', userId);
    console.log('📊 Generating', count, 'optimized variations');

    // Fetch active affiliate products
    const affiliateProducts = await prisma.affiliateProduct.findMany({
      where: { isActive: true }
    });

    if (affiliateProducts.length === 0) {
      return res.status(400).json({ 
        error: 'No products available',
        message: 'Please add affiliate products to enable conversion optimization'
      });
    }

    const variations = [];

    for (let i = 0; i < count; i++) {
      console.log(`🎯 Generating variation ${i + 1}/${count}...`);

      // Auto-match product
      const selectedProduct = findBestProduct(contentTopic, affiliateProducts);

      if (!selectedProduct) continue;

      // Generate viral content
      const viralContent = createViralContent(
        contentTopic,
        prompt || topic,
        {
          name: selectedProduct.name,
          link: selectedProduct.link,
          commission: selectedProduct.commission
        }
      );

      // Generate optimized content
      const optimizedContent = generateOptimizedContent(
        viralContent.alternativeHooks as unknown as { [key: string]: string },
        {
          name: selectedProduct.name,
          link: selectedProduct.link,
          commission: selectedProduct.commission,
          niche: selectedProduct.niche
        }
      );

      // Use different combinations for variety
      const combination = optimizedContent.allCombinations[i] || optimizedContent.bestCombination;

      const finalContent = `${combination.hook}

${viralContent.value}

${viralContent.curiosity}

${combination.cta}`;

      variations.push({
        finalContent,
        bestCombination: {
          hook: combination.hook,
          hookType: combination.hookType,
          cta: combination.cta,
          ctaType: combination.ctaType,
          score: combination.score
        },
        product: {
          id: selectedProduct.id,
          name: selectedProduct.name,
          niche: selectedProduct.niche,
          commission: selectedProduct.commission
        }
      });
    }

    console.log('✅ Batch conversion-optimized generation complete');

    res.json({
      success: true,
      variations,
      count: variations.length,
      message: `Generated ${variations.length} conversion-optimized variations`
    });

  } catch (error: any) {
    console.error('❌ Batch conversion-optimized generation error:', error);
    res.status(500).json({ 
      error: 'Failed to batch generate conversion-optimized content',
      details: error.message 
    });
  }
});

export default router;
