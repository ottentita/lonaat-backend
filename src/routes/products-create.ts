import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/products/create - Create a new product (authenticated users only)
 */
router.post('/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const {
      name,
      description,
      price,
      affiliateLink,
      category,
      images,
      tags
    } = req.body;

    // Validate required fields
    if (!name || !description || !affiliateLink || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, description, affiliateLink, category'
      });
    }

    // Check if affiliateLink already exists
    const existingProduct = await prisma.$queryRawUnsafe(
      `SELECT id FROM products WHERE "affiliateLink" = $1 LIMIT 1`,
      affiliateLink
    );

    if (Array.isArray(existingProduct) && existingProduct.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Affiliate link already exists. Please use a unique link.'
      });
    }

    // Generate unique product ID
    const productId = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create product
    await prisma.$queryRawUnsafe(
      `INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, images, tags, "isActive", featured, views, clicks, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, false, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      productId,
      userId,
      name,
      description || '',
      price ? parseFloat(price) : null,
      affiliateLink,
      category,
      images || [],
      tags || []
    );

    console.log('✅ Product created:', productId, 'by user:', userId);

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: {
        id: productId,
        name,
        description,
        price,
        affiliateLink,
        category,
        images,
        tags
      }
    });

  } catch (err: any) {
    console.error('❌ Product creation error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create product',
      details: err.message
    });
  }
});

/**
 * GET /api/products/my - Get current user's products
 */
router.get('/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const products = await prisma.$queryRawUnsafe(
      `SELECT id, name, description, price, affiliate_link, category, images, tags, is_active, featured, views, clicks, created_at
       FROM products
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      userId
    );

    console.log('✅ User products fetched:', userId, 'count:', Array.isArray(products) ? products.length : 0);

    return res.json({
      success: true,
      products: products || [],
      total: Array.isArray(products) ? products.length : 0
    });

  } catch (err: any) {
    console.error('❌ Fetch user products error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      details: err.message
    });
  }
});

/**
 * DELETE /api/products/:id - Delete a product (owner only)
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user?.id);
    const productId = Number(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(401).json({ error: 'Invalid user ID' });
    }

    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify ownership
    const product: any = await prisma.$queryRawUnsafe(
      `SELECT "userId" FROM products WHERE id = $1 LIMIT 1`,
      productId
    );

    if (!Array.isArray(product) || product.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    if (product[0].userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this product'
      });
    }

    // Delete product
    await prisma.$queryRawUnsafe(
      `DELETE FROM products WHERE id = $1`,
      productId
    );

    console.log('✅ Product deleted:', productId, 'by user:', userId);

    return res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (err: any) {
    console.error('❌ Product deletion error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete product',
      details: err.message
    });
  }
});

export default router;
