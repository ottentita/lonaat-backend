import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import { realAffiliateConnector } from '../services/realAffiliateConnector';

const router = Router();

// GET /api/products/real - ONLY real products from DB, NO MOCK DATA
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const category = req.query.category as string;
    const network = req.query.network as string;

    let query = `SELECT id, name, description, price, affiliate_link, category, is_active, created_at
                 FROM products WHERE is_active = true`;
    const params: any[] = [];
    let paramIdx = 1;

    if (category) { query += ` AND category = $${paramIdx++}`; params.push(category); }
    if (network) { query += ` AND network = $${paramIdx++}`; params.push(network); }

    const countQuery = query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*)::int as total FROM');
    query += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const results = await Promise.all([
      prisma.$queryRawUnsafe(query, ...params),
      prisma.$queryRawUnsafe(countQuery, ...params.slice(0, -2))
    ]);
    const products = results[0] as any[];
    const countResult = results[1] as any[];

    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      products: products || [],
      total,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Get real products error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get real products',
      details: error.message,
      products: []
    });
  }
});

// POST /api/products/real/sync - Manual sync trigger
router.post('/sync', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const results = await realAffiliateConnector.syncAllAffiliateProducts();
    
    const totalFetched = results.reduce((sum: number, r: any) => sum + r.productsFetched, 0);
    const totalStored = results.reduce((sum: number, r: any) => sum + r.productsStored, 0);
    const successCount = results.filter((r: any) => r.success).length;

    res.json({
      success: true,
      message: 'Sync completed',
      summary: { totalProductsFetched: totalFetched, totalProductsStored: totalStored, networksSucceeded: successCount, networksTotal: results.length },
      results
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ success: false, error: 'Sync failed', details: error.message });
  }
});

// GET /api/products/real/stats - Get sync statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalResult: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as total FROM products WHERE is_active = true`);
    const byCategory: any[] = await prisma.$queryRawUnsafe(`SELECT category, COUNT(*)::int as count FROM products WHERE is_active = true GROUP BY category ORDER BY count DESC`);

    res.json({
      success: true,
      stats: {
        totalProducts: totalResult[0]?.total || 0,
        byCategory
      }
    });

  } catch (error: any) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

export default router;
