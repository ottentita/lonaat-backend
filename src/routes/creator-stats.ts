import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/creator/stats - Get creator dashboard statistics
 */
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get total products
    const productsCount: any = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM products WHERE user_id = $1`,
      userId
    );

    // Get total clicks
    const clicksCount: any = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM product_clicks WHERE user_id = $1`,
      userId
    );

    // Get total earnings from wallet transactions
    const earnings: any = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM transactions 
       WHERE user_id = $1 AND type = 'credit' AND status = 'completed'`,
      userId
    );

    // Get total conversions (successful affiliate transactions)
    const conversions: any = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count 
       FROM transactions 
       WHERE user_id = $1 AND type = 'credit' AND status = 'completed'`,
      userId
    );

    // Get product performance (top 5 products by clicks)
    const topProducts: any = await prisma.$queryRawUnsafe(
      `SELECT id, name, clicks, views, created_at
       FROM products
       WHERE user_id = $1
       ORDER BY clicks DESC NULLS LAST
       LIMIT 5`,
      userId
    );

    // Get recent clicks (last 10)
    const recentClicks: any = await prisma.$queryRawUnsafe(
      `SELECT c.id, c.product_id, c.ip, c.created_at, p.name as "product_name"
       FROM product_clicks c
       JOIN products p ON c.product_id = CAST(p.id AS TEXT)
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC
       LIMIT 10`,
      userId
    );

    console.log('✅ Creator stats fetched for user:', userId);

    return res.json({
      success: true,
      stats: {
        totalProducts: Number(productsCount[0]?.count || 0),
        totalClicks: Number(clicksCount[0]?.count || 0),
        totalEarnings: parseFloat(earnings[0]?.total || 0),
        totalConversions: Number(conversions[0]?.count || 0),
        topProducts: topProducts || [],
        recentClicks: recentClicks || []
      }
    });

  } catch (err: any) {
    console.error('❌ Creator stats error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch creator statistics',
      details: err.message
    });
  }
});

/**
 * GET /api/creator/product-stats/:id - Get statistics for a specific product
 */
router.get('/product-stats/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const productId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify ownership
    const product: any = await prisma.$queryRawUnsafe(
      `SELECT user_id, name, clicks, views, created_at 
       FROM products 
       WHERE id = $1 LIMIT 1`,
      productId
    );

    if (!Array.isArray(product) || product.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    if (product[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this product'
      });
    }

    // Get click history for this product
    const clickHistory: any = await prisma.$queryRawUnsafe(
      `SELECT id, ip, user_agent, created_at
       FROM clicks
       WHERE product_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      productId
    );

    // Get clicks per day (last 30 days)
    const clicksPerDay: any = await prisma.$queryRawUnsafe(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM clicks
       WHERE product_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      productId
    );

    return res.json({
      success: true,
      product: product[0],
      clickHistory: clickHistory || [],
      clicksPerDay: clicksPerDay || []
    });

  } catch (err: any) {
    console.error('❌ Product stats error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch product statistics',
      details: err.message
    });
  }
});

export default router;
