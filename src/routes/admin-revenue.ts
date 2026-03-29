/**
 * ADMIN REVENUE TRACKING ENDPOINT
 * Provides visibility into token sales and revenue metrics
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import { monitoringService } from '../services/monitoring.service';

const router = Router();

/**
 * GET /api/admin/revenue - Get revenue and token sales metrics
 */
router.get('/revenue', [
  authMiddleware
], async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      await monitoringService.incrementMetric('admin_revenue_unauthorized', String(req.user?.id));
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden - Admin access required' 
      });
    }

    console.log('📊 ADMIN REVENUE REQUEST:', { adminId: req.user!.id });

    // Get total revenue from token purchases
    const revenueData = await prisma.transaction.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: {
        source: 'token_purchase',
        type: 'debit',
        status: 'completed'
      }
    });

    // Get total tokens sold
    const tokensSoldData = await prisma.wallet.aggregate({
      _sum: { totalTokensBought: true },
      _count: { id: true },
      where: {
        totalTokensBought: { gt: 0 }
      }
    });

    // Get total tokens spent
    const tokensSpentData = await prisma.wallet.aggregate({
      _sum: { totalTokensSpent: true },
      _count: { id: true },
      where: {
        totalTokensSpent: { gt: 0 }
      }
    });

    // Get revenue by month (last 12 months)
    const monthlyRevenue = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        SUM(amount) as revenue,
        COUNT(*) as transactions
      FROM "Transaction" 
      WHERE 
        source = 'token_purchase' 
        AND type = 'debit' 
        AND status = 'completed'
        AND "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
    `;

    // Get top token buyers
    const topBuyers = await prisma.wallet.findMany({
      select: {
        userId: true,
        totalTokensBought: true,
        user: {
          select: {
            email: true,
            name: true
          }
        }
      },
      where: {
        totalTokensBought: { gt: 0 }
      },
      orderBy: {
        totalTokensBought: 'desc'
      },
      take: 10
    });

    // Get recent token purchases
    const recentPurchases = await prisma.transaction.findMany({
      where: {
        source: 'token_purchase',
        type: 'debit',
        status: 'completed'
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    const metrics = {
      totalRevenue: revenueData._sum.amount || 0,
      totalTransactions: revenueData._count.id || 0,
      totalTokensSold: tokensSoldData._sum.totalTokensBought || 0,
      totalTokensSpent: tokensSpentData._sum.totalTokensSpent || 0,
      activeTokenHolders: tokensSoldData._count.id || 0,
      averageTokensPerUser: tokensSoldData._count.id > 0 ? 
        Math.round((tokensSoldData._sum.totalTokensBought || 0) / tokensSoldData._count.id) : 0,
      averageRevenuePerTransaction: revenueData._count.id > 0 ? 
        Math.round((revenueData._sum.amount || 0) / revenueData._count.id) : 0
    };

    console.log('📊 REVENUE METRICS CALCULATED:', metrics);

    res.json({
      success: true,
      data: {
        summary: metrics,
        monthlyRevenue: monthlyRevenue.map((item: any) => ({
          month: item.month,
          revenue: Number(item.revenue),
          transactions: Number(item.transactions)
        })),
        topBuyers: topBuyers.map(buyer => ({
          userId: buyer.userId,
          email: buyer.user?.email,
          name: buyer.user?.name,
          tokensBought: buyer.totalTokensBought
        })),
        recentPurchases: recentPurchases.map(purchase => ({
          id: purchase.id,
          userId: purchase.userId,
          userEmail: purchase.user?.email,
          userName: purchase.user?.name,
          amount: purchase.amount,
          description: purchase.description,
          createdAt: purchase.createdAt
        }))
      }
    });

  } catch (error: any) {
    console.error('❌ ADMIN REVENUE ERROR:', error);
    
    await monitoringService.incrementMetric('admin_revenue_error', String(req.user?.id), {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue data',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/revenue/users - Get user token statistics
 */
router.get('/revenue/users', [
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

    // Get user token statistics
    const userStats = await prisma.wallet.findMany({
      select: {
        userId: true,
        balance: true,
        tokens: true,
        totalTokensBought: true,
        totalTokensSpent: true,
        user: {
          select: {
            email: true,
            name: true,
            createdAt: true
          }
        }
      },
      where: {
        OR: [
          { tokens: { gt: 0 } },
          { totalTokensBought: { gt: 0 } },
          { balance: { gt: 0 } }
        ]
      },
      orderBy: {
        totalTokensBought: 'desc'
      }
    });

    res.json({
      success: true,
      data: {
        users: userStats.map(stat => ({
          userId: stat.userId,
          email: stat.user?.email,
          name: stat.user?.name,
          balance: stat.balance,
          tokens: stat.tokens,
          totalTokensBought: stat.totalTokensBought,
          totalTokensSpent: stat.totalTokensSpent,
          netTokens: stat.tokens,
          userSince: stat.user?.createdAt
        })),
        total: userStats.length
      }
    });

  } catch (error: any) {
    console.error('❌ ADMIN USER STATS ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics',
      details: error.message
    });
  }
});

export default router;
