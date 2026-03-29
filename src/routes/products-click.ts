import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/products/:id/click - Track product click
 * Records click in product_clicks table for analytics
 */
router.post('/:id/click', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const userId = Number(req.user?.id);

    if (isNaN(productId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid product ID' 
      });
    }

    if (isNaN(userId)) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    console.log('🖱️ PRODUCT CLICK - Recording:', { productId, userId });

    // Get product details
    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        network: true,
        affiliateLink: true
      }
    });

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        error: 'Product not found' 
      });
    }

    // Get IP and User-Agent
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress 
      || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Check for duplicate clicks (same user + product within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentClick = await prisma.product_clicks.findFirst({
      where: {
        productId: String(product.id),
        userId: String(userId),
        createdAt: { gte: fiveMinutesAgo }
      }
    });

    if (recentClick) {
      console.log('⚠️ PRODUCT CLICK - Duplicate click prevented (within 5 min)');
      return res.json({
        success: true,
        duplicate: true,
        message: 'Click already recorded recently',
        affiliateLink: product.affiliateLink
      });
    }

    // Record click
    const clickId = crypto.randomBytes(16).toString('hex');
    const click = await prisma.product_clicks.create({
      data: {
        id: clickId,
        productId: String(product.id),
        userId: String(userId),
        network: product.network || 'Unknown',
        ip,
        userAgent,
        createdAt: new Date()
      }
    });

    console.log('✅ PRODUCT CLICK - Click recorded:', click.id);

    return res.json({
      success: true,
      clickId: click.id,
      affiliateLink: product.affiliateLink,
      message: 'Click tracked successfully'
    });

  } catch (error: any) {
    console.error('❌ PRODUCT CLICK ERROR:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to track click',
      details: error.message
    });
  }
});

export default router;
