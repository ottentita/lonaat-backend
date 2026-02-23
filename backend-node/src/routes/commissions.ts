import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest, adminOnlyMiddleware } from '../middleware/auth';
import { logAudit, getClientIp } from '../services/audit';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const network = req.query.network as string;

    const where: any = {};
    
    if (!req.user!.isAdmin) {
      where.user_id = req.user!.id;
    }
    
    if (status) where.status = status;
    if (network) where.network = network;

    const commissions = await prisma.commission.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip,
      include: req.user!.isAdmin ? {
        user: { select: { id: true, name: true, email: true } }
      } : undefined
    });

    if (!commissions || commissions.length === 0) {
      return res.json([])
    }

    const total = await prisma.commission.count({ where });

    const stats = await prisma.commission.aggregate({
      where: req.user!.isAdmin ? {} : { user_id: req.user!.id },
      _sum: { amount: true },
      _count: true
    });

    const approvedStats = await prisma.commission.aggregate({
      where: {
        ...(req.user!.isAdmin ? {} : { user_id: req.user!.id }),
        status: 'approved'
      },
      _sum: { amount: true }
    });

    res.json({
      commissions,
      stats: {
        total_count: stats._count,
        total_amount: stats._sum.amount ? Number(stats._sum.amount) : 0,
        approved_amount: approvedStats._sum.amount ? Number(approvedStats._sum.amount) : 0
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Commissions error:', error);
    return res.status(500).json({ error: (error as any).message || 'Failed to fetch commissions' });
  }
});

router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.isAdmin;

    const whereClause = isAdmin ? {} : { user_id: userId };

    const [totalStats, pendingStats, paidByNetworkStats, byNetwork] = await Promise.all([
      prisma.commission.aggregate({
        where: whereClause,
        _sum: { amount: true },
        _count: true
      }),
      prisma.commission.aggregate({
        where: { ...whereClause, status: 'pending' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.commission.aggregate({
        where: { ...whereClause, status: 'paid_by_network' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.commission.groupBy({
        by: ['network'],
        where: whereClause,
        _sum: { amount: true },
        _count: true
      })
    ]);

    res.json({
      total_earnings: totalStats._sum.amount ? Number(totalStats._sum.amount) : 0,
      total_count: totalStats._count || 0,
      pending_commissions: pendingStats._sum.amount ? Number(pendingStats._sum.amount) : 0,
      pending_count: pendingStats._count || 0,
      paid_by_network: paidByNetworkStats._sum.amount ? Number(paidByNetworkStats._sum.amount) : 0,
      paid_by_network_count: paidByNetworkStats._count || 0,
      by_network: byNetwork.map(n => ({
        network: n.network,
        total: n._sum.amount ? Number(n._sum.amount) : 0,
        count: n._count
      })),
      payout_method: 'AFFILIATE_NETWORK',
      payout_message: 'Earnings are paid directly by affiliate networks.',
      withdrawal_enabled: false
    });
  } catch (error) {
    console.error('Commission summary error:', error);
    // Return safe defaults to avoid dashboard errors (temporary stub)
    res.status(200).json({
      total_earnings: 0,
      total_count: 0,
      pending_commissions: 0,
      pending_count: 0,
      paid_by_network: 0,
      paid_by_network_count: 0,
      by_network: [],
      payout_method: 'AFFILIATE_NETWORK',
      payout_message: 'Earnings are paid directly by affiliate networks.',
      withdrawal_enabled: false
    });
  }
});

router.get('/payout-info', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json({
    payout_method: 'AFFILIATE_NETWORK',
    payout_status: 'PAID_EXTERNALLY',
    message: 'Earnings are paid directly by affiliate networks.',
    networks: {
      digistore24: 'Paid via Digistore24 dashboard',
      awin: 'Paid via Awin publisher account',
      mylead: 'Paid via MyLead payment system'
    },
    withdrawal_enabled: false,
    help: 'Check your affiliate network dashboard for payout status and payment history.'
  });
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const commission = await prisma.commission.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    if (!req.user!.isAdmin && commission.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ commission });
  } catch (error) {
    console.error('Get commission error:', error);
    res.status(500).json({ error: (error as any).message || 'Failed to get commission' });
  }
});

router.put('/:id/approve', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const commissionId = parseInt(req.params.id);
    const commission = await prisma.commission.findUnique({ where: { id: commissionId } });

    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    if (commission.status !== 'pending') {
      return res.status(400).json({ error: 'Commission already processed' });
    }

    const updated = await prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: 'approved',
        approved_at: new Date(),
        approved_by: req.user!.id
      }
    });

    await prisma.user.update({
      where: { id: commission.user_id },
      data: { 
        balance: { increment: commission.amount },
        withdrawable_balance: { increment: commission.amount }
      }
    });

    await prisma.notification.create({
      data: {
        user_id: commission.user_id,
        title: 'Commission Approved',
        message: `Your commission of $${commission.amount.toFixed(2)} from ${commission.network || 'Direct'} has been approved and is now available for withdrawal.`,
        type: 'success'
      }
    });

    await prisma.transaction.create({
      data: {
        user_id: commission.user_id,
        type: 'commission',
        amount: commission.amount,
        status: 'completed',
        description: `Commission approved: ${commission.network || 'Direct'}`,
        extra_data: { commission_id: commissionId }
      }
    });

    await logAudit({
      userId: req.user!.id,
      action: 'commission_approved',
      entityType: 'commission',
      entityId: commissionId,
      details: { amount: commission.amount, user_id: commission.user_id },
      ipAddress: getClientIp(req)
    });

    res.json({ message: 'Commission approved', commission: updated });
  } catch (error) {
    console.error('Approve commission error:', error);
    res.status(500).json({ error: (error as any).message || 'Failed to approve commission' });
  }
});

router.put('/:id/reject', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const commissionId = parseInt(req.params.id);
    const { reason } = req.body;

    const commission = await prisma.commission.findUnique({ where: { id: commissionId } });

    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    if (commission.status !== 'pending') {
      return res.status(400).json({ error: 'Commission already processed' });
    }

    const updated = await prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: 'rejected',
        rejection_reason: reason || 'Rejected by admin',
        approved_by: req.user!.id
      }
    });

    await logAudit({
      userId: req.user!.id,
      action: 'commission_rejected',
      entityType: 'commission',
      entityId: commissionId,
      details: { reason, amount: commission.amount, user_id: commission.user_id },
      ipAddress: getClientIp(req)
    });

    res.json({ message: 'Commission rejected', commission: updated });
  } catch (error) {
    console.error('Reject commission error:', error);
    res.status(500).json({ error: (error as any).message || 'Failed to reject commission' });
  }
});

router.get('/stats/summary', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [pending, approved, rejected, total] = await Promise.all([
      prisma.commission.aggregate({
        where: { status: 'pending' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.commission.aggregate({
        where: { status: 'approved' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.commission.aggregate({
        where: { status: 'rejected' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.commission.aggregate({
        _sum: { amount: true },
        _count: true
      })
    ]);

    const byNetwork = await prisma.commission.groupBy({
      by: ['network'],
      _sum: { amount: true },
      _count: true
    });

    res.json({
      summary: {
        pending: { count: pending._count, amount: pending._sum.amount ? Number(pending._sum.amount) : 0 },
        approved: { count: approved._count, amount: approved._sum.amount ? Number(approved._sum.amount) : 0 },
        rejected: { count: rejected._count, amount: rejected._sum.amount ? Number(rejected._sum.amount) : 0 },
        total: { count: total._count, amount: total._sum.amount ? Number(total._sum.amount) : 0 }
      },
      by_network: byNetwork
    });
  } catch (error) {
    console.error('Commission stats error:', error);
    res.status(500).json({ error: (error as any).message || 'Failed to fetch commission stats' });
  }
});

export default router;
