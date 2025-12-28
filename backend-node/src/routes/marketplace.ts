import { Router, Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/products', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const network = req.query.network as string;
    const category = req.query.category as string;
    const search = req.query.search as string;

    const where: any = {
      is_active: true
    };

    if (network) where.network = network;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        network: true,
        image_url: true,
        affiliate_link: true,
        is_active: true,
        created_at: true
      }
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
  } catch (error) {
    console.error('Marketplace products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        network: true,
        image_url: true,
        affiliate_link: true,
        is_active: true,
        created_at: true
      }
    });

    if (!product || !product.is_active) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get product' });
  }
});

router.get('/networks', async (req: Request, res: Response) => {
  try {
    const networks = await prisma.product.groupBy({
      by: ['network'],
      _count: { id: true },
      where: { is_active: true }
    });

    res.json({
      networks: networks.map(n => ({
        name: n.network,
        product_count: n._count.id
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get networks' });
  }
});

router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.product.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { is_active: true, category: { not: null } }
    });

    res.json({
      categories: categories.map(c => ({
        name: c.category,
        product_count: c._count.id
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [totalProducts, totalNetworks, recentProducts] = await Promise.all([
      prisma.product.count({ where: { is_active: true } }),
      prisma.product.groupBy({ by: ['network'], where: { is_active: true } }),
      prisma.product.findMany({
        where: { is_active: true },
        orderBy: { created_at: 'desc' },
        take: 5,
        select: { id: true, name: true, network: true, created_at: true }
      })
    ]);

    res.json({
      total_products: totalProducts,
      total_networks: totalNetworks.length,
      recent_products: recentProducts
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get marketplace stats' });
  }
});

export default router;
