import { Router, Response, Request } from 'express';
// PrismaClient import removed — use shared singleton from ../prisma
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest, creditCheckMiddleware } from '../middleware/auth';
import { getUserProductLimit, checkProductCreationAllowed, getSubscriptionPlansForUpgrade } from '../services/productLimits';
import { prisma } from '../prisma';

const router = Router();

router.get('/affiliate', async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const network = req.query.network as string;
    const category = req.query.category as string;
    const skip = (page - 1) * limit;

    const where: any = { 
        is_active: true,
        isValid: true 
    };
    if (category) where.category = { contains: category, mode: 'insensitive' };

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
          images: true,
          affiliate_link: true,
          category: true,
          tags: true,
          created_at: true,
          featured: true,
          views: true,
          clicks: true
        }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      products: products.map(p => ({
        id: p.id,
        title: p.name,
        name: p.name,
        description: p.description,
        price: p.price || 0,
        currency: 'USD',
        image: p.images?.[0] || '',
        image_url: p.images?.[0] || '',
        affiliate_url: p.affiliate_link,
        affiliate_link: p.affiliate_link,
        affiliateLink: p.affiliate_link,
        category: p.category,
        tags: p.tags || [],
        featured: p.featured,
        views: p.views,
        clicks: p.clicks,
        network: 'internal'
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    console.error('Affiliate products error:', error);
    res.status(500).json({ error: 'Failed to get affiliate products' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const network = req.query.network as string;
    const category = req.query.category as string;

    const where: any = { 
        is_active: true,
        isValid: true 
    };
    
    if (!req.user!.isAdmin) {
      where.userId = String(req.user!.id);
    }
    
    if (category) where.category = category;

    const products = await prisma.product.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip
    });

    const total = await prisma.product.count({ where });

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('GET PRODUCTS ERROR:', error);
    res.status(500).json({
      error: 'Failed to get products',
      details: error?.message || error
    });
  }
});

router.get('/usage', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limitInfo = await getUserProductLimit(Number(req.user!.id));
    const plans = await getSubscriptionPlansForUpgrade();

    res.json({
      usage: limitInfo,
      available_plans: plans
    });
  } catch (error) {
    console.error('Product usage error:', error);
    res.status(500).json({ error: 'Failed to get product usage' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!req.user!.isAdmin && product.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ product });
  } catch (error: any) {
    console.error('GET PRODUCT BY ID ERROR:', error);
    res.status(500).json({
      error: 'Failed to get product',
      details: error?.message || error
    });
  }
});

router.post('/', [
  authMiddleware,
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('affiliate_link').optional().isURL().withMessage('Valid URL required')
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const limitCheck = await checkProductCreationAllowed(Number(req.user!.id));

    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: limitCheck.error,
        limit_info: limitCheck.limit_info,
        requires_upgrade: true
      });
    }

    const { name, description, price, affiliate_link, network, category, image_url, type } = req.body;

    if (type === 'marketplace') {
      // delegate to marketplace engine which will deduct listing fee atomically
      const { createMarketplaceProduct } = await import('../services/marketplaceEngine')
      const product = await createMarketplaceProduct(Number(req.user!.id), {
        name,
        description,
        price: price !== undefined ? Number(price) : null,
        affiliate_link: affiliate_link || `https://lonaat.com/product/${Date.now()}`,
        category: category || 'General',
        images: image_url ? [image_url] : [],
        tags: [],
        is_active: true
      })

      return res.status(201).json({ message: 'Marketplace product created', product, limit_info: limitCheck.limit_info })
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: price !== undefined ? Number(price) : null,
        affiliate_link: affiliate_link || `https://lonaat.com/product/${Date.now()}`,
        category: category || 'General',
        images: image_url ? [image_url] : [],
        tags: [],
        userId: String(req.user!.id),
        is_active: true
      }
    });

    res.status(201).json({ 
      message: 'Product created', 
      product,
      limit_info: limitCheck.limit_info
    });
  } catch (error: any) {
    console.error('CREATE PRODUCT ERROR:', error);
    res.status(500).json({
      error: 'Failed to create product',
      details: error?.message || error
    });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!req.user!.isAdmin && product.userId !== String(req.user!.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, description, price, affiliate_link, network, category, image_url, is_active, images, tags } = req.body;

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        name: name ?? product.name,
        description: description ?? product.description,
        price: price !== undefined ? Number(price) : product.price,
        affiliate_link: affiliate_link ?? product.affiliate_link,
        category: category ?? product.category,
        images: images ?? (image_url ? [image_url] : product.images),
        tags: tags ?? product.tags,
        is_active: is_active ?? product.is_active
      }
    });

    res.json({ message: 'Product updated', product: updated });
  } catch (error: any) {
    console.error('UPDATE PRODUCT ERROR:', error);
    res.status(500).json({
      error: 'Failed to update product',
      details: error?.message || error
    });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!req.user!.isAdmin && product.userId !== String(req.user!.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.product.update({
      where: { id: productId },
      data: { is_active: false }
    });

    res.json({ message: 'Product deleted' });
  } catch (error: any) {
    console.error('DELETE PRODUCT ERROR:', error);
    res.status(500).json({
      error: 'Failed to delete product',
      details: error?.message || error
    });
  }
});

export default router;
