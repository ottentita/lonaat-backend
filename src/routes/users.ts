import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest, adminOnlyMiddleware } from '../middleware/auth';

const router = Router();

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.user!.id) },
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
        created_at: true,
        trial_ends_at: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date();
    const trialActive = user.trial_ends_at ? new Date(user.trial_ends_at) > now : false;
    const trialDaysLeft = user.trial_ends_at 
      ? Math.max(0, Math.ceil((new Date(user.trial_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    res.json({
      ...user,
      trial_active: trialActive,
      trial_days_left: trialDaysLeft,
      has_premium_access: user.ai_premium || trialActive || user.is_admin
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.user!.id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        balance: true,
        // other fields not used
        createdAt: true
      }
    });

    const wallet = await prisma.creditWallet.findUnique({
      where: { user_id: Number(req.user!.id) }
    });

    // check if transaction model exists before calling
    let stats = { _count: 0, _sum: { amount: null } };
    try {
      stats = await prisma.transaction.aggregate({
        where: { user_id: Number(req.user!.id) },
        _sum: { amount: true },
        _count: true
      });
    } catch (e) {
      // transaction model may not exist in schema
    }

    res.json({
      user,
      credits: wallet?.credits || 0,
      stats: {
        total_transactions: stats?._count ?? 0,
        total_amount: stats._sum?.amount ? Number(stats._sum.amount) : 0
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
      where: { id: Number(req.user!.id) },
      select: { balance: true }
    });

    const wallet = await prisma.creditWallet.findUnique({
      where: { user_id: Number(req.user!.id) }
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
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const transactions = await prisma.transaction.findMany({
      where: { user_id: Number(req.user!.id) },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip
    });

    const total = await prisma.transaction.count({
      where: { user_id: Number(req.user!.id) }
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
      where: { user_id: Number(req.user!.id) },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    const stats = await prisma.commission.aggregate({
      where: { user_id: Number(req.user!.id), status: 'approved' },
      _sum: { amount: true }
    });

    res.json({
      commissions,
      total_earned: stats._sum.amount ? Number(stats._sum.amount) : 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get commissions' });
  }
});

router.get('/notifications', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { user_id: Number(req.user!.id) },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// GET /api/user/settings
router.get('/settings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.user!.id) },
      select: {
        id: true,
        name: true,
        email: true,
        referral_code: true,
        country: true,
        phone: true,
        paymentMethod: true,
        paymentAccount: true,
        preferredLanguage: true,
        profilePicture: true
      }
    })

    if (!user) return res.status(404).json({ error: 'User not found' })

    res.json({ settings: user })
  } catch (err) {
    console.error('Get settings error:', err)
    res.status(500).json({ error: 'Failed to get settings' })
  }
})

// PUT /api/user/settings
router.put('/settings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, country, phone, paymentMethod, paymentAccount, preferredLanguage, profilePicture } = req.body

    const updated = await prisma.user.update({
      where: { id: Number(req.user!.id) },
      data: {
        name: name ?? undefined,
        country: country ?? undefined,
        phone: phone ?? undefined,
        paymentMethod: paymentMethod ?? undefined,
        paymentAccount: paymentAccount ?? undefined,
        preferredLanguage: preferredLanguage ?? undefined,
        profilePicture: profilePicture ?? undefined
      }
    })

    res.json({ message: 'Settings updated', settings: updated })
  } catch (err) {
    console.error('Update settings error:', err)
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

// PUT /api/user/password
router.put('/password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing password fields' })

    const user = await prisma.user.findUnique({ where: { id: Number(req.user!.id) } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    // simple bcrypt comparison (bcryptjs used elsewhere)
    const bcrypt = require('bcryptjs')
    const match = await bcrypt.compare(currentPassword, user.password)
    if (!match) return res.status(403).json({ error: 'Current password incorrect' })

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: Number(req.user!.id) }, data: { password: hashed } })

    res.json({ message: 'Password changed' })
  } catch (err) {
    console.error('Change password error:', err)
    res.status(500).json({ error: 'Failed to change password' })
  }
})

router.put('/notifications/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = Number(req.params.id);
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    await prisma.notification.updateMany({
      where: { id: notificationId, user_id: Number(req.user!.id) },
      data: { is_read: true }
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

export default router;
