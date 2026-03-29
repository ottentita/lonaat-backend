import express from 'express';
import { prisma } from '../prisma';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// GET /api/analytics/dashboard - Get analytics dashboard data
router.get('/dashboard', authMiddleware, async (req: any, res: express.Response) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ANALYTICS DASHBOARD REQUEST');
  console.log('👤 User ID:', req.user?.userId || req.user?.id);
  
  try {
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      console.error('❌ Missing user ID from token');
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    console.log('📊 Fetching analytics data...');
    
    // 1. Total Clicks
    console.log('🔍 Querying total clicks...');
    const userIdNum = Number(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const totalClicksData = await prisma.clicks.aggregate({
      where: { user_id: userIdNum },
      _count: { id: true },
      _sum: { revenue: true }
    });
    
    const totalClicks = totalClicksData?._count?.id ?? 0;
    const clickRevenue = parseFloat(totalClicksData._sum.revenue?.toString() || '0');
    
    console.log('✅ Total clicks:', totalClicks);
    console.log('💰 Click revenue:', clickRevenue);
    
    // 2. Total Earnings
    console.log('🔍 Querying total earnings...');
    const earningsData = await prisma.commissions.aggregate({
      where: { user_id: userIdNum },
      _sum: { amount: true },
      _count: { id: true }
    }).catch((err) => {
      console.error('❌ DB ERROR [commissions.aggregate - earnings]:', err);
      return { _sum: { amount: null }, _count: { id: 0 } };
    });
    
    const totalEarnings = parseFloat(earningsData._sum.amount?.toString() || '0');
    const earningsCount = earningsData?._count?.id ?? 0;
    
    console.log('✅ Total earnings:', totalEarnings);
    console.log('📊 Earnings count:', earningsCount);
    
    // 3. Pending Earnings
    console.log('🔍 Querying pending earnings...');
    const pendingEarningsData = await prisma.commissions.aggregate({
      where: { 
        user_id: userIdNum,
        status: 'pending'
      },
      _sum: { amount: true },
      _count: { id: true }
    }).catch((err) => {
      console.error('❌ DB ERROR [commissions.aggregate - pending]:', err);
      return { _sum: { amount: null }, _count: { id: 0 } };
    });
    
    const pendingEarnings = parseFloat(pendingEarningsData._sum.amount?.toString() || '0');
    const pendingCount = pendingEarningsData?._count?.id ?? 0;
    
    console.log('✅ Pending earnings:', pendingEarnings);
    
    // 4. Conversion Rate
    console.log('🔍 Calculating conversion rate...');
    const conversionsCount = await prisma.clicks.count({
      where: { 
        user_id: userIdNum,
        converted: true 
      }
    });
    
    const conversionRate = totalClicks > 0 
      ? ((conversionsCount / totalClicks) * 100).toFixed(2)
      : '0.00';
    
    console.log('✅ Conversions:', conversionsCount);
    console.log('📈 Conversion rate:', conversionRate + '%');
    
    // 5. Top Products by Clicks
    console.log('🔍 Querying top products by clicks...');
    const topProductsByClicks = await prisma.clicks.groupBy({
      by: ['offerId'],
      where: { user_id: userIdNum },
      _count: { id: true },
      _sum: { revenue: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });
    
    console.log('✅ Found', topProductsByClicks.length, 'top products by clicks');
    
    // Get product details for top products
    const productIds = topProductsByClicks.map(p => p.offerId);
    const products = await prisma.offers.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        title: true,
        payout: true,
        network: true,
        images: true
      }
    });
    
    // Map products with click data
    const topProducts = topProductsByClicks.map(clickData => {
      const product = products.find(p => p.id === clickData.offerId);
      return {
        product_id: clickData.offerId,
        product_name: product?.name || product?.title || 'Unknown Product',
        network: product?.network || null,
        payout: product?.payout ? parseFloat(product.payout.toString()) : 0,
        image: product?.images || null,
        total_clicks: clickData?._count?.id ?? 0,
        total_revenue: parseFloat(clickData._sum.revenue?.toString() || '0')
      };
    });
    
    console.log('✅ Top products mapped');
    
    // 6. Top Products by Earnings
    console.log('🔍 Querying top products by earnings...');
    const topProductsByEarnings = await prisma.commissions.groupBy({
      by: ['product_id'],
      where: { 
        user_id: userIdNum,
        status: 'approved'
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5
    }).catch((err) => {
      console.error('❌ DB ERROR [commissions.groupBy]:', err);
      return [];
    });
    
    console.log('✅ Found', topProductsByEarnings.length, 'top products by earnings');
    
    // Get product details for top earning products
    const earningProductIds = topProductsByEarnings
      .map(p => p.product_id)
      .filter((id): id is number => id !== null);
    
    const earningProducts = await prisma.offers.findMany({
      where: { id: { in: earningProductIds } },
      select: {
        id: true,
        name: true,
        title: true,
        payout: true,
        network: true,
        images: true
      }
    });
    
    const topEarningProducts = topProductsByEarnings.map(earningData => {
      const product = earningProducts.find(p => p.id === earningData.product_id);
      return {
        product_id: earningData.product_id,
        product_name: product?.name || product?.title || 'Unknown Product',
        network: product?.network || null,
        payout: product?.payout ? parseFloat(product.payout.toString()) : 0,
        image: product?.images || null,
        total_earnings: parseFloat(earningData._sum.amount?.toString() || '0'),
        earnings_count: earningData?._count?.id ?? 0
      };
    });
    
    console.log('✅ Top earning products mapped');
    
    // 7. Recent Activity
    console.log('🔍 Querying recent activity...');
    const recentClicks = await prisma.clicks.findMany({
      where: { user_id: userIdNum },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        offerId: true,
        createdAt: true,
        converted: true,
        revenue: true,
        network: true
      }
    });
    
    console.log('✅ Found', recentClicks.length, 'recent clicks');
    
    // Build dashboard response
    const dashboard = {
      summary: {
        total_clicks: totalClicks,
        total_earnings: totalEarnings,
        pending_earnings: pendingEarnings,
        conversion_rate: parseFloat(conversionRate),
        conversions: conversionsCount,
        earnings_count: earningsCount,
        pending_count: pendingCount
      },
      top_products_by_clicks: topProducts,
      top_products_by_earnings: topEarningProducts,
      recent_activity: recentClicks.map(click => ({
        id: click.id,
        product_id: click.offerId,
        created_at: click.createdAt,
        converted: click.converted,
        revenue: parseFloat(click.revenue.toString()),
        network: click.network
      }))
    };
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ANALYTICS DASHBOARD COMPLETE');
    console.log('📊 Total Clicks:', totalClicks);
    console.log('💰 Total Earnings:', totalEarnings);
    console.log('📈 Conversion Rate:', conversionRate + '%');
    console.log('🏆 Top Products:', topProducts.length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return res.status(200).json({
      success: true,
      dashboard
    });
    
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ANALYTICS DASHBOARD ERROR:');
    console.error('📝 Message:', error?.message);
    console.error('📚 Stack:', error?.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return res.status(500).json({
      error: 'Failed to get analytics dashboard',
      message: error?.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
});

export default router;
