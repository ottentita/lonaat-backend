import { Router, Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest, adminOnlyMiddleware } from '../middleware/auth';
import { importAdmitadFeed, startFeedSyncScheduler } from '../services/admitadFeedService';
import { searchAdmitadProducts, searchAliExpressProducts, getAdmitadStatus } from '../services/admitadService';

const router = Router();
const prisma = new PrismaClient();

router.get('/admitad/status', async (req: Request, res: Response) => {
  try {
    const status = getAdmitadStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/admitad/feed', async (req: Request, res: Response) => {
  try {
    const feedUrl = process.env.ADMITAD_FEED_URL;
    res.json({
      configured: !!feedUrl,
      feed_url: feedUrl ? '***configured***' : null,
      message: feedUrl ? 'Feed URL is configured' : 'ADMITAD_FEED_URL not set'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/admitad/import', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { feed_url } = req.body;
    const result = await importAdmitadFeed(feed_url);
    res.json({
      message: 'Feed import completed',
      ...result
    });
  } catch (error: any) {
    console.error('Feed import error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/admitad/start-scheduler', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { interval_hours } = req.body;
    startFeedSyncScheduler(interval_hours || 6);
    res.json({ message: `Feed sync scheduler started (every ${interval_hours || 6} hours)` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/admitad/products', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || 'trending';
    const products = await searchAdmitadProducts(query);
    res.json({ products, count: products.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/aliexpress/products', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || 'trending';
    const products = await searchAliExpressProducts(query);
    res.json({ products, count: products.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/offers', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const network = req.query.network as string;
    const skip = (page - 1) * limit;

    const where: any = { is_active: true };
    if (category) where.category = category;
    if (network) where.network = network;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          image_url: true,
          affiliate_link: true,
          network: true,
          category: true,
          ai_generated_ad: true,
          extra_data: true
        }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      offers: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/track/click', async (req: Request, res: Response) => {
  try {
    const { product_id, user_id, subid } = req.body;
    
    const product = await prisma.product.findUnique({
      where: { id: parseInt(product_id) }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const click = await prisma.affiliateClick.create({
      data: {
        user_id: user_id ? parseInt(user_id) : null,
        product_id: parseInt(product_id),
        network: product.network || 'unknown',
        click_id: `click_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        subid: subid || null,
        ip_address: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown'
      }
    });

    await prisma.auditLog.create({
      data: {
        user_id: user_id ? parseInt(user_id) : null,
        action: 'affiliate_click',
        details: {
          product_id,
          product_name: product.name,
          network: product.network,
          click_id: click.click_id
        },
        ip_address: req.ip || 'unknown'
      }
    });

    res.json({
      success: true,
      click_id: click.click_id,
      redirect_url: product.affiliate_link
    });
  } catch (error: any) {
    console.error('Click tracking error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/track/click/:productId', async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);
    const userId = req.query.uid ? parseInt(req.query.uid as string) : null;
    const subid = req.query.subid as string || null;

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product || !product.affiliate_link) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await prisma.affiliateClick.create({
      data: {
        user_id: userId,
        product_id: productId,
        network: product.network || 'unknown',
        click_id: `click_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        subid,
        ip_address: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown'
      }
    });

    res.redirect(product.affiliate_link);
  } catch (error: any) {
    console.error('Click redirect error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/leads', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [clicks, total] = await Promise.all([
      prisma.affiliateClick.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.affiliateClick.count({ where: { user_id: userId } })
    ]);

    const clicksWithProducts = await Promise.all(
      clicks.map(async (click) => {
        const product = click.product_id 
          ? await prisma.product.findUnique({
              where: { id: click.product_id },
              select: { id: true, name: true, image_url: true, network: true }
            })
          : null;
        return { ...click, product };
      })
    );

    const conversions = clicksWithProducts.filter(c => c.converted);

    res.json({
      leads: clicksWithProducts,
      stats: {
        total_clicks: total,
        conversions: conversions.length,
        conversion_rate: total > 0 ? ((conversions.length / total) * 100).toFixed(2) : '0'
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
