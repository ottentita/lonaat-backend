import { Router, Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest, adminOnlyMiddleware } from '../middleware/auth';
import { importAdmitadFeed, startFeedSyncScheduler } from '../services/admitadFeedService';
import { searchAdmitadProducts, searchAliExpressProducts, getAdmitadStatus } from '../services/admitadService';

const router = Router();
const prisma = new PrismaClient();

router.get('/networks', async (req: Request, res: Response) => {
  try {
    const networks = await prisma.affiliateNetwork.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' }
    });

    const defaultNetworks = [
      { id: 'digistore24', name: 'Digistore24', slug: 'digistore24', status: 'active' },
      { id: 'awin', name: 'Awin', slug: 'awin', status: 'active' },
      { id: 'mylead', name: 'MyLead', slug: 'mylead', status: 'active' },
      { id: 'admitad', name: 'Admitad', slug: 'admitad', status: 'active' },
      { id: 'aliexpress', name: 'AliExpress', slug: 'aliexpress', status: 'active' }
    ];

    const allNetworks = networks.length > 0 
      ? networks.map(n => ({ id: n.slug, name: n.name, slug: n.slug, status: n.status }))
      : defaultNetworks;

    res.json({ networks: allNetworks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const network = req.query.network as string;
    const q = req.query.q as string;

    if (!network || !q) {
      return res.status(400).json({ error: 'Missing params: network and q required' });
    }

    const products = await prisma.product.findMany({
      where: {
        is_active: true,
        network: { equals: network, mode: 'insensitive' },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 50,
      orderBy: { created_at: 'desc' }
    });

    res.json({ 
      products: products.map(p => ({
        id: p.id,
        external_id: (p.extra_data as any)?.external_id || `prod_${p.id}`,
        title: p.name,
        price: parseFloat(p.price?.replace(/[^\d.]/g, '') || '0'),
        currency: 'USD',
        image: p.image_url,
        affiliate_url: p.affiliate_link,
        category: p.category,
        network: p.network
      })),
      total: products.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/import', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { network, external_id, title, price, currency, image, affiliate_url, category } = req.body;

    if (!title || !affiliate_url) {
      return res.status(400).json({ error: 'Title and affiliate_url are required' });
    }

    const product = await prisma.product.create({
      data: {
        name: title,
        price: price ? String(price) : null,
        image_url: image || null,
        affiliate_link: affiliate_url,
        network: network || 'unknown',
        category: category || 'General',
        user_id: req.user?.id || null,
        is_active: true,
        extra_data: {
          external_id: external_id || null,
          currency: currency || 'USD',
          imported_at: new Date().toISOString()
        }
      }
    });

    res.json({ success: true, product_id: product.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bulk-import', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array is required' });
    }

    const results = { imported: 0, failed: 0, errors: [] as string[] };

    for (const p of products) {
      try {
        await prisma.product.create({
          data: {
            name: p.title || p.name,
            price: p.price ? String(p.price) : null,
            image_url: p.image || p.image_url || null,
            affiliate_link: p.affiliate_url || p.affiliate_link,
            network: p.network || 'unknown',
            category: p.category || 'General',
            user_id: req.user?.id || null,
            is_active: true,
            extra_data: {
              external_id: p.external_id || null,
              currency: p.currency || 'USD',
              imported_at: new Date().toISOString()
            }
          }
        });
        results.imported++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Failed to import "${p.title || p.name}": ${err.message}`);
      }
    }

    res.json({ success: true, ...results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/click/:id', async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    const userId = req.query.user ? parseInt(req.query.user as string) : null;

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
        ip_address: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown'
      }
    });

    res.redirect(product.affiliate_link);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/admitad/status', async (req: Request, res: Response) => {
  try {
    const status = getAdmitadStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sync/:network', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { network } = req.params;
    const { limit = 100 } = req.body;
    
    console.log(`Starting sync for network: ${network}`);
    
    if (network === 'admitad') {
      const feedUrl = process.env.ADMITAD_FEED_URL;
      if (!feedUrl) {
        return res.status(400).json({ 
          error: 'ADMITAD_FEED_URL not configured',
          hint: 'Set ADMITAD_FEED_URL in environment variables'
        });
      }
      
      const axios = (await import('axios')).default;
      const { XMLParser } = await import('fast-xml-parser');
      
      console.log('Fetching Admitad feed...');
      const response = await axios.get(feedUrl, {
        timeout: 120000,
        headers: { 'User-Agent': 'Lonaat/2.0 Sync' }
      });
      
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
      });
      
      const parsed = parser.parse(response.data);
      const offers = parsed?.yml_catalog?.shop?.offers?.offer ||
                     parsed?.rss?.channel?.item ||
                     [];
      
      const items = Array.isArray(offers) ? offers.slice(0, limit) : [offers];
      
      let imported = 0;
      let skipped = 0;
      
      for (const item of items) {
        const externalId = item['@_id'] || item.id || String(Math.random());
        const name = item.name || item.title || item['@_name'];
        const price = parseFloat(item.price || item.priceAmount || '0');
        const image = item.picture || item.image || '';
        const url = item.url || item.link || '';
        const category = item.categoryId || item.category || 'General';
        const description = item.description || item.summary || '';
        
        if (!name || !url) {
          skipped++;
          continue;
        }
        
        const existing = await prisma.product.findFirst({
          where: {
            network: 'admitad',
            extra_data: { path: ['external_id'], equals: externalId }
          }
        });
        
        if (existing) {
          skipped++;
          continue;
        }
        
        await prisma.product.create({
          data: {
            name,
            price: price > 0 ? `$${price.toFixed(2)} USD` : null,
            image_url: image || null,
            description: description.substring(0, 500),
            affiliate_link: url,
            network: 'admitad',
            category,
            user_id: req.user?.id || null,
            is_active: true,
            extra_data: {
              external_id: externalId,
              currency: 'USD',
              vendor: item.vendor || 'Admitad',
              imported_at: new Date().toISOString()
            }
          }
        });
        imported++;
      }
      
      return res.json({
        success: true,
        network: 'admitad',
        imported,
        skipped,
        total_in_feed: items.length
      });
    }
    
    if (network === 'aliexpress') {
      const products = await searchAliExpressProducts('trending');
      
      let imported = 0;
      for (const p of products.slice(0, limit)) {
        try {
          const prod = p as any;
          await prisma.product.create({
            data: {
              name: prod.name || prod.title || 'Unknown',
              price: prod.price ? String(prod.price) : null,
              image_url: prod.image || prod.image_url || null,
              description: prod.description || '',
              affiliate_link: prod.affiliate_link || prod.url || '',
              network: 'aliexpress',
              category: prod.category || 'General',
              user_id: req.user?.id || null,
              is_active: true,
              extra_data: {
                external_id: prod.id || String(Math.random()),
                imported_at: new Date().toISOString()
              }
            }
          });
          imported++;
        } catch (e) {
          // Skip duplicates
        }
      }
      
      return res.json({
        success: true,
        network: 'aliexpress',
        imported,
        message: 'AliExpress products synced'
      });
    }
    
    if (network === 'digistore24') {
      return res.json({
        success: true,
        network: 'digistore24',
        imported: 0,
        message: 'Digistore24 works via API - use product discovery instead'
      });
    }
    
    if (network === 'awin') {
      return res.json({
        success: true,
        network: 'awin',
        imported: 0,
        message: 'Awin requires feed configuration - use product discovery'
      });
    }
    
    if (network === 'mylead') {
      return res.json({
        success: true,
        network: 'mylead',
        imported: 0,
        message: 'MyLead works via API - use product discovery'
      });
    }
    
    res.status(400).json({ error: `Unknown network: ${network}` });
  } catch (error: any) {
    console.error(`Sync error for ${req.params.network}:`, error);
    res.status(500).json({ 
      error: 'Sync failed',
      details: error.message
    });
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

let feedCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

async function getFeedProducts(): Promise<any[]> {
  if (feedCache && Date.now() - feedCache.timestamp < CACHE_TTL) {
    console.log('Using cached feed data');
    return feedCache.data;
  }

  const feedUrl = process.env.ADMITAD_FEED_URL;
  if (!feedUrl) return [];

  console.log('Fetching Admitad feed for search...');
  const axios = (await import('axios')).default;
  const { XMLParser } = await import('fast-xml-parser');

  const response = await axios.get(feedUrl, {
    timeout: 120000,
    headers: { 'User-Agent': 'Lonaat/2.0 Feed Search' }
  });

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });

  const parsed = parser.parse(response.data);
  const offers = parsed?.yml_catalog?.shop?.offers?.offer ||
                 parsed?.rss?.channel?.item ||
                 parsed?.feed?.entry ||
                 [];

  const products = Array.isArray(offers) ? offers : [offers];
  feedCache = { data: products, timestamp: Date.now() };
  console.log(`Cached ${products.length} products from feed`);
  return products;
}

router.get('/admitad/search', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string || '').toLowerCase().trim();
    const source = req.query.source as string || 'database';
    const feedUrl = process.env.ADMITAD_FEED_URL;

    if (source === 'database' || !feedUrl) {
      const dbProducts = await prisma.product.findMany({
        where: {
          is_active: true,
          OR: [
            { network: 'admitad' },
            { network: 'aliexpress' }
          ],
          ...(query ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { category: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } }
            ]
          } : {})
        },
        take: 50,
        orderBy: { created_at: 'desc' }
      });

      return res.status(200).json({
        success: true,
        data: dbProducts.map(p => ({
          id: p.id,
          name: p.name,
          price: parseFloat(p.price?.replace(/[^\d.]/g, '') || '0'),
          currency: p.price?.includes('USD') ? 'USD' : 'USD',
          image: p.image_url,
          url: p.affiliate_link,
          category: p.category || 'General',
          merchant: (p.extra_data as any)?.merchant || 'Admitad',
          description: p.description || p.ai_generated_ad || ''
        })),
        total: dbProducts.length,
        query: query || 'all',
        source: 'database'
      });
    }

    const products = await getFeedProducts();

    const filteredProducts = query
      ? products.filter((item: any) => {
          const name = (item.name || item.title || item['@_name'] || '').toLowerCase();
          const category = (item.categoryId || item.category || '').toLowerCase();
          const description = (item.description || item.summary || '').toLowerCase();
          const vendor = (item.vendor || item.merchant || '').toLowerCase();
          
          return name.includes(query) ||
                 category.includes(query) ||
                 description.includes(query) ||
                 vendor.includes(query);
        })
      : products;

    const mappedProducts = filteredProducts.slice(0, 50).map((item: any) => ({
      id: item['@_id'] || item.id || item.guid || String(Math.random()),
      name: item.name || item.title || item['@_name'] || '',
      price: parseFloat(item.price || item.priceAmount || '0'),
      currency: item.currencyId || item.currency || item.priceCurrency || 'USD',
      image: item.picture || item.image || item.enclosure?.['@_url'] || '',
      url: item.url || item.link || '',
      category: item.categoryId || item.category || 'General',
      merchant: item.vendor || item.merchant || item.author || 'Unknown',
      availability: item.available === 'true' || item.availability === 'in stock' ? 'in_stock' : 'out_of_stock',
      description: item.description || item.summary || ''
    }));

    res.status(200).json({
      success: true,
      data: mappedProducts,
      total: mappedProducts.length,
      query: query || 'all'
    });
  } catch (error: any) {
    console.error('Admitad search error:', error.message);
    res.status(200).json({
      success: true,
      data: [],
      error: error.message
    });
  }
});

router.get('/admitad/cache/refresh', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    feedCache = null;
    const products = await getFeedProducts();
    res.json({ success: true, message: 'Cache refreshed', products_count: products.length });
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
