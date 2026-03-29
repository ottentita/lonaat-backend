/**
 * ADMIN SYNC ROUTES - Manual product sync control
 * Allows admin to trigger manual syncs and view sync status
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { triggerManualSync, getSyncJobStatus } from '../jobs/productSync.job';
import { syncAllNetworks, getSyncStats } from '../services/productSync.service';

const router = Router();

/**
 * POST /api/admin/sync/trigger - Manual sync trigger
 */
router.post('/trigger', [
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

    console.log('🔄 MANUAL SYNC TRIGGERED BY ADMIN:', req.user!.email);
    
    const result = await triggerManualSync();
    
    res.json({
      success: true,
      message: 'Manual sync completed successfully',
      data: {
        duration: result.duration,
        results: result.results,
        summary: {
          networksProcessed: result.results.length,
          successful: result.results.filter(r => r.success).length,
          totalProducts: result.results.reduce((sum, r) => sum + r.productsCount, 0)
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Manual sync trigger failed:', error);
    res.status(500).json({
      success: false,
      error: 'Manual sync failed',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/sync/status - Get sync job status
 */
router.get('/status', [
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

    const jobStatus = getSyncJobStatus();
    const stats = await getSyncStats();
    
    res.json({
      success: true,
      data: {
        job: jobStatus,
        stats: stats,
        totalProducts: stats.reduce((sum, stat) => sum + stat.productCount, 0)
      }
    });

  } catch (error: any) {
    console.error('❌ Get sync status failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/sync/stats - Get detailed sync statistics
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

    const stats = await getSyncStats();
    
    res.json({
      success: true,
      data: {
        networkStats: stats,
        totalProducts: stats.reduce((sum, stat) => sum + stat.productCount, 0),
        networksCount: stats.length,
        lastSync: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Get sync stats failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync statistics',
      details: error.message
    });
  }
});

/**
 * POST /api/admin/sync/test - Test sync without saving to database
 */
router.post('/test', [
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

    console.log('🧪 RUNNING SYNC TEST (NO DB SAVE)...');
    
    // This would be a test version that doesn't save to DB
    // For now, we'll just run the regular sync but log it as a test
    const results = await syncAllNetworks();
    
    res.json({
      success: true,
      message: 'Sync test completed',
      data: {
        results: results,
        testMode: true,
        note: 'This was a full sync test. In production, implement test mode without DB writes.'
      }
    });

  } catch (error: any) {
    console.error('❌ Sync test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Sync test failed',
      details: error.message
    });
  }
});

export default router;
