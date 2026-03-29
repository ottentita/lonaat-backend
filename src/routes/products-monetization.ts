import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

// GET /api/products - Get all products (public endpoint)
router.get('/', async (req, res) => {
  console.log('📋 GET ALL PRODUCTS REQUEST (PUBLIC)');
  
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category as string;

    // Use raw query without quoted identifiers
    let products: any[];
    let total: number;

    if (category && category !== 'all') {
      products = await prisma.$queryRaw`
        SELECT *
        FROM products
        WHERE isactive = true AND category = ${category}
        ORDER BY createdat DESC
        LIMIT ${limit}
        OFFSET ${skip}
      `;

      const totalResult = await prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(*)::int as count
        FROM products
        WHERE isactive = true AND category = ${category}
      `;
      total = Number(totalResult[0]?.count || 0);
    } else {
      products = await prisma.$queryRaw`
        SELECT *
        FROM products
        WHERE isactive = true
        ORDER BY createdat DESC
        LIMIT ${limit}
        OFFSET ${skip}
      `;

      const totalResult = await prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(*)::int as count
        FROM products
        WHERE isactive = true
      `;
      total = Number(totalResult[0]?.count || 0);
    }

    console.log('✅ Found', products.length, 'products');

    res.json({
      success: true,
      products,
      total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Get all products error:', error);
    res.status(500).json({ 
      error: 'Failed to get products',
      details: error.message 
    });
  }
});

// POST /api/products/create - Create a new product
router.post('/create', authMiddleware, async (req: AuthRequest, res) => {
  console.log('💰 CREATE PRODUCT REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, description, affiliate_link, category } = req.body;

    if (!name || !description || !affiliate_link || !category) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, description, affiliate_link, category' 
      });
    }

    console.log('👤 User:', userId);
    console.log('📦 Product:', name);
    console.log('🏷️ Category:', category);

    const product = await prisma.product.create({
      data: {
        userId,
        name,
        description,
        affiliateLink,
        category,
        isActive: true
      }
    });

    console.log('✅ Product created:', product.id);

    res.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        affiliateLink: product.affiliateLink,
        category: product.category,
        isActive: product.isActive,
        createdAt: product.createdAt
      },
      message: 'Product created successfully'
    });

  } catch (error: any) {
    console.error('❌ Create product error:', error);
    res.status(500).json({ 
      error: 'Failed to create product',
      details: error.message 
    });
  }
});

// GET /api/products/list - Get user's products
router.get('/list', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📋 GET PRODUCTS REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { category, active } = req.query;

    console.log('👤 User:', userId);
    console.log('🔍 Category filter:', category || 'all');
    console.log('🔍 Active filter:', active || 'all');

    const where: any = { userId };
    if (category && category !== 'all') {
      where.category = category;
    }
    if (active === 'true') {
      where.isActive = true;
    } else if (active === 'false') {
      where.isActive = false;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);

    console.log('✅ Found', products.length, 'products out of', total, 'total');

    res.json({
      success: true,
      products,
      total
    });

  } catch (error: any) {
    console.error('❌ Get products error:', error);
    res.status(500).json({ 
      error: 'Failed to get products',
      details: error.message 
    });
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📄 GET SINGLE PRODUCT REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden - not your product' });
    }

    console.log('✅ Product found:', id);

    res.json({
      success: true,
      product
    });

  } catch (error: any) {
    console.error('❌ Get product error:', error);
    res.status(500).json({ 
      error: 'Failed to get product',
      details: error.message 
    });
  }
});

// PATCH /api/products/:id - Update product
router.patch('/:id', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🔄 UPDATE PRODUCT REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { name, description, affiliate_link, category, is_active } = req.body;

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden - not your product' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(affiliateLink && { affiliateLink }),
        ...(category && { category }),
        ...(typeof isActive === 'boolean' && { isActive })
      }
    });

    console.log('✅ Product updated:', id);

    res.json({
      success: true,
      product: updated,
      message: 'Product updated successfully'
    });

  } catch (error: any) {
    console.error('❌ Update product error:', error);
    res.status(500).json({ 
      error: 'Failed to update product',
      details: error.message 
    });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🗑️ DELETE PRODUCT REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden - not your product' });
    }

    await prisma.product.delete({
      where: { id }
    });

    console.log('✅ Product deleted:', id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Delete product error:', error);
    res.status(500).json({ 
      error: 'Failed to delete product',
      details: error.message 
    });
  }
});

export default router;
