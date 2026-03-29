/**
 * ADMIN CONTROL ROUTES - KILL SWITCH AND WALLET FREEZE
 * High-value admin controls for emergency situations
 */

import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { monitoringService } from '../services/monitoring.service';

const router = Router();

// Admin middleware - only admin users can access
const adminMiddleware = async (req: AuthRequest, res: Response, next: any) => {
  const user = req.user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      error: 'Admin access required' 
    });
  }
  next();
};

/**
 * POST /api/admin/freeze-wallet
 * Freeze a specific user's wallet
 */
router.post('/freeze-wallet', [
  adminMiddleware,
  body('userId').isInt().withMessage('User ID must be an integer'),
  body('reason').isString().withMessage('Reason is required')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, reason } = req.body;
    const adminId = req.user!.id;

    // Freeze the wallet
    await prisma.wallet.update({
      where: { userId },
      data: {
        isFrozen: true,
        freezeReason: reason,
        frozenAt: new Date(),
        frozenBy: adminId
      }
    });

    // Log admin action
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'freeze_wallet',
        targetUserId: userId,
        details: { reason },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    console.warn(`🚨 Wallet frozen: User ${userId} by Admin ${adminId}, Reason: ${reason}`);
    await monitoringService.incrementMetric('wallet_frozen', userId, { reason, adminId });

    res.json({
      success: true,
      message: `Wallet for user ${userId} has been frozen`,
      frozenAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Wallet freeze error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to freeze wallet',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/unfreeze-wallet
 * Unfreeze a specific user's wallet
 */
router.post('/unfreeze-wallet', [
  adminMiddleware,
  body('userId').isInt().withMessage('User ID must be an integer'),
  body('reason').isString().withMessage('Reason is required')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, reason } = req.body;
    const adminId = req.user!.id;

    // Unfreeze the wallet
    await prisma.wallet.update({
      where: { userId },
      data: {
        isFrozen: false,
        freezeReason: null,
        frozenAt: null,
        frozenBy: null
      }
    });

    // Log admin action
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'unfreeze_wallet',
        targetUserId: userId,
        details: { reason },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    console.log(`✅ Wallet unfrozen: User ${userId} by Admin ${adminId}, Reason: ${reason}`);
    await monitoringService.incrementMetric('wallet_unfrozen', userId, { reason, adminId });

    res.json({
      success: true,
      message: `Wallet for user ${userId} has been unfrozen`,
      unfrozenAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Wallet unfreeze error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unfreeze wallet',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/freeze-withdrawals
 * Block all withdrawals globally (maintenance/incident)
 */
router.post('/freeze-withdrawals', [
  adminMiddleware,
  body('reason').isString().withMessage('Reason is required')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason } = req.body;
    const adminId = req.user!.id;

    // Update system setting
    await prisma.systemSettings.upsert({
      where: { key: 'withdrawals_frozen' },
      update: {
        value: JSON.stringify({ frozen: true, reason, adminId, timestamp: new Date() })
      },
      create: {
        key: 'withdrawals_frozen',
        value: JSON.stringify({ frozen: true, reason, adminId, timestamp: new Date() })
      }
    });

    // Log admin action
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'freeze_withdrawals_global',
        details: { reason },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    console.warn(`🚨 Global withdrawals frozen by Admin ${adminId}, Reason: ${reason}`);
    await monitoringService.incrementMetric('global_withdrawals_frozen', undefined, { reason, adminId });

    res.json({
      success: true,
      message: 'All withdrawals have been frozen globally',
      frozenAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Global freeze error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to freeze withdrawals',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/unfreeze-withdrawals
 * Unblock all withdrawals globally
 */
router.post('/unfreeze-withdrawals', [
  adminMiddleware,
  body('reason').isString().withMessage('Reason is required')
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason } = req.body;
    const adminId = req.user!.id;

    // Update system setting
    await prisma.systemSettings.upsert({
      where: { key: 'withdrawals_frozen' },
      update: {
        value: JSON.stringify({ frozen: false, reason, adminId, timestamp: new Date() })
      },
      create: {
        key: 'withdrawals_frozen',
        value: JSON.stringify({ frozen: false, reason, adminId, timestamp: new Date() })
      }
    });

    // Log admin action
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'unfreeze_withdrawals_global',
        details: { reason },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    console.log(`✅ Global withdrawals unfrozen by Admin ${adminId}, Reason: ${reason}`);
    await monitoringService.incrementMetric('global_withdrawals_unfrozen', undefined, { reason, adminId });

    res.json({
      success: true,
      message: 'All withdrawals have been unfrozen globally',
      unfrozenAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Global unfreeze error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unfreeze withdrawals',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/system-status
 * Get current system status and frozen wallets
 */
router.get('/system-status', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Get system settings
    const settings = await prisma.systemSettings.findMany();
    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = JSON.parse(setting.value);
      return acc;
    }, {} as any);

    // Get frozen wallets
    const frozenWallets = await prisma.wallet.findMany({
      where: { isFrozen: true },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        }
      }
    });

    // Get recent admin actions
    const recentActions = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        admin: {
          select: { id: true, email: true, name: true }
        }
      }
    });

    res.json({
      success: true,
      data: {
        systemSettings: settingsMap,
        frozenWallets: frozenWallets.map(wallet => ({
          userId: wallet.userId,
          user: wallet.user,
          freezeReason: wallet.freezeReason,
          frozenAt: wallet.frozenAt,
          frozenBy: wallet.frozenBy
        })),
        recentAdminActions: recentActions.map(action => ({
          id: action.id,
          action: action.action,
          targetUserId: action.targetUserId,
          details: action.details,
          admin: action.admin,
          createdAt: action.createdAt
        }))
      }
    });

  } catch (error: any) {
    console.error('❌ System status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      message: error.message
    });
  }
});

export default router;
