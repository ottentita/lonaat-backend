import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest, adminOnlyMiddleware } from '../middleware/auth';
import { processAIJob, processPendingJobs, discoverProducts, searchProducts, importDiscoveredProducts, detectFraud, runFraudScan, autoBoostAdminProducts, scanNetworksForProducts, autoImportAliExpressProducts, runAIAutoImportCycle } from '../services/ai';
import { syncAllNetworks, syncDigistore24Products, syncAwinProducts, syncMyLeadProducts, syncPartnerStackProducts, getNetworkStatus } from '../services/networkSync';
import { generateGrowthReport, rankProducts, getAIRecommendations } from '../services/growthEngine';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);
router.use(adminOnlyMiddleware);

router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      userCount,
      activeUserCount,
      productCount,
      campaignCount,
      totalTransactions,
      pendingWithdrawals,
      totalCommissions
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { is_active: true, is_blocked: false } }),
      prisma.product.count({ where: { is_active: true } }),
      prisma.adBoost.count({ where: { status: 'active' } }),
      prisma.transaction.aggregate({ _sum: { amount: true } }),
      prisma.withdrawalRequest.count({ where: { status: 'pending' } }),
      prisma.commission.aggregate({ where: { status: 'approved' }, _sum: { amount: true } })
    ]);

    const recentUsers = await prisma.user.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      select: { id: true, name: true, email: true, role: true, created_at: true, balance: true }
    });

    const recentCommissions = await prisma.commission.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      select: { id: true, amount: true, status: true, network: true, created_at: true }
    });

    res.json({
      stats: {
        total_users: userCount,
        active_users: activeUserCount,
        total_products: productCount,
        active_campaigns: campaignCount,
        total_volume: totalTransactions._sum.amount ? Number(totalTransactions._sum.amount) : 0,
        pending_withdrawals: pendingWithdrawals,
        total_commissions: totalCommissions._sum.amount ? Number(totalCommissions._sum.amount) : 0
      },
      recent_users: recentUsers,
      recent_commissions: recentCommissions
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Aggregated global admin stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    // Double-check admin role
    if (!req.user || (req.user.role || '').toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const [
      totalUsers,
      totalOffers,
      totalClicks,
      totalConversions,
      totalCommissions,
      payoutsAgg,
      revenueAgg
    ] = await Promise.all([
      prisma.user.count(),
      prisma.offer.count(),
      prisma.click.count(),
      prisma.conversion.count(),
      prisma.commission.count(),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.conversion.aggregate({ _sum: { amount: true } })
    ])

    const totalPayouts = payoutsAgg._sum.amount ? Number(payoutsAgg._sum.amount) : 0
    const totalRevenue = revenueAgg._sum.amount ? Number(revenueAgg._sum.amount) : 0

    res.json({
      totalUsers,
      totalOffers,
      totalClicks,
      totalConversions,
      totalCommissions,
      totalPayouts,
      totalRevenue
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    res.status(500).json({ error: 'Failed to compute admin stats' })
  }
})

router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      skip,
      select: {
        id: true, name: true, email: true, role: true, is_admin: true,
        balance: true, verified: true, is_active: true, is_blocked: true,
        created_at: true
      }
    });

    const total = await prisma.user.count();

    res.json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users' });
  }
});

router.get('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        transactions: { take: 10, orderBy: { created_at: 'desc' } },
        commissions: { take: 10, orderBy: { created_at: 'desc' } },
        credit_wallet: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.put('/users/:id/block', async (req: AuthRequest, res: Response) => {
  try {
    const { reason, until } = req.body;

    await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: {
        is_blocked: true,
        block_reason: reason,
        blocked_until: until ? new Date(until) : null
      }
    });

    res.json({ message: 'User blocked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to block user' });
  }
});

router.put('/users/:id/unblock', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: {
        is_blocked: false,
        block_reason: null,
        blocked_until: null
      }
    });

    res.json({ message: 'User unblocked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

router.put('/users/:id/credits', async (req: AuthRequest, res: Response) => {
  try {
    const { credits, reason } = req.body;
    const userId = parseInt(req.params.id);

    await prisma.creditWallet.upsert({
      where: { user_id: userId },
      update: {
        credits: { increment: credits },
        total_purchased: credits > 0 ? { increment: credits } : undefined
      },
      create: {
        user_id: userId,
        credits: credits,
        total_purchased: credits > 0 ? credits : 0,
        total_spent: 0
      }
    });

    await prisma.transaction.create({
      data: {
        user_id: userId,
        type: 'admin_credit',
        amount: credits,
        status: 'completed',
        description: reason || 'Admin credit adjustment',
        extra_data: { admin_id: req.user!.id }
      }
    });

    res.json({ message: `Credits ${credits > 0 ? 'added' : 'removed'} successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update credits' });
  }
});

router.get('/products', async (req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get products' });
  }
});

router.get('/campaigns', async (req: AuthRequest, res: Response) => {
  try {
    const campaigns = await prisma.adBoost.findMany({
      orderBy: { started_at: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.json({ campaigns });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
});

router.get('/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

router.get('/commissions', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.per_page as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const network = req.query.network as string;
    const search = req.query.search as string;
    const userId = req.query.user_id as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    const where: any = {};
    if (status) where.status = status;
    if (network) where.network = network;
    if (userId) where.user_id = parseInt(userId);
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate);
      if (endDate) where.created_at.lte = new Date(endDate);
    }
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const commissions = await prisma.commission.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip,
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    const total = await prisma.commission.count({ where });

    const [totalStats, pendingStats, approvedStats, paidStats, rejectedStats] = await Promise.all([
      prisma.commission.aggregate({ _sum: { amount: true }, _count: true }),
      prisma.commission.aggregate({ where: { status: 'pending' }, _sum: { amount: true }, _count: true }),
      prisma.commission.aggregate({ where: { status: 'approved' }, _sum: { amount: true } }),
      prisma.commission.aggregate({ where: { status: 'paid' }, _sum: { amount: true } }),
      prisma.commission.aggregate({ where: { status: 'rejected' }, _sum: { amount: true } })
    ]);

    res.json({
      commissions,
      summary: {
        total_amount: totalStats._sum.amount ? Number(totalStats._sum.amount) : 0,
        total_count: totalStats._count,
        pending_amount: pendingStats._sum.amount ? Number(pendingStats._sum.amount) : 0,
        pending_count: pendingStats._count,
        approved_amount: approvedStats._sum.amount ? Number(approvedStats._sum.amount) : 0,
        paid_amount: paidStats._sum.amount ? Number(paidStats._sum.amount) : 0,
        rejected_amount: rejectedStats._sum.amount ? Number(rejectedStats._sum.amount) : 0
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Admin commissions error:', error);
    res.status(500).json({ error: 'Failed to get commissions' });
  }
});

router.post('/commissions/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const commissionId = parseInt(req.params.id);
    const commission = await prisma.commission.findUnique({ where: { id: commissionId } });

    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    const updated = await prisma.commission.update({
      where: { id: commissionId },
      data: { status: 'approved', approved_at: new Date(), approved_by: req.user!.id }
    });

    await prisma.user.update({
      where: { id: commission.user_id },
      data: { balance: { increment: commission.amount } }
    });

    res.json({ message: 'Commission approved', commission: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve commission' });
  }
});

router.post('/commissions/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const commissionId = parseInt(req.params.id);

    const updated = await prisma.commission.update({
      where: { id: commissionId },
      data: { status: 'rejected', rejection_reason: reason }
    });

    res.json({ message: 'Commission rejected', commission: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject commission' });
  }
});

router.post('/commissions/:id/mark-paid', async (req: AuthRequest, res: Response) => {
  try {
    const commissionId = parseInt(req.params.id);

    const updated = await prisma.commission.update({
      where: { id: commissionId },
      data: { status: 'paid', paid_at: new Date() }
    });

    res.json({ message: 'Commission marked as paid', commission: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark commission as paid' });
  }
});

router.get('/ai/stats', async (req: AuthRequest, res: Response) => {
  try {
    const [totalJobs, completedJobs, failedJobs, pendingJobs] = await Promise.all([
      prisma.aIJob.count(),
      prisma.aIJob.count({ where: { status: 'completed' } }),
      prisma.aIJob.count({ where: { status: 'failed' } }),
      prisma.aIJob.count({ where: { status: 'pending' } })
    ]);

    res.json({
      stats: {
        total_jobs: totalJobs,
        completed_jobs: completedJobs,
        failed_jobs: failedJobs,
        pending_jobs: pendingJobs,
        success_rate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0
      }
    });
  } catch (error) {
    console.error('AI stats error:', error);
    res.json({ stats: { total_jobs: 0, completed_jobs: 0, failed_jobs: 0, pending_jobs: 0, success_rate: 0 } });
  }
});

router.get('/ai/logs', async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string;
    const jobType = req.query.job_type as string;
    const limit = parseInt(req.query.limit as string) || 50;

    const where: any = {};
    if (status) where.status = status;
    if (jobType) where.job_type = jobType;

    const logs = await prisma.aIJob.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        id: true,
        job_type: true,
        status: true,
        result: true,
        error_message: true,
        created_at: true,
        completed_at: true
      }
    });

    res.json({ logs });
  } catch (error) {
    console.error('AI logs error:', error);
    res.json({ logs: [] });
  }
});

router.get('/ai/status', async (req: AuthRequest, res: Response) => {
  try {
    const runningTasks = await prisma.aIJob.findMany({
      where: { status: 'running' },
      select: { id: true, job_type: true, created_at: true }
    });

    res.json({
      running_tasks: runningTasks,
      is_busy: runningTasks.length > 0
    });
  } catch (error) {
    console.error('AI status error:', error);
    res.json({ running_tasks: [], is_busy: false });
  }
});

router.post('/ai/run-ads/products', async (req: AuthRequest, res: Response) => {
  try {
    const { product_ids } = req.body;
    
    const job = await prisma.aIJob.create({
      data: {
        job_type: 'generate_product_ads',
        status: 'pending',
        input_data: { product_ids: product_ids || [] },
        user_id: req.user!.id
      }
    });

    processAIJob(job.id).catch(err => console.error('AI job processing error:', err));

    res.json({ message: 'Product ad generation started', job_id: job.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start task' });
  }
});

router.post('/ai/bulk-import', async (req: AuthRequest, res: Response) => {
  try {
    const { networks, generate_ads } = req.body;
    const targetNetworks = networks || ['digistore24', 'awin', 'partnerstack'];
    
    const job = await prisma.aIJob.create({
      data: {
        job_type: 'bulk_import',
        status: 'pending',
        input_data: { 
          networks: targetNetworks,
          generate_ads: generate_ads !== false
        },
        user_id: req.user!.id
      }
    });

    processAIJob(job.id).catch(err => console.error('AI bulk import error:', err));

    res.json({ 
      message: 'Bulk import started', 
      job_id: job.id,
      networks: targetNetworks,
      generate_ads: generate_ads !== false
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Failed to start bulk import' });
  }
});

router.post('/ai/run-ads/real-estate', async (req: AuthRequest, res: Response) => {
  try {
    const { property_ids } = req.body;
    
    const job = await prisma.aIJob.create({
      data: {
        job_type: 'generate_real_estate_ads',
        status: 'pending',
        input_data: { property_ids: property_ids || [] },
        user_id: req.user!.id
      }
    });

    processAIJob(job.id).catch(err => console.error('AI job processing error:', err));

    res.json({ message: 'Real estate ad generation started', job_id: job.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start task' });
  }
});

router.post('/ai/run-ads/all', async (req: AuthRequest, res: Response) => {
  try {
    const job = await prisma.aIJob.create({
      data: {
        job_type: 'generate_all_ads',
        status: 'pending',
        input_data: {},
        user_id: req.user!.id
      }
    });

    processAIJob(job.id).catch(err => console.error('AI job processing error:', err));

    res.json({ message: 'All ads generation started', job_id: job.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start task' });
  }
});

router.post('/ai/generate-ads', async (req: AuthRequest, res: Response) => {
  try {
    const { product_ids, generate_for_all } = req.body;
    
    const job = await prisma.aIJob.create({
      data: {
        job_type: 'generate_product_ads',
        status: 'pending',
        input_data: { 
          product_ids: product_ids || [],
          generate_for_all: generate_for_all || false
        },
        user_id: req.user!.id
      }
    });

    processAIJob(job.id).catch(err => console.error('AI job processing error:', err));

    res.json({ 
      success: true,
      message: 'Ad generation started', 
      job_id: job.id,
      status: 'processing'
    });
  } catch (error) {
    console.error('Generate ads error:', error);
    res.status(500).json({ error: 'Failed to start ad generation' });
  }
});

router.post('/ai/run-commission-scan', async (req: AuthRequest, res: Response) => {
  try {
    const { networks } = req.body;
    
    const job = await prisma.aIJob.create({
      data: {
        job_type: 'commission_scan',
        status: 'pending',
        input_data: { networks: networks || ['all'] },
        user_id: req.user!.id
      }
    });

    processAIJob(job.id).catch(err => console.error('AI job processing error:', err));

    res.json({ message: 'Commission scan started', job_id: job.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start task' });
  }
});

router.post('/ai/discover-products', async (req: AuthRequest, res: Response) => {
  try {
    const { category, count, auto_import, generate_ads } = req.body;
    const productCount = Math.min(count || 10, 20);

    const discovered = await discoverProducts(category, productCount);

    if (discovered.length === 0) {
      return res.status(400).json({ error: 'No products discovered' });
    }

    if (auto_import) {
      const result = await importDiscoveredProducts(discovered, req.user!.id, generate_ads !== false);
      return res.json({
        message: `Discovered and imported ${result.imported} products`,
        discovered: discovered.length,
        imported: result.imported,
        products: result.products
      });
    }

    res.json({
      message: `Discovered ${discovered.length} products`,
      products: discovered,
      hint: 'Set auto_import=true to automatically add to marketplace'
    });
  } catch (error) {
    console.error('Product discovery error:', error);
    res.status(500).json({ error: 'Failed to discover products' });
  }
});

router.post('/ai/search-products', async (req: AuthRequest, res: Response) => {
  try {
    const { query, count, auto_import, generate_ads } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const productCount = Math.min(count || 5, 10);
    const found = await searchProducts(query, productCount);

    if (found.length === 0) {
      return res.status(404).json({ error: 'No products found matching your search' });
    }

    if (auto_import) {
      const result = await importDiscoveredProducts(found, req.user!.id, generate_ads !== false);
      return res.json({
        message: `Found and imported ${result.imported} products`,
        search_query: query,
        found: found.length,
        imported: result.imported,
        products: result.products
      });
    }

    res.json({
      message: `Found ${found.length} products`,
      search_query: query,
      products: found,
      hint: 'Set auto_import=true to automatically add to marketplace'
    });
  } catch (error) {
    console.error('Product search error:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

router.post('/ai/auto-import', async (req: AuthRequest, res: Response) => {
  try {
    const { category, count, generate_ads } = req.body;
    const productCount = Math.min(count || 10, 25);

    const discovered = await discoverProducts(category, productCount);

    if (discovered.length === 0) {
      return res.status(400).json({ error: 'No products to import' });
    }

    const result = await importDiscoveredProducts(discovered, req.user!.id, generate_ads !== false);

    res.json({
      message: `Auto-imported ${result.imported} products to marketplace`,
      category: category || 'mixed',
      discovered: discovered.length,
      imported: result.imported,
      products: result.products.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
        network: p.network,
        has_ai_ad: !!p.ai_generated_ad
      }))
    });
  } catch (error) {
    console.error('Auto-import error:', error);
    res.status(500).json({ error: 'Failed to auto-import products' });
  }
});

router.post('/ai/stop-all', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.aIJob.updateMany({
      where: { status: { in: ['running', 'pending'] } },
      data: { status: 'cancelled' }
    });

    res.json({ message: 'All AI tasks stopped' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop tasks' });
  }
});

router.post('/ai/fraud-scan', async (req: AuthRequest, res: Response) => {
  try {
    const result = await runFraudScan();
    res.json({
      message: 'Fraud scan completed',
      ...result
    });
  } catch (error) {
    console.error('Fraud scan error:', error);
    res.status(500).json({ error: 'Failed to run fraud scan' });
  }
});

router.get('/ai/fraud-check/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const result = await detectFraud(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check fraud' });
  }
});

router.get('/ai/growth-report/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const report = await generateGrowthReport(userId);
    res.json({ report });
  } catch (error) {
    console.error('Growth report error:', error);
    res.status(500).json({ error: 'Failed to generate growth report' });
  }
});

router.get('/ai/product-rankings', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const rankings = await rankProducts(undefined, limit);
    res.json({ rankings, total: rankings.length });
  } catch (error) {
    console.error('Product rankings error:', error);
    res.status(500).json({ error: 'Failed to get product rankings' });
  }
});

router.get('/ai/recommendations/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const recommendations = await getAIRecommendations(userId);
    res.json({ recommendations });
  } catch (error) {
    console.error('AI recommendations error:', error);
    res.status(500).json({ error: 'Failed to get AI recommendations' });
  }
});

router.get('/fraud/flagged-users', async (req: AuthRequest, res: Response) => {
  try {
    const flaggedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { is_blocked: true },
          { fraud_score: { gt: 50 } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        is_blocked: true,
        block_reason: true,
        fraud_score: true,
        created_at: true
      },
      orderBy: { fraud_score: 'desc' }
    });

    res.json({ flagged_users: flaggedUsers, count: flaggedUsers.length });
  } catch (error) {
    console.error('Flagged users error:', error);
    res.status(500).json({ error: 'Failed to fetch flagged users', flagged_users: [], count: 0 });
  }
});

router.post('/fraud/block/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { reason } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { is_blocked: true, block_reason: reason || 'Blocked by admin' }
    });

    await prisma.auditLog.create({
      data: {
        user_id: req.user!.id,
        action: 'user_blocked',
        entity_type: 'user',
        entity_id: userId,
        details: { blocked_user_id: userId, reason }
      }
    });

    res.json({ message: 'User blocked', user_id: userId });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

router.post('/fraud/unblock/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { is_blocked: false, block_reason: null }
    });

    await prisma.auditLog.create({
      data: {
        user_id: req.user!.id,
        action: 'user_unblocked',
        entity_type: 'user',
        entity_id: userId,
        details: { unblocked_user_id: userId }
      }
    });

    res.json({ message: 'User unblocked', user_id: userId });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

router.post('/ai/auto-boost-admin', async (req: AuthRequest, res: Response) => {
  try {
    const result = await autoBoostAdminProducts();
    res.json({
      message: `Auto-boosted ${result.boosted} admin products`,
      ...result
    });
  } catch (error) {
    console.error('Auto boost error:', error);
    res.status(500).json({ error: 'Failed to auto-boost products' });
  }
});

router.post('/ai/scan-networks', async (req: AuthRequest, res: Response) => {
  try {
    const result = await scanNetworksForProducts();
    res.json({
      message: `Discovered ${result.discovered} new products`,
      ...result
    });
  } catch (error) {
    console.error('Network scan error:', error);
    res.status(500).json({ error: 'Failed to scan networks' });
  }
});

router.post('/ai/auto-import-aliexpress', async (req: AuthRequest, res: Response) => {
  try {
    const { category, count } = req.body;
    const result = await autoImportAliExpressProducts(category, count || 20);
    res.json({
      message: `Auto-imported ${result.imported} AliExpress products with AI ads`,
      ...result
    });
  } catch (error) {
    console.error('AliExpress auto-import error:', error);
    res.status(500).json({ error: 'Failed to auto-import AliExpress products' });
  }
});

router.post('/ai/run-full-cycle', async (req: AuthRequest, res: Response) => {
  try {
    const result = await runAIAutoImportCycle();
    res.json({
      message: 'AI auto-import cycle completed',
      aliexpress_products: result.aliexpress_imported,
      ads_generated: result.ads_generated,
      campaigns_boosted: result.boosted
    });
  } catch (error) {
    console.error('AI cycle error:', error);
    res.status(500).json({ error: 'Failed to run AI auto-import cycle' });
  }
});

router.post('/create-admin', async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const referral_code = `ADMIN${Date.now().toString(36).toUpperCase()}`;

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
        role: 'admin',
        is_admin: true,
        referral_code,
        balance: 0,
        verified: true,
        is_active: true,
        is_blocked: false
      }
    });

    res.status(201).json({ 
      message: 'Admin created',
      admin: { id: admin.id, name: admin.name, email: admin.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

router.get('/networks/status', async (req: AuthRequest, res: Response) => {
  try {
    const status = await getNetworkStatus();
    const productCounts = await prisma.product.groupBy({
      by: ['network'],
      _count: { id: true }
    });

    const networksWithCounts = status.map(s => ({
      ...s,
      product_count: productCounts.find(p => p.network === s.network)?._count.id || 0
    }));

    res.json({ networks: networksWithCounts });
  } catch (error) {
    console.error('Network status error:', error);
    res.status(500).json({ error: 'Failed to get network status' });
  }
});

router.post('/networks/sync/all', async (req: AuthRequest, res: Response) => {
  try {
    const results = await syncAllNetworks(req.user!.id);
    const totalSynced = results.reduce((sum, r) => sum + r.products_synced, 0);

    res.json({ 
      message: `Synced ${totalSynced} products from all networks`,
      results 
    });
  } catch (error) {
    console.error('Sync all error:', error);
    res.status(500).json({ error: 'Failed to sync networks' });
  }
});

router.post('/networks/sync/:network', async (req: AuthRequest, res: Response) => {
  try {
    const { network } = req.params;
    let result;

    switch (network) {
      case 'digistore24':
        result = await syncDigistore24Products(req.user!.id);
        break;
      case 'awin':
        result = await syncAwinProducts(req.user!.id);
        break;
      case 'mylead':
        result = await syncMyLeadProducts(req.user!.id);
        break;
      case 'partnerstack':
        result = await syncPartnerStackProducts(req.user!.id);
        break;
      default:
        return res.status(400).json({ error: 'Invalid network' });
    }

    res.json({ 
      message: `Synced ${result.products_synced} products from ${network}`,
      result 
    });
  } catch (error) {
    console.error('Network sync error:', error);
    res.status(500).json({ error: 'Failed to sync network' });
  }
});

router.get('/products', async (req: AuthRequest, res: Response) => {
  try {
    const { network, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = network ? { network: String(network) } : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          network: true,
          category: true,
          image_url: true,
          affiliate_link: true,
          ai_generated_ad: true,
          is_active: true,
          created_at: true
        }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Products list error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

router.post('/products', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, price, network, category, image_url, affiliate_link } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || '',
        price: price !== undefined && price !== null ? Number(price) : null,
        network: network || 'manual',
        category: category || 'general',
        image_url: image_url || null,
        affiliate_link: affiliate_link || null,
        is_active: true,
        user_id: req.user!.id
      }
    });

    res.json({ message: 'Product created', product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.post('/products/sample', async (req: AuthRequest, res: Response) => {
  try {
    const sampleProducts = [
      { name: 'Ultimate Affiliate Marketing Course', description: 'Learn to earn $10K/month with affiliate marketing', price: '97.00', network: 'digistore24', category: 'courses' },
      { name: 'AI Content Generator Pro', description: 'Generate unlimited content with AI', price: '47.00', network: 'partnerstack', category: 'software' },
      { name: 'Crypto Trading Masterclass', description: 'Master cryptocurrency trading strategies', price: '197.00', network: 'awin', category: 'courses' },
      { name: 'Email Marketing Automation Tool', description: 'Automate your email campaigns', price: '29.00', network: 'partnerstack', category: 'software' },
      { name: 'Social Media Growth Bundle', description: 'Grow your social media following fast', price: '67.00', network: 'digistore24', category: 'ebooks' }
    ];

    const created = [];
    for (const product of sampleProducts) {
      const exists = await prisma.product.findFirst({ where: { name: product.name } });
      if (!exists) {
        const p = await prisma.product.create({
          data: { ...product, is_active: true, user_id: req.user!.id }
        });
        created.push(p);
      }
    }

    res.json({ message: `Created ${created.length} sample products`, products: created });
  } catch (error) {
    console.error('Sample products error:', error);
    res.status(500).json({ error: 'Failed to create sample products' });
  }
});

router.delete('/products/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id: Number(id) } });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

router.get('/properties', async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = status ? { status: String(status) } : {};

    const [properties, total, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.realEstateProperty.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.realEstateProperty.count({ where }),
      prisma.realEstateProperty.count({ where: { status: 'pending' } }),
      prisma.realEstateProperty.count({ where: { status: 'approved' } }),
      prisma.realEstateProperty.count({ where: { status: 'rejected' } })
    ]);

    res.json({
      properties,
      pending_count: pendingCount,
      approved_count: approvedCount,
      rejected_count: rejectedCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Properties list error:', error);
    res.status(500).json({ error: 'Failed to get properties' });
  }
});

router.post('/properties', async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, property_type, location, price, bedrooms, bathrooms, area_sqft, image_url, affiliate_link } = req.body;

    const property = await prisma.realEstateProperty.create({
      data: {
        user_id: req.user!.id,
        title,
        description,
        property_type,
        location,
        price: price ? Number(price) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        area_sqft: area_sqft ? parseInt(area_sqft) : null,
        image_url,
        affiliate_link,
        is_active: true
      }
    });

    res.status(201).json({ message: 'Property created', property });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

router.post('/properties/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_featured } = req.body;

    const property = await prisma.realEstateProperty.update({
      where: { id: Number(id) },
      data: { 
        status: 'approved',
        is_active: true,
        is_featured: is_featured || false,
        approved_at: new Date(),
        rejection_reason: null
      }
    });

    res.json({ message: 'Property approved', property });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve property' });
  }
});

router.post('/properties/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const property = await prisma.realEstateProperty.update({
      where: { id: Number(id) },
      data: { 
        status: 'rejected',
        is_active: false,
        rejection_reason: reason || 'No reason provided'
      }
    });

    res.json({ message: 'Property rejected', property });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject property' });
  }
});

router.delete('/properties/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.realEstateProperty.delete({ where: { id: Number(id) } });
    res.json({ message: 'Property deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

router.get('/withdrawals', async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: Number(limit),
      skip,
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    const total = await prisma.withdrawalRequest.count({ where });

    const stats = await prisma.withdrawalRequest.groupBy({
      by: ['status'],
      _sum: { amount: true },
      _count: true
    });

    res.json({
      withdrawals,
      stats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Withdrawals list error:', error);
    res.status(500).json({ error: 'Failed to get withdrawals' });
  }
});

router.put('/withdrawals/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: Number(id) },
      include: { user: true }
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal already processed' });
    }

    await prisma.withdrawalRequest.update({
      where: { id: Number(id) },
      data: {
        status: 'paid',
        processed_at: new Date(),
        processed_by: req.user!.id
      }
    });

    await prisma.user.update({
      where: { id: withdrawal.user_id },
      data: {
        balance: { decrement: withdrawal.amount }
      }
    });

    await prisma.transaction.create({
      data: {
        user_id: withdrawal.user_id,
        type: 'withdrawal_paid',
        amount: -withdrawal.amount,
        status: 'completed',
        description: `Withdrawal paid to ${withdrawal.bank_name || 'bank'}`
      }
    });

    await prisma.notification.create({
      data: {
        user_id: withdrawal.user_id,
        title: 'Withdrawal Approved',
        message: `Your withdrawal of $${withdrawal.amount.toFixed(2)} has been processed and sent to your bank account.`,
        type: 'success'
      }
    });

    res.json({ message: 'Withdrawal approved and paid', withdrawal_id: id });
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
});

router.put('/withdrawals/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: Number(id) }
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal already processed' });
    }

    await prisma.withdrawalRequest.update({
      where: { id: Number(id) },
      data: {
        status: 'rejected',
        rejection_reason: reason || 'Rejected by admin',
        processed_at: new Date(),
        processed_by: req.user!.id
      }
    });

    await prisma.user.update({
      where: { id: withdrawal.user_id },
      data: {
        withdrawable_balance: { increment: withdrawal.amount }
      }
    });

    await prisma.notification.create({
      data: {
        user_id: withdrawal.user_id,
        title: 'Withdrawal Rejected',
        message: `Your withdrawal of $${withdrawal.amount.toFixed(2)} was rejected. Reason: ${reason || 'Not specified'}. The amount has been returned to your balance.`,
        type: 'warning'
      }
    });

    res.json({ message: 'Withdrawal rejected', withdrawal_id: id });
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
});

router.put('/withdrawals/:id/mark-paid', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { admin_note } = req.body;

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: Number(id) },
      include: { user: true }
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status === 'paid') {
      return res.status(400).json({ error: 'Withdrawal already marked as paid' });
    }

    if (withdrawal.status === 'rejected') {
      return res.status(400).json({ error: 'Cannot mark rejected withdrawal as paid' });
    }

    await prisma.withdrawalRequest.update({
      where: { id: Number(id) },
      data: {
        status: 'paid',
        paid_at: new Date(),
        paid_by: req.user!.id,
        admin_note: admin_note || null,
        processed_at: withdrawal.processed_at || new Date(),
        processed_by: withdrawal.processed_by || req.user!.id
      }
    });

    if (withdrawal.status === 'pending') {
      await prisma.user.update({
        where: { id: withdrawal.user_id },
        data: {
          balance: { decrement: withdrawal.amount }
        }
      });
    }

    await prisma.transaction.updateMany({
      where: {
        user_id: withdrawal.user_id,
        type: 'withdrawal_request',
        extra_data: { path: ['withdrawal_id'], equals: withdrawal.id }
      },
      data: { status: 'completed' }
    });

    await prisma.notification.create({
      data: {
        user_id: withdrawal.user_id,
        title: 'Withdrawal Paid',
        message: `Your withdrawal of $${withdrawal.amount.toFixed(2)} has been sent to your bank account (${withdrawal.bank_name}).`,
        type: 'success'
      }
    });

    res.json({ message: 'Withdrawal marked as paid', withdrawal_id: id });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ error: 'Failed to mark withdrawal as paid' });
  }
});

router.get('/withdrawals/:id/bank-details', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: Number(id) },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    res.json({
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        bank_name: withdrawal.bank_name,
        account_name: withdrawal.account_name,
        account_number: withdrawal.account_number,
        bank_code: withdrawal.bank_code,
        payment_details: withdrawal.payment_details ? JSON.parse(withdrawal.payment_details) : null,
        created_at: withdrawal.created_at,
        processed_at: withdrawal.processed_at,
        paid_at: withdrawal.paid_at,
        admin_note: withdrawal.admin_note,
        user: withdrawal.user
      }
    });
  } catch (error) {
    console.error('Get withdrawal details error:', error);
    res.status(500).json({ error: 'Failed to get withdrawal details' });
  }
});

router.get('/property-payments', async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;

    const payments = await prisma.propertyPayment.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: Number(limit),
      skip,
      include: {
        property: { select: { id: true, title: true, property_type: true, price: true, user_id: true } }
      }
    });

    const total = await prisma.propertyPayment.count({ where });

    res.json({
      payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Property payments list error:', error);
    res.status(500).json({ error: 'Failed to get property payments' });
  }
});

router.put('/property-payments/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await prisma.propertyPayment.findUnique({
      where: { id: Number(id) },
      include: { property: true }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment already processed' });
    }

    await prisma.propertyPayment.update({
      where: { id: Number(id) },
      data: {
        status: 'approved',
        reviewed_by: req.user!.id,
        reviewed_at: new Date()
      }
    });

    await prisma.realEstateProperty.update({
      where: { id: payment.property_id },
      data: {
        is_paid: true,
        status: 'approved',
        approved_at: new Date(),
        approved_by: req.user!.id,
        is_active: true
      }
    });

    if (payment.property.user_id) {
      await prisma.notification.create({
        data: {
          user_id: payment.property.user_id,
          title: 'Property Payment Approved',
          message: `Your payment for "${payment.property.title}" has been approved. Your property is now live!`,
          type: 'success'
        }
      });
    }

    res.json({ message: 'Payment approved, property is now live', payment_id: id });
  } catch (error) {
    console.error('Approve property payment error:', error);
    res.status(500).json({ error: 'Failed to approve payment' });
  }
});

router.put('/property-payments/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const payment = await prisma.propertyPayment.findUnique({
      where: { id: Number(id) },
      include: { property: true }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment already processed' });
    }

    await prisma.propertyPayment.update({
      where: { id: Number(id) },
      data: {
        status: 'rejected',
        review_note: reason || 'Payment rejected by admin',
        reviewed_by: req.user!.id,
        reviewed_at: new Date()
      }
    });

    if (payment.property.user_id) {
      await prisma.notification.create({
        data: {
          user_id: payment.property.user_id,
          title: 'Property Payment Rejected',
          message: `Your payment for "${payment.property.title}" was rejected. Reason: ${reason || 'Not specified'}. Please upload a valid receipt.`,
          type: 'warning'
        }
      });
    }

    res.json({ message: 'Payment rejected', payment_id: id });
  } catch (error) {
    console.error('Reject property payment error:', error);
    res.status(500).json({ error: 'Failed to reject payment' });
  }
});

import { 
  getPendingPayoutsForAdmin, 
  approvePayout, 
  rejectPayout, 
  processPayout 
} from '../services/payoutEngine';

router.get('/payouts/pending', async (req: AuthRequest, res: Response) => {
  try {
    const { limit, offset } = req.query;
    
    const payouts = await getPendingPayoutsForAdmin({
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    });

    const count = await prisma.payout.count({ where: { status: 'pending' } });

    res.json({
      payouts: payouts.map((p: any) => ({
        id: p.id,
        user: p.user,
        amount: Number(p.amount),
        currency: p.currency,
        amount_in_usd: p.amount_in_usd ? Number(p.amount_in_usd) : null,
        provider: p.provider,
        fraud_score: p.fraud_score,
        fraud_flags: p.fraud_flags,
        created_at: p.created_at,
        payout_method: p.payout_method
      })),
      total: count
    });
  } catch (error) {
    console.error('Get pending payouts error:', error);
    res.status(500).json({ error: 'Failed to get pending payouts' });
  }
});

router.get('/payouts', async (req: AuthRequest, res: Response) => {
  try {
    const { status, limit, offset } = req.query;
    
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const payouts = await prisma.payout.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        payout_method: { select: { method_type: true, mobile_network: true } }
      },
      orderBy: { created_at: 'desc' },
      take: limit ? parseInt(limit as string) : 50,
      skip: offset ? parseInt(offset as string) : 0
    });

    const stats = await prisma.payout.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { amount_in_usd: true }
    });

    res.json({
      payouts: payouts.map(p => ({
        ...p,
        amount: Number(p.amount),
        amount_in_usd: p.amount_in_usd ? Number(p.amount_in_usd) : null,
        provider_fee: p.provider_fee ? Number(p.provider_fee) : null
      })),
      stats: stats.map(s => ({
        status: s.status,
        count: s._count.id,
        total_usd: s._sum.amount_in_usd ? Number(s._sum.amount_in_usd) : 0
      }))
    });
  } catch (error) {
    console.error('Get payouts error:', error);
    res.status(500).json({ error: 'Failed to get payouts' });
  }
});

router.post('/payouts/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const result = await approvePayout(id, req.user!.id, req.user!.name || 'Admin');

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: 'Payout approved successfully', status: 'approved' });
  } catch (error) {
    console.error('Approve payout error:', error);
    res.status(500).json({ error: 'Failed to approve payout' });
  }
});

router.post('/payouts/:id/reject', [
  body('reason').notEmpty().withMessage('Rejection reason required')
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    
    const result = await rejectPayout(id, req.user!.id, reason);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: 'Payout rejected', status: 'cancelled', reason });
  } catch (error) {
    console.error('Reject payout error:', error);
    res.status(500).json({ error: 'Failed to reject payout' });
  }
});

router.post('/payouts/:id/process', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const result = await processPayout(id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ 
      message: 'Payout processed successfully', 
      status: 'completed',
      provider_ref: result.providerRef
    });
  } catch (error) {
    console.error('Process payout error:', error);
    res.status(500).json({ error: 'Failed to process payout' });
  }
});

router.post('/payouts/:id/clear-fraud', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { notes } = req.body;
    
    await prisma.payout.update({
      where: { id },
      data: {
        fraud_cleared: true,
        fraud_cleared_by: req.user!.id,
        admin_notes: notes
      }
    });

    res.json({ message: 'Fraud flags cleared', fraud_cleared: true });
  } catch (error) {
    console.error('Clear fraud error:', error);
    res.status(500).json({ error: 'Failed to clear fraud flags' });
  }
});

export default router;
