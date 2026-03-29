import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import prisma from '../prisma'

const router = Router()

// POST /api/user-products/promote - Add product to user's promoted products
router.post('/promote', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🎯 PROMOTE PRODUCT REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Product ID required' 
      });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        error: 'Product not found' 
      });
    }

    // Check if already promoted
    const existingUserProduct = await prisma.userProduct.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    if (existingUserProduct) {
      // Update status to active if it was removed
      if (existingUserProduct.status === 'removed') {
        await prisma.userProduct.update({
          where: { id: existingUserProduct.id },
          data: { status: 'active' }
        });
      }

      return res.json({
        success: true,
        message: 'Product already in your promoted list',
        userProduct: existingUserProduct
      });
    }

    // Add to user's promoted products
    const userProduct = await prisma.userProduct.create({
      data: {
        userId,
        productId,
        status: 'active'
      }
    });

    console.log(`✅ User ${userId} now promoting product ${productId}`);

    res.json({
      success: true,
      message: 'Product added to your promoted list',
      userProduct
    });

  } catch (error: any) {
    console.error('❌ Promote product error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to promote product' 
    });
  }
});

// GET /api/user-products/my-promoted - Get user's promoted products
router.get('/my-promoted', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📋 GET MY PROMOTED PRODUCTS REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const userProducts = await prisma.userProduct.findMany({
      where: {
        userId,
        status: 'active'
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            affiliate_link: true,
            category: true,
            source: true,
            images: true,
            tags: true,
            created_at: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log(`✅ Found ${userProducts.length} promoted products for user ${userId}`);

    res.json({
      success: true,
      userProducts,
      products: userProducts.map(up => up.product)
    });

  } catch (error: any) {
    console.error('❌ Get promoted products error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to get promoted products' 
    });
  }
});

// DELETE /api/user-products/:productId - Remove product from promoted list
router.delete('/:productId', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🗑️ REMOVE PROMOTED PRODUCT REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const { productId } = req.params;
    
    // Update status to removed instead of deleting
    const userProduct = await prisma.userProduct.updateMany({
      where: {
        userId,
        productId,
        status: 'active'
      },
      data: {
        status: 'removed'
      }
    });

    if (userProduct.count === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Product not found in your promoted list' 
      });
    }

    console.log(`✅ User ${userId} removed product ${productId} from promoted list`);

    res.json({
      success: true,
      message: 'Product removed from your promoted list'
    });

  } catch (error: any) {
    console.error('❌ Remove promoted product error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to remove promoted product' 
    });
  }
});

export default router;
