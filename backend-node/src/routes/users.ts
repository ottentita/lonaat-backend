import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest, adminOnlyMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        balance: true,
        is_admin: true,
        verified: true,
        referral_code: true,
        withdrawable_balance: true,
        ai_premium: true,
        created_at: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        balance: true,
        is_admin: true,
        verified: true,
        referral_code: true,
        created_at: true
      }
    });

    const wallet = await prisma.creditWallet.findUnique({
      where: { user_id: req.user!.id }
    });

    const stats = await prisma.transaction.aggregate({
      where: { user_id: req.user!.id },
      _sum: { amount: true },
      _count: true
    });

    res.json({
      user,
      credits: wallet?.credits || 0,
      stats: {
        total_transactions: stats._count,
        total_amount: stats._sum.amount || 0
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

router.get('/balance', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { balance: true }
    });

    const wallet = await prisma.creditWallet.findUnique({
      where: { user_id: req.user!.id }
    });

    res.json({
      balance: user?.balance || 0,
      credits: wallet?.credits || 0,
      is_admin: req.user!.isAdmin
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

router.get('/transactions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const transactions = await prisma.transaction.findMany({
      where: { user_id: req.user!.id },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip
    });

    const total = await prisma.transaction.count({
      where: { user_id: req.user!.id }
    });

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

router.get('/commissions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const commissions = await prisma.commission.findMany({
      where: { user_id: req.user!.id },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    const stats = await prisma.commission.aggregate({
      where: { user_id: req.user!.id, status: 'approved' },
      _sum: { amount: true }
    });

    res.json({
      commissions,
      total_earned: stats._sum.amount || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get commissions' });
  }
});

router.get('/notifications', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { user_id: req.user!.id },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

router.put('/notifications/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { id: parseInt(req.params.id), user_id: req.user!.id },
      data: { is_read: true }
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

export default router;
