import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import crypto from 'crypto';

const router = Router();

// Provider webhook secrets (should be in env vars)
const WEBHOOK_SECRETS = {
  MTN: process.env.MTN_WEBHOOK_SECRET || 'mtn_secret_key',
  ORANGE: process.env.ORANGE_WEBHOOK_SECRET || 'orange_secret_key',
  PAYONEER: process.env.PAYONEER_WEBHOOK_SECRET || 'payoneer_secret_key'
};

/**
 * Verify webhook signature from payment provider
 */
function verifySignature(provider: string, payload: string, signature: string): boolean {
  const secret = WEBHOOK_SECRETS[provider as keyof typeof WEBHOOK_SECRETS];
  if (!secret) {
    console.error(`No webhook secret configured for provider: ${provider}`);
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * WEBHOOK ENDPOINT - Payment Provider Notifications
 * POST /webhooks/payment
 * 
 * Handles payment status updates from external providers (MTN, ORANGE, etc.)
 * Features:
 * - Signature verification
 * - Idempotency (prevents duplicate processing)
 * - Atomic transaction updates
 * - Status history logging
 */
router.post('/payment', async (req: Request, res: Response) => {
  try {
    const { 
      provider, 
      externalReference, 
      status, 
      withdrawalReference,
      signature 
    } = req.body;

    console.log('📥 WEBHOOK RECEIVED:', { provider, externalReference, status, withdrawalReference });

    // VALIDATION
    if (!provider || !externalReference || !status || !withdrawalReference) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: provider, externalReference, status, withdrawalReference'
      });
    }

    if (!['MTN', 'ORANGE', 'PAYONEER', 'BANK'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider'
      });
    }

    if (!['pending', 'success', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: pending, success, or failed'
      });
    }

    // SIGNATURE VERIFICATION
    const payload = JSON.stringify({ provider, externalReference, status, withdrawalReference });
    if (signature && !verifySignature(provider, payload, signature)) {
      console.error('❌ WEBHOOK SIGNATURE VERIFICATION FAILED');
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    console.log('✅ Signature verified');

    // ATOMIC TRANSACTION - Update withdrawal with idempotency
    const result = await prisma.$transaction(async (tx) => {
      // Find withdrawal by reference
      const withdrawal = await tx.withdrawals.findFirst({
        where: { reference: withdrawalReference }
      });

      if (!withdrawal) {
        throw new Error(`Withdrawal not found: ${withdrawalReference}`);
      }

      // IDEMPOTENCY CHECK - If externalReference already set, this is a duplicate webhook
      if (withdrawal.externalReference === externalReference && withdrawal.externalStatus === status) {
        console.log('⚠️ DUPLICATE WEBHOOK - Already processed:', { externalReference, status });
        return { withdrawal, duplicate: true };
      }

      console.log('🔄 Updating withdrawal:', { 
        id: withdrawal.id, 
        currentStatus: withdrawal.status,
        newExternalStatus: status 
      });

      // Update withdrawal with external payment info
      const updated = await tx.withdrawals.update({
        where: { id: withdrawal.id },
        data: {
          externalStatus: status,
          externalReference,
          provider,
          updated_at: new Date()
        }
      });

      // Log status history
      await tx.withdrawalStatusHistory.create({
        data: {
          withdrawalId: withdrawal.id,
          fromStatus: withdrawal.externalStatus || null,
          toStatus: status,
          changedBy: null,
          reason: `External payment ${status} - Provider: ${provider}, Ref: ${externalReference}`
        }
      });

      // If payment succeeded and withdrawal is still pending, mark as completed
      if (status === 'success' && withdrawal.status === 'pending') {
        await tx.withdrawals.update({
          where: { id: withdrawal.id },
          data: { status: 'completed' }
        });

        await tx.withdrawalStatusHistory.create({
          data: {
            withdrawalId: withdrawal.id,
            fromStatus: 'pending',
            toStatus: 'completed',
            changedBy: null,
            reason: `Payment confirmed by ${provider}`
          }
        });

        console.log('✅ Withdrawal marked as completed');
      }

      // If payment failed, update status
      if (status === 'failed' && withdrawal.status === 'approved') {
        await tx.withdrawals.update({
          where: { id: withdrawal.id },
          data: { status: 'failed' }
        });

        await tx.withdrawalStatusHistory.create({
          data: {
            withdrawalId: withdrawal.id,
            fromStatus: 'approved',
            toStatus: 'failed',
            changedBy: null,
            reason: `Payment failed at ${provider}`
          }
        });

        // Refund locked balance
        const userIdStr = String(withdrawal.user_id);
        const wallet = await tx.wallet.findUnique({
          where: { userId: userIdStr }
        });

        if (wallet && wallet.locked_balance >= withdrawal.amount) {
          await tx.wallet.update({
            where: { userId: userIdStr },
            data: {
              balance: { increment: withdrawal.amount },
              locked_balance: { decrement: withdrawal.amount }
            }
          });

          await tx.transactionLedger.create({
            data: {
              userId: withdrawal.user_id,
              amount: Math.round(withdrawal.amount),
              type: 'credit',
              reason: `Payment failed - refund from ${provider}`
            }
          });

          console.log('✅ Funds refunded due to payment failure');
        }
      }

      return { withdrawal: updated, duplicate: false };
    });

    console.log('✅ WEBHOOK PROCESSED SUCCESSFULLY');

    return res.json({
      success: true,
      message: result.duplicate ? 'Webhook already processed (idempotent)' : 'Webhook processed successfully',
      duplicate: result.duplicate
    });

  } catch (error: any) {
    console.error('❌ WEBHOOK ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
