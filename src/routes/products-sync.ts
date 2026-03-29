import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import productSyncService from '../services/productSyncService'

const router = Router()

// PRODUCTION VERSION - Automatic Product Sync
// Uses real affiliate network APIs via productSyncService

// POST /api/products/sync - Sync products from affiliate sources
router.post('/sync', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🔄 PRODUCT SYNC REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    let syncedCount = 0;
    let updatedCount = 0;

    // Trigger automatic product sync
    console.log('📡 Starting manual product sync...');
    const syncResult = await productSyncService.syncAllProducts();
    
    res.json({
      success: true,
      message: 'Product sync completed',
      stats: {
        totalFetched: syncResult.totalFetched,
        totalStored: syncResult.totalStored,
        activeNetworks: syncResult.activeNetworks,
        results: syncResult.results
      }
    });

  } catch (error: any) {
    console.error('❌ Product sync error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to sync products' 
    });
  }
});

// GET /api/products/sources - Get available product sources
router.get('/sources', async (req, res) => {
  try {
    const activeNetworks = productSyncService.getActiveNetworks();

    res.json({
      success: true,
      activeNetworks,
      message: 'Active affiliate networks detected from environment variables'
    });
  } catch (error: any) {
    console.error('❌ Get sources error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to get sources' 
    });
  }
});

export default router;
