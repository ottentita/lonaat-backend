/**
 * TEST ROUTES
 * For testing and development only
 * Should be disabled in production
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();

/**
 * DELETE /api/test/reset-financial-data
 * Reset user's financial data for testing
 */
router.delete('/reset-financial-data', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);

    // Delete all transactions for user
    await prisma.Transaction.deleteMany({
      where: { userId }
    });

    // Reset wallet balance to 0
    await prisma.wallet.updateMany({
      where: { userId },
      data: { balance: 0 }
    });

    console.log(`✅ Reset financial data for user ${userId}`);

    return res.json({
      success: true,
      message: 'Financial data reset successfully'
    });
  } catch (error: any) {
    console.error('❌ Reset financial data error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset financial data',
      message: error.message
    });
  }
});

export default router;
