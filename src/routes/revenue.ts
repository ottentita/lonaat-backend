import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireProPlan } from '../middleware/subscription';
import { RevenueService } from '../services/revenue.service';

const router = express.Router();

// GET /api/revenue - Root handler
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Return basic revenue summary
    res.json({
      success: true,
      message: 'Revenue API active',
      endpoints: [
        'GET /api/revenue/metrics',
        'GET /api/revenue/growth',
        'GET /api/revenue/activity',
        'GET /api/revenue/plans'
      ],
      data: {
        totalRevenue: 0,
        monthlyRevenue: 0,
        revenueGrowth: 0,
        activeSubscriptions: 0
      }
    });
  } catch (error) {
    console.error('Error in revenue root:', error);
    res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

// GET /api/revenue/metrics
// Get comprehensive revenue metrics
router.get('/metrics', authMiddleware, async (req: AuthRequest, res) => {
  try {
    console.log('📊 REVENUE METRICS - Request received');
    
    try {
      const metrics = await RevenueService.getRevenueMetrics();
      res.json({ success: true, data: metrics });
    } catch (error) {
      console.log('⚠️ REVENUE METRICS - Service unavailable, returning zeros');
      res.json({
        success: true,
        data: {
          totalRevenue: 0,
          monthlyRevenue: 0,
          revenueGrowth: 0,
          activeSubscriptions: 0,
        }
      });
    }
  } catch (error) {
    console.error('Error fetching revenue metrics:', error);
    res.status(500).json({ error: 'Failed to fetch revenue metrics' });
  }
});

// GET /api/revenue/growth
// Get subscriber growth data
router.get('/growth', authMiddleware, async (req: AuthRequest, res) => {
  try {
    console.log('📊 REVENUE GROWTH - Request received');
    
    try {
      const growth = await RevenueService.getSubscriberGrowth();
      res.json({ success: true, data: growth });
    } catch (error) {
      console.log('⚠️ REVENUE GROWTH - Service unavailable, returning empty');
      res.json({
        success: true,
        data: []
      });
    }
  } catch (error) {
    console.error('Error fetching growth data:', error);
    res.status(500).json({ error: 'Failed to fetch growth data' });
  }
});

// GET /api/revenue/activity
// Get recent subscription activity
router.get('/activity', authMiddleware, async (req: AuthRequest, res) => {
  try {
    console.log('📊 REVENUE ACTIVITY - Request received');
    
    try {
      const limit = Number(req.query.limit) || 10;
      const activity = await RevenueService.getRecentActivity(limit);
      res.json({ success: true, data: activity });
    } catch (error) {
      console.log('⚠️ REVENUE ACTIVITY - Service unavailable, returning empty');
      res.json({
        success: true,
        data: []
      });
    }
  } catch (error) {
    console.error('Error fetching activity data:', error);
    res.status(500).json({ error: 'Failed to fetch activity data' });
  }
});

// GET /api/revenue/plans
// Get plan distribution (Admin only)
router.get('/plans', authMiddleware, requireProPlan, async (req: AuthRequest, res) => {
  try {
    // Only allow admin users to access revenue data
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const distribution = await RevenueService.getPlanDistribution();
    
    // Calculate percentages
    const totalUsers = distribution.reduce((sum, plan) => sum + plan.count, 0);
    const distributionWithPercentage = distribution.map(plan => ({
      ...plan,
      percentage: totalUsers > 0 ? Math.round((plan.count / totalUsers) * 100) : 0
    }));

    res.json({ success: true, data: distributionWithPercentage });
  } catch (error) {
    console.error('Error fetching plan distribution:', error);
    res.status(500).json({ error: 'Failed to fetch plan distribution' });
  }
});

export default router;
