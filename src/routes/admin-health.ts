/**
 * ADMIN HEALTH ROUTES - Product health management
 * Admin endpoints for monitoring and managing product link health
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { productHealthService } from '../services/productHealth.service';
import { logger } from '../services/logger.service';

const router = Router();

/**
 * GET /api/admin/health/stats - Get product health statistics
 */
router.get('/stats', [
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

    const stats = await productHealthService.getHealthStats();

    res.json({
      success: true,
      data: {
        ...stats,
        healthGrade: getHealthGrade(stats.healthRate),
        recommendations: getHealthRecommendations(stats)
      }
    });

  } catch (error: any) {
    console.error('❌ Health stats failed:', error);
    logger.error('admin_health_stats_failed', { 
      error: error.message,
      userId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get health statistics'
    });
  }
});

/**
 * GET /api/admin/health/unhealthy - Get unhealthy products
 */
router.get('/unhealthy', [
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
    const type = req.query.type as string; // 'invalid', 'unchecked', 'all'

    let unhealthyProducts = await productHealthService.getUnhealthyProducts();

    // Filter by type
    if (type === 'invalid') {
      unhealthyProducts = unhealthyProducts.filter(p => !p.isValidLink);
    } else if (type === 'unchecked') {
      unhealthyProducts = unhealthyProducts.filter(p => !p.lastCheckedAt);
    }

    // Paginate
    const skip = (page - 1) * limit;
    const paginatedProducts = unhealthyProducts.slice(skip, skip + limit);

    res.json({
      success: true,
      data: {
        products: paginatedProducts,
        pagination: {
          page,
          limit,
          total: unhealthyProducts.length,
          pages: Math.ceil(unhealthyProducts.length / limit)
        },
        summary: {
          total: unhealthyProducts.length,
          invalid: unhealthyProducts.filter(p => !p.isValidLink).length,
          unchecked: unhealthyProducts.filter(p => !p.lastCheckedAt).length
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Unhealthy products failed:', error);
    logger.error('admin_unhealthy_products_failed', { 
      error: error.message,
      userId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get unhealthy products'
    });
  }
});

/**
 * POST /api/admin/health/check - Run manual health check
 */
router.post('/check', [
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

    const { productId } = req.body;

    logger.info('admin_manual_health_check', {
      initiatedBy: req.user!.email,
      productId: productId || 'all'
    });

    let result;
    if (productId) {
      // Check specific product
      result = await productHealthService.checkSpecificProduct(Number(productId));
      
      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      res.json({
        success: true,
        message: 'Product health check completed',
        data: result
      });

    } else {
      // Check all products (this might take time)
      res.json({
        success: true,
        message: 'Health check initiated. This may take several minutes.',
        data: { status: 'initiated' }
      });

      // Run health check in background
      productHealthService.runHealthCheck().catch(error => {
        console.error('❌ Background health check failed:', error);
        logger.error('background_health_check_failed', { error: error.message });
      });
    }

  } catch (error: any) {
    console.error('❌ Manual health check failed:', error);
    logger.error('admin_manual_health_check_failed', { 
      error: error.message,
      userId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to run health check'
    });
  }
});

/**
 * PATCH /api/admin/health/:productId/validate - Mark product as valid
 */
router.patch('/products/:productId/validate', [
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

    const productId = Number(req.params.productId);
    const { isValid } = req.body;

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }

    const { prisma } = await import('../prisma');

    // Update product validation status
    const updatedProduct = await prisma.products.update({
      where: { id: productId },
      data: {
        isValidLink: isValid !== undefined ? isValid : true,
        lastCheckedAt: new Date()
      }
    });

    logger.info('admin_product_validated', {
      productId,
      isValid: isValid !== undefined ? isValid : true,
      validatedBy: req.user!.email
    });

    res.json({
      success: true,
      message: `Product marked as ${isValid !== undefined ? (isValid ? 'valid' : 'invalid') : 'valid'}`,
      data: {
        productId: updatedProduct.id,
        name: updatedProduct.name,
        isValidLink: updatedProduct.isValidLink,
        lastCheckedAt: updatedProduct.lastCheckedAt
      }
    });

  } catch (error: any) {
    console.error('❌ Product validation failed:', error);
    logger.error('admin_product_validation_failed', { 
      error: error.message,
      userId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to validate product'
    });
  }
});

/**
 * DELETE /api/admin/health/:productId - Remove unhealthy product
 */
router.delete('/products/:productId', [
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

    const productId = Number(req.params.productId);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }

    const { prisma } = await import('../prisma');

    // Get product info before deletion
    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: { id: true, name: true, affiliateLink: true }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Delete product
    await prisma.products.delete({
      where: { id: productId }
    });

    logger.info('admin_unhealthy_product_deleted', {
      productId,
      productName: product.name,
      affiliateLink: product.affiliateLink,
      deletedBy: req.user!.email
    });

    res.json({
      success: true,
      message: 'Unhealthy product deleted successfully',
      data: {
        productId: product.id,
        name: product.name
      }
    });

  } catch (error: any) {
    console.error('❌ Product deletion failed:', error);
    logger.error('admin_product_deletion_failed', { 
      error: error.message,
      userId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete product'
    });
  }
});

/**
 * GET /api/admin/health/logs - Get health check logs
 */
router.get('/logs', [
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

    const limit = Number(req.query.limit) || 50;
    const logs = logger.getRecentLogs(limit).filter(log => 
      log.event === 'product_health_check' || 
      log.event === 'admin_product_validated' ||
      log.event === 'admin_unhealthy_product_deleted'
    );

    res.json({
      success: true,
      data: {
        logs,
        total: logs.length
      }
    });

  } catch (error: any) {
    console.error('❌ Health logs failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get health logs'
    });
  }
});

// Helper functions

function getHealthGrade(healthRate: number): string {
  if (healthRate >= 95) return 'A';
  if (healthRate >= 90) return 'B';
  if (healthRate >= 80) return 'C';
  if (healthRate >= 70) return 'D';
  return 'F';
}

function getHealthRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  if (stats.healthRate < 90) {
    recommendations.push('Consider running manual health check on all products');
  }
  
  if (stats.invalid > 10) {
    recommendations.push('High number of invalid links - review affiliate network quality');
  }
  
  if (stats.notChecked > 5) {
    recommendations.push('Some products haven\'t been checked recently - run health check');
  }
  
  if (!stats.lastCheck) {
    recommendations.push('No health checks performed yet - initiate first health check');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Product health is good - continue monitoring');
  }
  
  return recommendations;
}

export default router;
