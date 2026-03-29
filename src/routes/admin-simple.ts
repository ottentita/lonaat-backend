import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Admin-only middleware
const adminOnly = (req: AuthRequest, res: Response, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.use(authMiddleware);
router.use(adminOnly);

// GET /api/admin - Root admin endpoint
router.get('/', async (req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    message: 'Admin API active',
    endpoints: [
      'GET /api/admin/summary',
      'GET /api/admin/users'
    ]
  });
});

// Shared handler for dashboard/summary
const getDashboardData = async (req: AuthRequest, res: Response) => {
  try {
    const [userCount, productCount, walletCount] = await Promise.all([
      prisma.user.count().catch((err) => { console.error('❌ DB ERROR [dashboard.user.count]:', err); return 0; }),
      prisma.products.count({ where: { is_active: true } }).catch((err) => { console.error('❌ DB ERROR [dashboard.products.count]:', err); return 0; }),
      prisma.wallets.count().catch((err) => { console.error('❌ DB ERROR [dashboard.wallets.count]:', err); return 0; })
    ]);

    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        createdAt: true 
      }
    });

    return res.json({
      success: true,
      data: {
        userCount: userCount ?? 0,
        productCount: productCount ?? 0,
        walletCount: walletCount ?? 0,
        recentUsers: recentUsers ?? []
      }
    });
  } catch (error: any) {
    console.error('❌ ADMIN DASHBOARD ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get admin dashboard'
    });
  }
};

// GET /api/admin/dashboard - Admin dashboard (primary endpoint)
router.get('/dashboard', getDashboardData);

// GET /api/admin/summary - Admin dashboard summary (alias)
router.get('/summary', getDashboardData);

// GET /api/admin/users - List all users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          plan: true,
          tokenBalance: true,
          createdAt: true
        }
      }).catch((err) => { console.error('❌ DB ERROR [users.findMany]:', err); return []; }),
      prisma.user.count().catch((err) => { console.error('❌ DB ERROR [users.count]:', err); return 0; })
    ]);

    return res.json({
      success: true,
      users: users ?? [],
      data: {
        users: users ?? [],
        pagination: {
          page,
          limit,
          total: total ?? 0,
          pages: Math.ceil((total ?? 0) / limit)
        }
      }
    });
  } catch (error: any) {
    console.error('❌ ADMIN USERS ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get users'
    });
  }
});

// GET /api/admin/payments - Payment monitoring
router.get('/payments', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 50;

    // Get recent transactions
    const transactions: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1`,
      limit
    );

    // Get payment stats
    const stats: any[] = await prisma.$queryRawUnsafe(
      `SELECT 
        COUNT(*)::int as total_count,
        COALESCE(SUM(amount), 0)::float as total_amount
       FROM transactions`
    );

    return res.json({
      success: true,
      payments: transactions ?? [],
      stats: stats?.[0] ?? { total_count: 0, total_amount: 0 }
    });
  } catch (error: any) {
    console.error('❌ ADMIN PAYMENTS ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get payments'
    });
  }
});

// GET /api/admin/listings - Listings approvals
router.get('/listings', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 50;

    // Get recent products (listings)
    const products = await prisma.products.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        is_active: true,
        featured: true,
        views: true,
        clicks: true,
        created_at: true,
        user_id: true
      }
    });

    // Get product stats
    const [totalCount, activeCount, pendingCount] = await Promise.all([
      prisma.products.count().catch((err) => { console.error('❌ DB ERROR [listings.total.count]:', err); return 0; }),
      prisma.products.count({ where: { is_active: true } }).catch((err) => { console.error('❌ DB ERROR [listings.active.count]:', err); return 0; }),
      prisma.products.count({ where: { is_active: false } }).catch((err) => { console.error('❌ DB ERROR [listings.pending.count]:', err); return 0; })
    ]);

    return res.json({
      success: true,
      listings: (products ?? []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category,
        status: p.is_active ? 'approved' : 'pending',
        featured: p.featured ?? false,
        views: p.views ?? 0,
        clicks: p.clicks ?? 0,
        createdAt: p.created_at,
        userId: p.user_id
      })),
      stats: {
        total: totalCount ?? 0,
        active: activeCount ?? 0,
        pending: pendingCount ?? 0
      }
    });
  } catch (error: any) {
    console.error('❌ ADMIN LISTINGS ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get listings'
    });
  }
});

// GET /api/admin/analytics - Analytics overview
router.get('/analytics', async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalClicks,
      totalProducts,
      totalUsers,
      activeUsers
    ] = await Promise.all([
      prisma.clicks.count().catch((err) => { console.error('❌ DB ERROR [analytics.clicks.count]:', err); return 0; }),
      prisma.products.count().catch((err) => { console.error('❌ DB ERROR [analytics.products.count]:', err); return 0; }),
      prisma.user.count().catch((err) => { console.error('❌ DB ERROR [analytics.users.count]:', err); return 0; }),
      prisma.user.count({ where: { isActive: true } }).catch((err) => { console.error('❌ DB ERROR [analytics.activeUsers.count]:', err); return 0; })
    ]);

    // Get recent activity
    const recentClicks: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM clicks ORDER BY created_at DESC LIMIT 10`
    );

    return res.json({
      success: true,
      data: {
        totalClicks: totalClicks ?? 0,
        totalProducts: totalProducts ?? 0,
        totalUsers: totalUsers ?? 0,
        activeUsers: activeUsers ?? 0,
        recentActivity: recentClicks ?? []
      }
    });
  } catch (error: any) {
    console.error('❌ ADMIN ANALYTICS ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get analytics'
    });
  }
});

// GET /api/admin/config - Platform configuration
router.get('/config', async (req: AuthRequest, res: Response) => {
  try {
    const config = {
      platform: {
        name: 'Lonaat',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      features: {
        affiliateTracking: true,
        productListings: true,
        walletSystem: true,
        adminPanel: true
      },
      stats: {
        uptime: process.uptime(),
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      }
    };

    return res.json({
      success: true,
      config
    });
  } catch (error: any) {
    console.error('❌ ADMIN CONFIG ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get config'
    });
  }
});

export default router;
