import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const DEFAULT_COMMISSION_RATE = 0.10; // 10% referral commission

// GET /api/referrals/my-code — Get current user's referral code
router.get('/my-code', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const users: any[] = await prisma.$queryRawUnsafe(
      `SELECT "referralCode" FROM users WHERE id = $1`, req.user!.id
    );
    if (!users.length) return res.status(404).json({ error: 'User not found' });

    let code = users[0].referralCode;
    if (!code) {
      code = `REF-${req.user!.id.substring(0, 8).toUpperCase()}`;
      await prisma.$queryRawUnsafe(
        `UPDATE users SET "referralCode" = $1 WHERE id = $2`, code, req.user!.id
      );
    }

    res.json({
      referralCode: code,
      referralLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${code}`
    });
  } catch (error: any) {
    console.error('Get referral code error:', error);
    res.status(500).json({ error: 'Failed to get referral code' });
  }
});

// GET /api/referrals/stats — Referral dashboard stats
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const totalReferrals: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM referrals WHERE "referrerId" = $1`, req.user!.id
    );

    const activeReferrals: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM referrals WHERE "referrerId" = $1 AND status = 'active'`, req.user!.id
    );

    const totalEarned: any[] = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(amount), 0) as total FROM referral_commissions WHERE "referrerId" = $1 AND status = 'paid'`, req.user!.id
    );

    const pendingEarnings: any[] = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(amount), 0) as total FROM referral_commissions WHERE "referrerId" = $1 AND status = 'pending'`, req.user!.id
    );

    res.json({
      totalReferrals: totalReferrals[0]?.count || 0,
      activeReferrals: activeReferrals[0]?.count || 0,
      totalEarned: Number(totalEarned[0]?.total) || 0,
      pendingEarnings: Number(pendingEarnings[0]?.total) || 0,
      commissionRate: DEFAULT_COMMISSION_RATE
    });
  } catch (error: any) {
    console.error('Referral stats error:', error);
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

// GET /api/referrals/list — List referred users
router.get('/list', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const referrals: any[] = await prisma.$queryRawUnsafe(
      `SELECT r.id, r.status, r."commissionRate", r."totalEarned", r."createdAt",
              u.name as "referredName", u.email as "referredEmail"
       FROM referrals r
       JOIN users u ON u.id = r."referredUserId"
       WHERE r."referrerId" = $1
       ORDER BY r."createdAt" DESC
       LIMIT 50`, req.user!.id
    );

    res.json({ referrals: referrals || [] });
  } catch (error: any) {
    console.error('List referrals error:', error);
    res.status(500).json({ error: 'Failed to list referrals' });
  }
});

// GET /api/referrals/commissions — Commission history
router.get('/commissions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const commissions: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, source_type, source_id, amount, status, created_at
       FROM referral_commissions
       WHERE referrer_id = $1
       ORDER BY created_at DESC
       LIMIT 50`, req.user!.id
    );

    res.json({ commissions: commissions || [] });
  } catch (error: any) {
    console.error('Referral commissions error:', error);
    res.status(500).json({ error: 'Failed to get commissions' });
  }
});

// POST /api/referrals/apply — Apply referral code during registration (called internally)
router.post('/apply', async (req: any, res: Response) => {
  try {
    const { referralCode, newUserId } = req.body;
    if (!referralCode || !newUserId) {
      return res.status(400).json({ error: 'referralCode and newUserId required' });
    }

    // Find referrer by code
    const referrers: any[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM users WHERE "referralCode" = $1`, referralCode
    );

    if (!referrers.length) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    const referrerId = referrers[0].id;

    // Prevent self-referral
    if (referrerId === newUserId) {
      return res.status(400).json({ error: 'Cannot refer yourself' });
    }

    // Check if already referred
    const existing: any[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM referrals WHERE "referredUserId" = $1`, newUserId
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already has a referrer' });
    }

    const refId = `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create referral record
    await prisma.$queryRawUnsafe(
      `INSERT INTO referrals (id, "referrerId", "referredUserId", status, "commissionRate", "totalEarned", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'active', $4, 0, NOW(), NOW())`,
      refId, referrerId, newUserId, DEFAULT_COMMISSION_RATE
    );

    // Update user's referredBy
    await prisma.$queryRawUnsafe(
      `UPDATE users SET "referredBy" = $1 WHERE id = $2`, referrerId, newUserId
    );

    console.log(`Referral created: ${referrerId} -> ${newUserId}`);
    res.json({ success: true, referralId: refId });

  } catch (error: any) {
    console.error('Apply referral error:', error);
    res.status(500).json({ error: 'Failed to apply referral' });
  }
});

// POST /api/referrals/commission — Record a commission (called by conversion webhook)
router.post('/commission', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { referredUserId, sourceType, sourceId, amount } = req.body;
    if (!referredUserId || !sourceType || !amount) {
      return res.status(400).json({ error: 'referredUserId, sourceType, and amount required' });
    }

    // Find the referral record
    const referrals: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, "referrerId", "commissionRate" FROM referrals WHERE "referredUserId" = $1 AND status = 'active'`,
      referredUserId
    );

    if (!referrals.length) {
      return res.json({ success: false, message: 'No active referral found' });
    }

    const referral = referrals[0];
    const commission = Number(amount) * Number(referral.commissionRate);

    const commId = `rc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Record the commission
    await prisma.$queryRawUnsafe(
      `INSERT INTO referral_commissions (id, "referralId", "referrerId", "sourceType", "sourceId", amount, status, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())`,
      commId, referral.id, referral.referrerId, sourceType, sourceId || '', commission
    );

    // Update referral total earned
    await prisma.$queryRawUnsafe(
      `UPDATE referrals SET "totalEarned" = "totalEarned" + $1, "updatedAt" = NOW() WHERE id = $2`,
      commission, referral.id
    );

    // Credit the referrer's wallet
    await prisma.$queryRawUnsafe(
      `UPDATE wallets SET balance = balance + $1, total_earned = total_earned + $1, updated_at = NOW() WHERE user_id = $2`,
      commission, referral.referrerId
    );

    // Log transaction
    const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await prisma.$queryRawUnsafe(
      `INSERT INTO transactions (id, wallet_id, user_id, type, amount, description, reference, status, created_at, updated_at)
       VALUES ($1, (SELECT id FROM wallets WHERE user_id = $2 LIMIT 1), $2, 'referral_commission', $3, $4, $5, 'completed', NOW(), NOW())`,
      txId, referral.referrerId, commission, `Referral commission from ${sourceType}`, commId
    );

    console.log(`Referral commission: $${commission.toFixed(2)} to ${referral.referrerId}`);
    res.json({ success: true, commissionId: commId, amount: commission });

  } catch (error: any) {
    console.error('Referral commission error:', error);
    res.status(500).json({ error: 'Failed to record commission' });
  }
});

export default router;
