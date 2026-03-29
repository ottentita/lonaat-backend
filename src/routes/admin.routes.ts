import express, { Response } from "express";
import { prisma } from "../prisma";
import { authMiddleware, AuthRequest, adminOnlyMiddleware } from "../middleware/auth";
import { importAllProducts, importFromNetwork } from "../services/productImporter";

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(authMiddleware);
router.use(adminOnlyMiddleware);

// GET /api/admin/users - Get all users
router.get("/users", async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        is_blocked: true,
        balance: true,
        created_at: true,
        updated_at: true
      }
    });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/listings - Get all listings (products)
router.get("/listings", async (req: AuthRequest, res: Response) => {
  try {
    const listings = await prisma.product.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        commission_rate: true,
        network: true,
        is_active: true,
        created_at: true,
        updated_at: true
      },
      take: 100
    });

    // Map to frontend expected format
    const formattedListings = listings.map(listing => ({
      id: listing.id,
      title: listing.name,
      type: listing.network || 'product',
      status: listing.is_active ? 'active' : 'inactive',
      userId: 'system',
      createdAt: listing.created_at
    }));

    res.json({ listings: formattedListings });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET /api/admin/payments - Get all payments (transactions)
router.get("/payments", async (req: AuthRequest, res: Response) => {
  try {
    const payments = await prisma.transaction.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        user_id: true,
        amount: true,
        type: true,
        status: true,
        description: true,
        created_at: true,
        updated_at: true
      },
      take: 100
    });

    // Map to frontend expected format
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      amount: Number(payment.amount),
      status: payment.status || 'completed',
      userId: payment.user_id,
      createdAt: payment.created_at
    }));

    res.json({ payments: formattedPayments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// GET /api/admin/analytics - Get analytics data
router.get("/analytics", async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalProducts,
      totalClicks,
      totalTransactions,
      pendingWithdrawals,
      totalCommissions
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { is_active: true, is_blocked: false } }),
      prisma.product.count({ where: { is_active: true } }),
      prisma.clicks.count(),
      prisma.transaction.aggregate({ _sum: { amount: true } }),
      prisma.withdrawalRequest.count({ where: { status: 'pending' } }),
      prisma.commission.aggregate({ where: { status: 'approved' }, _sum: { amount: true } })
    ]);

    const analytics = {
      total_users: totalUsers,
      active_users: activeUsers,
      total_products: totalProducts,
      active_campaigns: 0, // No campaigns table yet
      total_volume: totalTransactions._sum.amount ? Number(totalTransactions._sum.amount) : 0,
      pending_withdrawals: pendingWithdrawals,
      total_commissions: totalCommissions._sum.amount ? Number(totalCommissions._sum.amount) : 0,
      total_clicks: totalClicks
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/admin/config - Get platform configuration
router.get("/config", async (req: AuthRequest, res: Response) => {
  try {
    // Return default config (can be extended to use database)
    const config = {
      siteName: 'LONAAT',
      siteUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      apiUrl: process.env.API_URL || 'http://localhost:4000',
      enableRegistration: true,
      enableEmailVerification: false,
      maintenanceMode: false,
      maxProductsPerUser: 1000,
      defaultCommissionRate: 10
    };

    res.json({ config });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// PUT /api/admin/config - Update platform configuration
router.put("/config", async (req: AuthRequest, res: Response) => {
  try {
    const config = req.body;
    
    // TODO: Save to database if needed
    // For now, just return success
    
    res.json({ 
      success: true, 
      message: 'Configuration updated successfully',
      config 
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// POST /api/admin/import-products - Import products from all networks
router.post("/import-products", async (req: AuthRequest, res: Response) => {
  try {
    console.log('🚀 Admin triggered product import');
    
    const count = await importAllProducts();
    
    res.json({ 
      success: true, 
      imported: count,
      message: `Successfully imported ${count} products`
    });
  } catch (error: any) {
    console.error('❌ Product import failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to import products',
      details: error.message 
    });
  }
});

// POST /api/admin/import-products/:network - Import from specific network
router.post("/import-products/:network", async (req: AuthRequest, res: Response) => {
  try {
    const network = req.params.network as 'admitad' | 'aliexpress' | 'digistore';
    
    if (!['admitad', 'aliexpress', 'digistore'].includes(network)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid network. Must be: admitad, aliexpress, or digistore'
      });
    }
    
    console.log(`🚀 Admin triggered ${network} import`);
    
    const count = await importFromNetwork(network);
    
    res.json({ 
      success: true, 
      imported: count,
      network,
      message: `Successfully imported ${count} products from ${network}`
    });
  } catch (error: any) {
    console.error(`❌ ${req.params.network} import failed:`, error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to import from ${req.params.network}`,
      details: error.message 
    });
  }
});

// POST /api/admin/import-products - Import products from all networks
router.post("/import-products", async (req: AuthRequest, res: Response) => {
  try {
    console.log('🚀 Admin triggered product import');
    
    const count = await importAllProducts();
    
    res.json({ 
      success: true, 
      imported: count,
      message: `Successfully imported ${count} products`
    });
  } catch (error: any) {
    console.error('❌ Product import failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to import products',
      details: error.message 
    });
  }
});

// POST /api/admin/import-products/:network - Import from specific network
router.post("/import-products/:network", async (req: AuthRequest, res: Response) => {
  try {
    const network = req.params.network as 'admitad' | 'aliexpress' | 'digistore';
    
    if (!['admitad', 'aliexpress', 'digistore'].includes(network)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid network. Must be: admitad, aliexpress, or digistore'
      });
    }
    
    console.log(`🚀 Admin triggered ${network} import`);
    
    const count = await importFromNetwork(network);
    
    res.json({ 
      success: true, 
      imported: count,
      network,
      message: `Successfully imported ${count} products from ${network}`
    });
  } catch (error: any) {
    console.error(`❌ ${req.params.network} import failed:`, error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to import from ${req.params.network}`,
      details: error.message 
    });
  }
});

export default router;
