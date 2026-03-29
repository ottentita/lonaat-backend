import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

// GET /api/track/click - Track click and redirect to affiliate link
router.get('/click', async (req: Request, res: Response) => {
  try {
    const { userId, productId } = req.query;

    if (!userId || !productId) {
      return res.status(400).json({ success: false, error: 'userId and productId are required' });
    }

    const userIdStr = String(userId);
    const productIdStr = String(productId);

    console.log('🖱️ TRACK CLICK:', { userId: userIdStr, productId: productIdStr });

    // Get product and its affiliate link
    const products: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, affiliate_link FROM products WHERE id = $1 AND is_active = true LIMIT 1`,
      productIdStr
    );

    if (!products || products.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const product = products[0];
    const affiliateUrl = product.affiliate_link;

    if (!affiliateUrl || affiliateUrl.trim() === '') {
      return res.status(400).json({ success: false, error: 'Product has no affiliate link' });
    }

    // Dedup: check for recent click from same user+product within 5 min
    const recentClicks: any[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM clicks 
       WHERE user_id = $1 AND product_id = $2 AND created_at > NOW() - INTERVAL '5 minutes'
       LIMIT 1`,
      userIdStr, productIdStr
    );

    const clickId = `click-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (recentClicks.length === 0) {
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      await prisma.$queryRawUnsafe(
        `INSERT INTO clicks (id, "productId", network, "userId", ip, "userAgent", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        clickId, productIdStr, 'direct', userIdStr, ip, userAgent
      );

      // Increment product clicks
      await prisma.$queryRawUnsafe(
        `UPDATE products SET clicks = clicks + 1, "updatedAt" = NOW() WHERE id = $1`,
        productIdStr
      );

      console.log('✅ CLICK LOGGED:', clickId);
    } else {
      console.log('⚠️ DUPLICATE CLICK - skipping insert');
    }

    // Redirect to real affiliate link
    const separator = affiliateUrl.includes('?') ? '&' : '?';
    const redirectUrl = `${affiliateUrl}${separator}subid=${clickId}`;
    console.log('🔗 REDIRECTING:', redirectUrl);
    return res.redirect(redirectUrl);

  } catch (error: any) {
    console.error('❌ TRACK CLICK ERROR:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
