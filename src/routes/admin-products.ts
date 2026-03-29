/**
 * ADMIN PRODUCTS ROUTES - Product management and approval
 * Admin endpoints for product approval and management
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import prisma from '../prisma';
import { productCacheService } from '../services/productCache.service';

const router = Router();

/**
 * PATCH /api/admin/products/:id/approve - Approve a product
 * Minimum UI for product approval
 */
router.patch('/products/:id/approve', [
  authMiddleware,
  body('approved').optional().isBoolean().withMessage('Approved must be boolean')
], async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Admin access required'
      });
    }

    const productId = Number(req.params.id);
    const { approved } = req.body;

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if product exists
    const product = await prisma.products.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Update product approval status
    const updatedProduct = await prisma.products.update({
      where: { id: productId },
      data: { 
        isApproved: approved !== undefined ? approved : true
      }
    });

    // 🔥 CACHE INVALIDATION (IMPORTANT)
    productCacheService.invalidateCache();
    console.log(`🗑️ Cache invalidated due to product approval: ${productId}`);

    console.log(`✅ Product ${productId} ${approved !== undefined ? (approved ? 'approved' : 'unapproved') : 'approved'} by admin: ${req.user!.email}`);

    res.json({
      success: true,
      message: `Product ${approved !== undefined ? (approved ? 'approved' : 'unapproved') : 'approved'} successfully`,
      data: {
        product: {
          id: updatedProduct.id,
          name: updatedProduct.name,
          isApproved: updatedProduct.isApproved,
          isActive: updatedProduct.isActive
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Product approval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/products/pending - Get pending products for approval
 */
router.get('/products/pending', [
  authMiddleware
], async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Admin access required'
      });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get pending products
    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where: {
          isApproved: false,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          affiliateLink: true,
          network: true,
          category: true,
          imageUrl: true,
          commission: true,
          createdAt: true,
          clicks: true,
          views: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.products.count({
        where: {
          isApproved: false,
          isActive: true
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        products: products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Get pending products failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * PATCH /api/admin/products/:id - Update product details
 */
router.patch('/products/:id', [
  authMiddleware,
  body('name').optional().isString().withMessage('Name must be string'),
  body('description').optional().isString().withMessage('Description must be string'),
  body('price').optional().isNumeric().withMessage('Price must be numeric'),
  body('commission').optional().isNumeric().withMessage('Commission must be numeric'),
  body('category').optional().isString().withMessage('Category must be string'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('isApproved').optional().isBoolean().withMessage('isApproved must be boolean')
], async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Admin access required'
      });
    }

    const productId = Number(req.params.id);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if product exists
    const existingProduct = await prisma.products.findUnique({
      where: { id: productId }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Update product
    const updateData: any = {};
    const allowedFields = ['name', 'description', 'price', 'commission', 'category', 'isActive', 'isApproved'];
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const updatedProduct = await prisma.products.update({
      where: { id: productId },
      data: updateData
    });

    // 🔥 CACHE INVALIDATION (IMPORTANT)
    productCacheService.invalidateCache();
    console.log(`🗑️ Cache invalidated due to product update: ${productId}`);

    console.log(`✅ Product ${productId} updated by admin: ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: {
        product: updatedProduct
      }
    });

  } catch (error: any) {
    console.error('❌ Product update failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * DELETE /api/admin/products/:id - Delete a product
 */
router.delete('/products/:id', [
  authMiddleware
], async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Admin access required'
      });
    }

    const productId = Number(req.params.id);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }

    // Check if product exists
    const existingProduct = await prisma.products.findUnique({
      where: { id: productId }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Delete product (this will also delete related records due to cascading)
    await prisma.products.delete({
      where: { id: productId }
    });

    // 🔥 CACHE INVALIDATION (IMPORTANT)
    productCacheService.invalidateCache();
    console.log(`🗑️ Cache invalidated due to product deletion: ${productId}`);

    console.log(`🗑️ Product ${productId} deleted by admin: ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Product deletion failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * POST /api/admin/products - Create a new product
 */
router.post('/products', [
  authMiddleware,
  body('name').isString().withMessage('Name is required'),
  body('price').isNumeric().withMessage('Price is required'),
  body('affiliateLink').isURL().withMessage('Valid affiliate link is required'),
  body('network').isString().withMessage('Network is required')
], async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Admin access required'
      });
    }

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      name,
      description,
      price,
      affiliateLink,
      network,
      category,
      commission,
      imageUrl,
      isActive = true,
      isApproved = false
    } = req.body;

    // Create product
    const newProduct = await prisma.products.create({
      data: {
        name,
        description: description || '',
        price: Number(price),
        affiliateLink,
        network,
        category: category || 'General',
        commission: commission ? Number(commission) : 0,
        imageUrl: imageUrl || null,
        isActive,
        isApproved,
        createdAt: new Date()
      }
    });

    // 🔥 CACHE INVALIDATION (IMPORTANT)
    productCacheService.invalidateCache();
    console.log(`🗑️ Cache invalidated due to product creation: ${newProduct.id}`);

    console.log(`✅ Product ${newProduct.id} created by admin: ${req.user!.email}`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        product: newProduct
      }
    });

  } catch (error: any) {
    console.error('❌ Product creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

export default router;
