import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authMiddleware, AuthRequest, adminOnlyMiddleware } from '../middleware/auth';
import { processAIJob, processPendingJobs } from '../services/ai';
import { syncAllNetworks, syncDigistore24Products, syncAwinProducts, syncMyLeadProducts, syncPartnerStackProducts, getNetworkStatus } from '../services/networkSync';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);
router.use(adminOnlyMiddleware);

router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const [
      userCount,
      productCount,
      campaignCount,
      totalTransactions
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count({ where: { is_active: true } }),
      prisma.adBoost.count({ where: { status: 'active' } }),
      prisma.transaction.aggregate({ _sum: { amount: true } })
    ]);

    const recentUsers = await prisma.user.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      select: { id: true, name: true, email: true, role: true, created_at: true, balance: true }
    });

    res.json({
      stats: {
        total_users: userCount,
        total_products: productCount,
        active_campaigns: campaignCount,
        total_volume: totalTransactions._sum.amount || 0
      },
      recent_users: recentUsers
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

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
        total_amount: totalStats._sum.amount || 0,
        total_count: totalStats._count,
        pending_amount: pendingStats._sum.amount || 0,
        pending_count: pendingStats._count,
        approved_amount: approvedStats._sum.amount || 0,
        paid_amount: paidStats._sum.amount || 0,
        rejected_amount: rejectedStats._sum.amount || 0
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

    const where = status ? { is_active: status === 'approved' } : {};

    const [properties, total, pendingCount, approvedCount] = await Promise.all([
      prisma.realEstateProperty.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.realEstateProperty.count({ where }),
      prisma.realEstateProperty.count({ where: { is_active: false } }),
      prisma.realEstateProperty.count({ where: { is_active: true } })
    ]);

    res.json({
      properties,
      pending_count: pendingCount,
      approved_count: approvedCount,
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
        price: price ? parseFloat(price) : null,
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
      data: { is_active: true }
    });

    res.json({ message: 'Property approved', property });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve property' });
  }
});

router.post('/properties/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const property = await prisma.realEstateProperty.update({
      where: { id: Number(id) },
      data: { is_active: false }
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

export default router;
