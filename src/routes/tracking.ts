import { Router, Request, Response } from 'express';
import prisma from '../prisma';

const router = Router();

/**
 * GET /api/track/product/:id - Get tracking link for a product
 */
router.get('/product/:id', async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    // Verify product exists
    const product: any = await prisma.$queryRawUnsafe(
      `SELECT id, "userId", name FROM products WHERE id = $1 AND "isActive" = true LIMIT 1`,
      productId
    );

    if (!Array.isArray(product) || product.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found or inactive'
      });
    }

    const trackingLink = `${process.env.APP_URL || 'http://localhost:4000'}/api/track/click?userId=${product[0].userId}&productId=${productId}`;

    return res.json({
      success: true,
      trackingLink,
      productId,
      productName: product[0].name
    });

  } catch (err: any) {
    console.error('❌ Tracking link generation error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate tracking link',
      details: err.message
    });
  }
});

/**
 * GET /api/track/click - Track click and redirect to affiliate link
 */
router.get('/click', async (req: Request, res: Response) => {
  try {
    const { userId, productId } = req.query;

    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId or productId'
      });
    }

    // Get product and affiliate link
    const product = await prisma.products.findUnique({
      where: { id: Number(productId) },
      select: { affiliateLink: true, isActive: true }
    });

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Product not found or inactive'
      });
    }

    const affiliateLink = product.affiliateLink;
    
    if (!affiliateLink) {
      return res.status(404).json({
        success: false,
        error: 'Product has no affiliate link'
      });
    }

    // Get IP and User Agent
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                req.socket.remoteAddress || 
                'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Generate click ID
    const clickId = `click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check for duplicate clicks (same IP + product within 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentClick: any = await prisma.$queryRawUnsafe(
      `SELECT id FROM clicks 
       WHERE ip = $1 AND "productId" = $2 AND "createdAt" > $3 
       LIMIT 1`,
      ip,
      productId as string,
      oneHourAgo
    );

    if (!Array.isArray(recentClick) || recentClick.length === 0) {
      // No recent duplicate - log the click
      await prisma.$executeRawUnsafe(
        `INSERT INTO clicks (id, "productId", network, "userId", ip, "userAgent", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        clickId,
        productId as string,
        'direct',
        userId as string,
        ip,
        userAgent
      );

      // Increment product clicks count only for non-duplicate clicks
      await prisma.$executeRawUnsafe(
        `UPDATE products SET clicks = COALESCE(clicks, 0) + 1 WHERE id = $1`,
        productId as string
      );
    }

    // Redirect to affiliate link (even for duplicates to maintain UX)
    return res.redirect(affiliateLink);

  } catch (err: any) {
    console.error('❌ Click tracking error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to track click',
      details: err.message
    });
  }
});

/**
 * POST /api/track/product-click - Record product click for analytics (called by frontend)
 */
router.post('/product-click', async (req: Request, res: Response) => {
  try {
    const { productId, network } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'productId is required' });
    }

    const clickId = `click-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Store click in clicks
    await prisma.$queryRawUnsafe(
      `INSERT INTO clicks (id, "productId", network, "userId", ip, "userAgent", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      clickId,
      String(productId),
      network || 'direct',
      'anonymous',
      ip,
      userAgent
    );

    // Increment product clicks counter
    await prisma.$queryRawUnsafe(
      `UPDATE products SET clicks = clicks + 1, "updatedAt" = NOW() WHERE id = $1`,
      String(productId)
    );

    console.log('✅ Product click tracked:', clickId, 'product:', productId);

    return res.json({ success: true, clickId });

  } catch (err: any) {
    console.error('❌ Product click tracking error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to track click',
      details: err.message
    });
  }
});

export default router;
