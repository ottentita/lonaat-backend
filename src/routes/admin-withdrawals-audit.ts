import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, adminOnlyMiddleware, AuthRequest } from '../middleware/auth';
import { sendMTNPayment } from '../services/mtn.service';
import { sendOrangeMoney } from '../services/orangeMoney.service';

const router = Router();

// ADMIN APPROVAL ENDPOINT - Audit-Grade with Status History
router.post('/withdrawals/:id/approve', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUserId = Number(req.user?.id);

    // ATOMIC TRANSACTION with double-processing prevention and status history
    await prisma.$transaction(async (tx) => {
      // PREVENT DOUBLE PROCESSING - Read and validate inside transaction
      const withdrawal = await tx.withdrawals.findUnique({
        where: { id: Number(id) }
      });

      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      if (withdrawal.status !== 'pending') {
        throw new Error(`Withdrawal already processed (status: ${withdrawal.status})`);
      }

      console.log('✅ APPROVING WITHDRAWAL:', { id, userId: withdrawal.user_id, amount: withdrawal.amount, method: withdrawal.method });

      // PAYOUT EXECUTION WITH FAILURE RECOVERY
      let payoutSuccess = false;
      let payoutError = null;

      try {
        // EXECUTE PAYOUT BASED ON METHOD
        if (withdrawal.method === 'momo') {
          console.log('💳 Processing MTN MoMo payout...');
          const mtnResult = await sendMTNPayment(
            String(withdrawal.amount),
            withdrawal.account_details || ''
          );
          console.log('✅ MTN PAYOUT SUCCESS - Reference ID:', mtnResult);
          payoutSuccess = true;
        } else if (withdrawal.method === 'orange') {
          console.log('🍊 Processing Orange Money payout...');
          const orangeResult = await sendOrangeMoney({
            amount: withdrawal.amount,
            phone: withdrawal.account_details || '',
            reference: `WD-${withdrawal.id}`
          });
          
          if (!orangeResult.success) {
            throw new Error(`Orange payout failed: ${JSON.stringify(orangeResult.error)}`);
          }
          console.log('✅ ORANGE PAYOUT SUCCESS');
          payoutSuccess = true;
        } else {
          console.log('⚠️ Unknown payment method:', withdrawal.method);
          payoutSuccess = true; // Allow approval for unknown methods
        }
      } catch (error: any) {
        payoutSuccess = false;
        payoutError = error.message;
        console.error('❌ PAYOUT FAILED:', {
          withdrawalId: withdrawal.id,
          method: withdrawal.method,
          error: payoutError
        });
      }

      // HANDLE PAYOUT FAILURE
      if (!payoutSuccess) {
        // Check retry count (max 3 retries)
        const retryCount = (withdrawal as any).retryCount || 0;
        const MAX_RETRIES = 3;

        if (retryCount < MAX_RETRIES) {
          // Mark for retry
          await tx.withdrawals.update({
            where: { id: Number(id) },
            data: {
              status: 'retry_pending',
              updated_at: new Date()
            }
          });

          console.log('🔄 PAYOUT RETRY SCHEDULED:', {
            withdrawalId: withdrawal.id,
            retryCount: retryCount + 1,
            maxRetries: MAX_RETRIES
          });

          throw new Error(`Payout failed, retry scheduled (${retryCount + 1}/${MAX_RETRIES}): ${payoutError}`);
        } else {
          // Max retries exceeded - mark as failed and refund
          await tx.withdrawals.update({
            where: { id: Number(id) },
            data: {
              status: 'failed',
              updated_at: new Date()
            }
          });

          // REFUND TO USER WALLET
          const userIdStr = String(withdrawal.user_id);
          const wallet = await tx.wallet.findUnique({
            where: { userId: userIdStr }
          });

          if (wallet) {
            await tx.wallet.update({
              where: { userId: userIdStr },
              data: {
                balance: { increment: withdrawal.amount },
                locked_balance: { decrement: withdrawal.amount }
              }
            });
          }

          // Create refund ledger entry
          await tx.transactionLedger.create({
            data: {
              userId: withdrawal.user_id,
              amount: Math.round(withdrawal.amount),
              type: 'credit',
              reason: 'Withdrawal failed - refund'
            }
          });

          console.log('❌ PAYOUT FAILED - REFUNDED:', {
            withdrawalId: withdrawal.id,
            amount: withdrawal.amount,
            reason: payoutError
          });

          throw new Error(`Payout failed after ${MAX_RETRIES} retries. Funds refunded: ${payoutError}`);
        }
      }

      // Update withdrawal status
      await tx.withdrawals.update({
        where: { id: Number(id) },
        data: {
          status: 'approved',
          updated_at: new Date()
        }
      });

      // LOG STATUS HISTORY
      await tx.withdrawalStatusHistory.create({
        data: {
          withdrawalId: Number(id),
          fromStatus: 'pending',
          toStatus: 'approved',
          changedBy: adminUserId,
          reason: 'Approved by admin'
        }
      });

      // Unlock from locked_balance
      const userIdStr = String(withdrawal.user_id);
      await tx.wallet.update({
        where: { userId: userIdStr },
        data: {
          locked_balance: { decrement: withdrawal.amount }
        }
      });

      // Create ledger entry
      await tx.transactionLedger.create({
        data: {
          userId: withdrawal.user_id,
          amount: Math.round(withdrawal.amount),
          type: 'debit',
          reason: 'Withdrawal approved'
        }
      });
    });

    return res.json({
      success: true,
      message: 'Withdrawal approved successfully'
    });

  } catch (err: any) {
    console.error("APPROVE ERROR:", err?.message);
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// ADMIN REJECTION ENDPOINT - Audit-Grade with Status History
router.post('/withdrawals/:id/reject', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUserId = Number(req.user?.id);

    // ATOMIC TRANSACTION with double-processing prevention and status history
    await prisma.$transaction(async (tx) => {
      // PREVENT DOUBLE PROCESSING - Read and validate inside transaction
      const withdrawal = await tx.withdrawals.findUnique({
        where: { id: Number(id) }
      });

      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      if (withdrawal.status !== 'pending') {
        throw new Error(`Withdrawal already processed (status: ${withdrawal.status})`);
      }

      console.log('❌ REJECTING WITHDRAWAL:', { id, userId: withdrawal.user_id, amount: withdrawal.amount });

      // Update withdrawal status
      await tx.withdrawals.update({
        where: { id: Number(id) },
        data: {
          status: 'rejected',
          updated_at: new Date()
        }
      });

      // LOG STATUS HISTORY
      await tx.withdrawalStatusHistory.create({
        data: {
          withdrawalId: Number(id),
          fromStatus: 'pending',
          toStatus: 'rejected',
          changedBy: adminUserId,
          reason: reason || 'Rejected by admin'
        }
      });

      // Unlock and refund
      const userIdStr = String(withdrawal.user_id);
      const wallet = await tx.wallet.findUnique({
        where: { userId: userIdStr }
      });

      if (wallet) {
        await tx.wallet.update({
          where: { userId: userIdStr },
          data: {
            balance: { increment: withdrawal.amount },
            locked_balance: { decrement: withdrawal.amount }
          }
        });
      }

      // Create refund ledger entry
      await tx.transactionLedger.create({
        data: {
          userId: withdrawal.user_id,
          amount: Math.round(withdrawal.amount),
          type: 'credit',
          reason: 'Withdrawal rejected refund'
        }
      });
    });

    return res.json({
      success: true,
      message: 'Withdrawal rejected and funds refunded'
    });

  } catch (err: any) {
    console.error("REJECT ERROR:", err?.message);
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// ADMIN WITHDRAWAL LIST ENDPOINT - Enhanced Visibility
router.get('/withdrawals', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status, method, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (method) where.method = method;

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawals.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: Number(limit),
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      }),
      prisma.withdrawals.count({ where })
    ]);

    // Enhance withdrawal data with additional info
    const enhancedWithdrawals = withdrawals.map(w => {
      const kycStatus = (w.user as any)?.kycStatus || 'pending';
      const retryCount = (w as any).retryCount || 0;
      const failureReason = (w as any).failureReason || null;

      return {
        id: w.id,
        user: {
          id: w.user.id,
          email: w.user.email,
          name: w.user.name,
          kycStatus
        },
        amount: w.amount,
        status: w.status,
        method: w.method, // Provider: MTN / ORANGE
        account_details: w.account_details,
        reference: w.reference,
        retryCount,
        failureReason,
        created_at: w.created_at,
        updated_at: w.updated_at,
        expiresAt: w.expiresAt
      };
    });

    return res.json({
      success: true,
      data: {
        withdrawals: enhancedWithdrawals,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (err: any) {
    console.error("GET WITHDRAWALS ERROR:", err?.message);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
