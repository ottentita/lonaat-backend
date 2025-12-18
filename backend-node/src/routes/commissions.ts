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
        total_amount: stats._sum.amount || 0,
        approved_amount: approvedStats._sum.amount || 0
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Commissions error:', error);
    res.status(500).json({ error: 'Failed to get commissions' });
  }
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
    res.status(500).json({ error: 'Failed to get commission' });
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
    res.status(500).json({ error: 'Failed to approve commission' });
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
    res.status(500).json({ error: 'Failed to reject commission' });
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
        pending: { count: pending._count, amount: pending._sum.amount || 0 },
        approved: { count: approved._count, amount: approved._sum.amount || 0 },
        rejected: { count: rejected._count, amount: rejected._sum.amount || 0 },
        total: { count: total._count, amount: total._sum.amount || 0 }
      },
      by_network: byNetwork
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get commission stats' });
  }
});

export default router;
