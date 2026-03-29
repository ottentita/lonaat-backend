import prisma from '../prisma';

/**
 * AUTO-REFUND EXPIRED WITHDRAWALS
 * Runs periodically to find and refund expired pending withdrawals
 */
export async function expireWithdrawalsJob() {
  try {
    console.log('🔄 Running expired withdrawals check...');

    const now = new Date();

    // Find all expired pending withdrawals
    const expiredWithdrawals = await prisma.withdrawals.findMany({
      where: {
        status: 'pending',
        expiresAt: {
          lte: now
        }
      }
    });

    if (expiredWithdrawals.length === 0) {
      console.log('✅ No expired withdrawals found');
      return;
    }

    console.log(`⏰ Found ${expiredWithdrawals.length} expired withdrawals`);

    // Process each expired withdrawal
    for (const withdrawal of expiredWithdrawals) {
      try {
        await prisma.$transaction(async (tx) => {
          // Double-check status inside transaction
          const current = await tx.withdrawals.findUnique({
            where: { id: withdrawal.id }
          });

          if (!current || current.status !== 'pending') {
            console.log(`⚠️ Withdrawal ${withdrawal.id} already processed, skipping`);
            return;
          }

          console.log(`🔄 Auto-refunding expired withdrawal ${withdrawal.id} (${withdrawal.amount})`);

          // Update status to expired
          await tx.withdrawals.update({
            where: { id: withdrawal.id },
            data: {
              status: 'expired',
              updated_at: new Date()
            }
          });

          // Log status history
          await tx.withdrawalStatusHistory.create({
            data: {
              withdrawalId: withdrawal.id,
              fromStatus: 'pending',
              toStatus: 'expired',
              changedBy: null,
              reason: 'Automatically expired after 24 hours'
            }
          });

          // Refund locked balance
          const userIdStr = String(withdrawal.user_id);
          const wallet = await tx.wallet.findUnique({
            where: { userId: userIdStr }
          });

          if (wallet) {
            await tx.wallet.update({
              where: { userId: userIdStr },
              data: {
                balance: wallet.balance + withdrawal.amount,
                locked_balance: wallet.locked_balance - withdrawal.amount
              }
            });
          }

          // Create refund ledger entry
          await tx.transactionLedger.create({
            data: {
              userId: withdrawal.user_id,
              amount: Math.round(withdrawal.amount),
              type: 'credit',
              reason: 'Withdrawal expired - auto refund'
            }
          });

          console.log(`✅ Expired withdrawal ${withdrawal.id} refunded successfully`);
        });
      } catch (error: any) {
        console.error(`❌ Error processing expired withdrawal ${withdrawal.id}:`, error.message);
      }
    }

    console.log('✅ Expired withdrawals job completed');
  } catch (error: any) {
    console.error('❌ Expired withdrawals job failed:', error.message);
  }
}

// Run every 5 minutes
export function startExpireWithdrawalsJob() {
  console.log('🚀 Starting expired withdrawals job (runs every 5 minutes)');
  
  // Run immediately on startup
  expireWithdrawalsJob();
  
  // Then run every 5 minutes
  setInterval(expireWithdrawalsJob, 5 * 60 * 1000);
}
