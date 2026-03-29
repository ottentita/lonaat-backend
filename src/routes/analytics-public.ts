import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

// DISABLED: Duplicate of /api/analytics/summary - avoid route conflict
/*
router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Build filter
    const where: any = {};
    if (req.user?.role !== 'admin') {
      const userIdNum = Number(userId);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      where.user_id = userIdNum;
    }

    // Get total clicks
    const totalClicks = await prisma.clicks.count({ where });

    // Get clicks today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const clicksToday = await prisma.clicks.count({
      where: {
        ...where,
        createdAt: { gte: todayStart },
      },
    });

    // Get clicks this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const clicksThisWeek = await prisma.clicks.count({
      where: {
        ...where,
        createdAt: { gte: weekStart },
      },
    });

    // Get unique products clicked
    const uniqueProducts = await prisma.clicks.groupBy({
      by: ['offerId'],
      where,
    });

    // Get unique networks
    const uniqueNetworks = await prisma.clicks.groupBy({
      by: ['network'],
      where,
    });

    // Get most recent clicks
    const recentClicks = await prisma.clicks.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const summary = {
      totalClicks,
      clicksToday,
      clicksThisWeek,
      uniqueProducts: uniqueProducts.length,
      uniqueNetworks: uniqueNetworks.length,
      recentClicks,
    };

    return res.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('❌ ANALYTICS SUMMARY - Error:', error);
    res.status(500).json({ success: false, error: 'Failed to load summary' });
  }
});
*/

// GET /analytics/top-products - Get top performing products
router.get('/top-products', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const limit = Number(req.query.limit) || 10;

    // Build filter
    const where: any = {};
    if (req.user?.role !== 'admin') {
      const userIdNum = Number(userId);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      where.user_id = userIdNum;
    }

    // Get clicks grouped by product
    const productClicks = await prisma.clicks.groupBy({
      by: ['offerId', 'network'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: limit,
    });

    // Get the most recent click for each product to get details
    const topProducts = await Promise.all(
      productClicks.map(async (item) => {
        const recentClick = await prisma.clicks.findFirst({
          where: {
            offerId: item.offerId,
            network: item.network,
          },
          orderBy: { createdAt: 'desc' },
        });

        return {
          productId: item.offerId,
          network: item.network,
          clicks: item._count.id,
          lastClicked: recentClick?.createdAt,
        };
      })
    );

    return res.json({ success: true, data: { topProducts } });
  } catch (error: any) {
    console.error('❌ ANALYTICS TOP PRODUCTS - Error:', error);
    res.status(500).json({ success: false, error: 'Failed to load top products' });
  }
});

// GET /analytics/networks - Get network performance statistics
router.get('/networks', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Build filter
    const where: any = {};
    if (req.user?.role !== 'admin') {
      const userIdNum = Number(userId);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      where.user_id = userIdNum;
    }

    // Get clicks grouped by network
    const networkStats = await prisma.clicks.groupBy({
      by: ['network'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    // Calculate total clicks
    const totalClicks = networkStats.reduce((sum, item) => sum + item._count.id, 0);

    // Format response with percentages
    const networks = networkStats.map((item) => ({
      network: item.network,
      clicks: item._count.id,
      percentage: totalClicks > 0 ? ((item._count.id / totalClicks) * 100).toFixed(2) : '0.00',
    }));

    const result = {
      networks,
      totalClicks,
      bestNetwork: networks[0] || null,
    };

    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('❌ ANALYTICS NETWORKS - Error:', error);
    res.status(500).json({ success: false, error: 'Failed to load networks' });
  }
});

// GET /analytics/trends - Get click trends over time
router.get('/trends', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const days = Number(req.query.days) || 7;

    // Build filter
    const where: any = {
      createdAt: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
    };

    if (req.user?.role !== 'admin') {
      const userIdNum = Number(userId);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      where.user_id = userIdNum;
    }

    // Get all clicks in the date range
    const clicks = await prisma.clicks.findMany({
      where,
      select: {
        createdAt: true,
        network: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const dailyClicks: Record<string, number> = {};
    const networkDaily: Record<string, Record<string, number>> = {};

    clicks.forEach((click) => {
      const date = click.createdAt.toISOString().split('T')[0];
      
      // Total daily clicks
      dailyClicks[date] = (dailyClicks[date] || 0) + 1;

      // Network daily clicks
      if (click.network && !networkDaily[click.network]) {
        networkDaily[click.network] = {};
      }
      if (click.network) {
        networkDaily[click.network][date] = (networkDaily[click.network][date] || 0) + 1;
      }
    });

    // Format for chart
    const trends = Object.entries(dailyClicks).map(([date, count]) => ({
      date,
      clicks: count,
    }));

    const result = {
      trends,
      networkTrends: networkDaily,
      totalClicks: clicks.length,
    };

    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('❌ ANALYTICS TRENDS - Error:', error);
    res.status(500).json({ success: false, error: 'Failed to load trends' });
  }
});

export default router;
