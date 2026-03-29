/**
 * AI AD GENERATION ROUTES
 * API endpoints for generating product ads using AI
 */

import express, { Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateAd, generateAdsBatch, generateAndSaveAd } from '../services/aiAd.service';

const router = express.Router();

/**
 * POST /api/ai/generate-ad/:productId
 * Generate AI ad for a specific product
 */
router.post('/generate-ad/:productId', async (req: AuthRequest, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }

    console.log(`🤖 Generating AI ad for product ${productId}...`);

    // Fetch product
    const product = await prisma.products.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Generate ad
    const ad = await generateAd({
      id: product.id,
      name: product.name,
      price: product.price?.toString() || '0',
      description: product.description || undefined,
      category: product.category || undefined,
      network: product.network || undefined,
      affiliateLink: product.affiliateLink || undefined
    });

    console.log(`✅ AI ad generated for product ${productId}`);

    return res.json({
      success: true,
      ad,
      product: {
        id: product.id,
        name: product.name,
        price: product.price
      }
    });

  } catch (error: any) {
    console.error('❌ AI ad generation error:', error);

    // Return fallback ad instead of error
    return res.status(200).json({
      success: false,
      error: error.message,
      ad: "🔥 Check out this amazing product now! Limited time offer. Buy Now! 🛒",
      fallback: true
    });
  }
});

/**
 * POST /api/ai/generate-and-save/:productId
 * Generate AI ad and save to database
 */
router.post('/generate-and-save/:productId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }

    console.log(`🤖 Generating and saving AI ad for product ${productId}...`);

    const ad = await generateAndSaveAd(productId, prisma);

    console.log(`✅ AI ad generated and saved for product ${productId}`);

    return res.json({
      success: true,
      ad,
      message: 'Ad generated and saved successfully'
    });

  } catch (error: any) {
    console.error('❌ AI ad generation error:', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai/generate-ads-batch
 * Generate ads for multiple products
 */
router.post('/generate-ads-batch', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { productIds, limit = 10 } = req.body;

    console.log(`🤖 Batch generating AI ads...`);

    let products;

    if (productIds && Array.isArray(productIds)) {
      // Generate for specific products
      products = await prisma.products.findMany({
        where: {
          id: { in: productIds }
        },
        take: limit
      });
    } else {
      // Generate for products without ads
      products = await prisma.products.findMany({
        where: {
          isActive: true,
          isApproved: true,
          aiGeneratedAd: null
        },
        take: limit
      });
    }

    if (products.length === 0) {
      return res.json({
        success: true,
        message: 'No products found for ad generation',
        results: []
      });
    }

    const results = await generateAdsBatch(products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price?.toString() || '0',
      description: p.description || undefined,
      category: p.category || undefined
    })));

    // Save ads to database
    for (const [productId, ad] of results.entries()) {
      if (!ad.startsWith('Error:')) {
        await prisma.products.update({
          where: { id: productId },
          data: { aiGeneratedAd: ad }
        });
      }
    }

    console.log(`✅ Batch generated ${results.size} ads`);

    return res.json({
      success: true,
      totalProcessed: results.size,
      results: Array.from(results.entries()).map(([id, ad]) => ({
        productId: id,
        success: !ad.startsWith('Error:'),
        ad: ad.startsWith('Error:') ? null : ad,
        error: ad.startsWith('Error:') ? ad : null
      }))
    });

  } catch (error: any) {
    console.error('❌ Batch ad generation error:', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai/product-ad/:productId
 * Get saved AI ad for a product
 */
router.get('/product-ad/:productId', async (req: AuthRequest, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }

    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        aiGeneratedAd: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    return res.json({
      success: true,
      productId: product.id,
      productName: product.name,
      ad: product.aiGeneratedAd,
      hasAd: !!product.aiGeneratedAd
    });

  } catch (error: any) {
    console.error('❌ Get product ad error:', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
