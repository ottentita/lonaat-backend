import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest, adminOnlyMiddleware } from '../middleware/auth';
import { ingestProduct, bulkIngestProducts, getProductStats, validateProductData } from '../services/productIngestion.service';

const router = Router();

/**
 * GET /api/affiliate/products - Get all affiliate products (REAL DATA ONLY)
 */
router.get('/products', async (req: Request, res: Response) => {
  console.log('📦 GET AFFILIATE PRODUCTS - DB ONLY (NO MOCK DATA)');
  
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const network = req.query.network as string;
    const category = req.query.category as string;

    // Build query
    const where: any = {
      isActive: true,
      affiliateLink: { not: null }
    };

    if (category) where.category = category;

    // Fetch from database
    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          affiliateLink: true,
          category: true,
          tags: true,
          isActive: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.products.count({ where })
    ]);

    console.log(`✅ Returning ${products.length} real products from DB (total: ${total})`);

    res.json({
      success: true,
      products,
      total,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Get affiliate products error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get products',
      details: error.message,
      products: [] // Empty array, NO FALLBACK
    });
  }
});

/**
 * POST /api/affiliate/products - Add new product (ADMIN ONLY)
 */
router.post('/products', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('➕ ADD AFFILIATE PRODUCT');
  
  try {
    const productData = req.body;

    // Validate product data
    const validation = validateProductData(productData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: validation.errors
      });
    }

    // Ingest product
    const result = await ingestProduct(productData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        duplicate: result.duplicate || false
      });
    }

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      product: result.product
    });

  } catch (error: any) {
    console.error('❌ Add product error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to add product',
      details: error.message 
    });
  }
});

/**
 * POST /api/affiliate/products/bulk - Bulk add products (ADMIN ONLY)
 */
router.post('/products/bulk', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('📦 BULK ADD AFFILIATE PRODUCTS');
  
  try {
    const { products } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        error: 'Products must be an array'
      });
    }

    // Validate all products
    const validationErrors: any[] = [];
    products.forEach((p, index) => {
      const validation = validateProductData(p);
      if (!validation.valid) {
        validationErrors.push({
          index,
          name: p.name,
          errors: validation.errors
        });
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed for some products',
        validationErrors
      });
    }

    // Bulk ingest
    const results = await bulkIngestProducts(products);

    res.json({
      success: true,
      message: 'Bulk ingestion complete',
      results
    });

  } catch (error: any) {
    console.error('❌ Bulk add error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to bulk add products',
      details: error.message 
    });
  }
});

/**
 * GET /api/affiliate/products/stats - Get product statistics
 */
router.get('/products/stats', async (req: Request, res: Response) => {
  console.log('📊 GET PRODUCT STATS');
  
  try {
    const stats = await getProductStats();

    res.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get stats',
      details: error.message 
    });
  }
});

/**
 * DELETE /api/affiliate/products/:id - Delete product (ADMIN ONLY)
 */
router.delete('/products/:id', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('🗑️ DELETE AFFILIATE PRODUCT');
  
  try {
    const productId = Number(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    await prisma.products.delete({
      where: { id: productId }
    });

    console.log(`✅ Product deleted: ${productId}`);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Delete product error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete product',
      details: error.message 
    });
  }
});

export default router;
