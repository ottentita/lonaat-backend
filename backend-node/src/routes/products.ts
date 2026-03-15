import { Router, Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest, creditCheckMiddleware } from '../middleware/auth';
import { getUserProductLimit, checkProductCreationAllowed, getSubscriptionPlansForUpgrade } from '../services/productLimits';
import { prisma } from '../prisma';

const router = Router();

router.get('/affiliate', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const network = req.query.network as string;
    const category = req.query.category as string;
    const skip = (page - 1) * limit;

    const where: any = { is_active: true };
    if (network) where.network = { equals: network, mode: 'insensitive' };
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
          image_url: true,
          affiliate_link: true,
          network: true,
          category: true,
          ai_generated_ad: true,
          extra_data: true,
          created_at: true
        }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      products: products.map(p => ({
        id: p.id,
        title: p.name,
        description: p.description,
        price: Number(p.price?.replace(/[^\d.]/g, '') || '0'),
        currency: (p.extra_data as any)?.currency || 'USD',
        image: p.image_url,
        affiliate_url: p.affiliate_link,
        network: p.network,
        category: p.category,
        ad_copy: p.ai_generated_ad
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const network = req.query.network as string;
    const category = req.query.category as string;

    const where: any = { is_active: true };
    
    if (!req.user!.isAdmin) {
      where.user_id = req.user!.id;
    }
    
    if (network) where.network = network;
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
    const limitInfo = await getUserProductLimit(req.user!.id);
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
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) }
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
    const limitCheck = await checkProductCreationAllowed(req.user!.id);

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
      const product = await createMarketplaceProduct(req.user!.id, {
        name,
        description,
        price: price !== undefined ? Number(price) : null,
        affiliate_link: affiliate_link || `https://lonaat.com/product/${Date.now()}`,
        network: network || 'internal',
        category,
        image_url,
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
        network: network || 'internal',
        category,
        image_url,
        user_id: req.user!.id,
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
    const productId = parseInt(req.params.id);
    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!req.user!.isAdmin && product.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, description, price, affiliate_link, network, category, image_url, is_active } = req.body;

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        name: name ?? product.name,
        description: description ?? product.description,
        price: price !== undefined ? Number(price) : product.price,
        affiliate_link: affiliate_link ?? product.affiliate_link,
        network: network ?? product.network,
        category: category ?? product.category,
        image_url: image_url ?? product.image_url,
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
    const productId = parseInt(req.params.id);
    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!req.user!.isAdmin && product.user_id !== req.user!.id) {
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
