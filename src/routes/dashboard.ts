import { Router } from 'express'
import prisma from '../prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/dashboard/stats - Get stats for authenticated user
router.get('/stats', authMiddleware, async (req: AuthRequest, res) => {
  try {
    console.log('📊 DASHBOARD STATS - Request received');
    
    // authMiddleware already validated token and attached req.user with numeric userId
    if (!req.user || !req.user.userId) {
      console.error('❌ DASHBOARD STATS - No user attached by middleware');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.userId;  // Already validated as numeric by authMiddleware
    console.log('✅ DASHBOARD STATS - User ID:', userId, typeof userId);

    // PHASE 3 FIX 3: Safe Prisma query with numeric ID
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      console.log('❌ DASHBOARD STATS - User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    // PRODUCTION: Real database queries - NO MOCK DATA
    console.log('📊 Computing real stats from database...');
    
    // Get real counts from database
    const totalProducts = await prisma.products.count();
    const totalClicks = await prisma.product_clicks.count({ where: { userId: String(userId) } });
    const totalConversions = await prisma.commissions.count({ where: { user_id: userId } });
    
    // Calculate total earnings from commissions
    const commissions = await prisma.commissions.findMany({
      where: { user_id: userId },
      select: { amount: true }
    });
    const totalEarnings = commissions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    
    // Calculate conversion rate
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    
    // Get top products by clicks
    const topProducts = await prisma.products.findMany({
      take: 4,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        price: true
      }
    });
    
    // Get recent activity (clicks)
    const recentClicks = await prisma.product_clicks.findMany({
      where: { userId: String(userId) },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    
    const stats = {
      totalEarnings: Number(totalEarnings.toFixed(2)),
      totalClicks,
      totalConversions,
      conversionRate: Number(conversionRate.toFixed(2)),
      totalProducts,
      earningsChange: 0, // TODO: Calculate from historical data
      clicksChange: 0,
      conversionsChange: 0,
      topProducts: topProducts.map(p => ({
        id: String(p.id),
        name: p.name,
        earnings: Number(p.price) || 0,
        conversions: 0 // TODO: Calculate from commissions
      })),
      recentActivity: recentClicks.map(c => ({
        id: String(c.id),
        type: 'click',
        product: 'Product',
        timestamp: c.createdAt.toISOString()
      }))
    };
    
    console.log('✅ Real stats computed:', { totalEarnings, totalClicks, totalConversions, totalProducts });

    console.log('✅ DASHBOARD STATS - Returning stats for user:', user.email);
    return res.json(stats);
  } catch (err) {
    console.error('❌ DASHBOARD STATS ERROR:', err);
    console.error('Stack:', err instanceof Error ? err.stack : 'No stack');
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err instanceof Error ? err.message : String(err)
    });
  }
});

// GET /api/dashboard/stats/:userId - Legacy endpoint (kept for compatibility)
router.get('/stats/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId)
    if (Number.isNaN(userId)) return res.status(400).json({ message: 'Invalid userId' })

    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) return res.status(404).json({ message: 'User not found' })

    // Count commissions (used as conversions/credits for this user)
    const totalConversions = await prisma.commissions.count({ where: { user_id: userId } })

    // Map Prisma snake_case fields to camelCase for frontend
    const response = {
      balance: Number(user.balance || 0),
      pendingEarnings: Number((user as any).pending_earnings || 0),
      withdrawableBalance: Number((user as any).withdrawable_balance || 0),
      totalConversions
    }

    return res.json(response)
  } catch (err) {
    console.error('Dashboard stats error', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
