import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest, creditCheckMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

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
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to get product' });
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
    const { name, description, price, affiliate_link, network, category, image_url } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: price || null,
        affiliate_link,
        network,
        category,
        image_url,
        user_id: req.user!.id,
        is_active: true
      }
    });

    res.status(201).json({ message: 'Product created', product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
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
        price: price !== undefined ? String(price) : product.price,
        affiliate_link: affiliate_link ?? product.affiliate_link,
        network: network ?? product.network,
        category: category ?? product.category,
        image_url: image_url ?? product.image_url,
        is_active: is_active ?? product.is_active
      }
    });

    res.json({ message: 'Product updated', product: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
