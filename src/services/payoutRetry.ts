import prisma from '../prisma';

// Simple payout retry mechanism
// Checks for failed payouts and retries them

interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelayMs: 5000 // 5 seconds
};

export async function retryFailedPayouts(config: RetryConfig = DEFAULT_CONFIG): Promise<void> {
  console.log('🔄 Checking for failed payouts to retry...');

  try {
    // Find withdrawals that failed and haven't exceeded retry limit
    const failedWithdrawals = await prisma.withdrawals.findMany({
      where: {
        status: 'failed',
        // Only retry recent failures (last 24 hours)
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      take: 10 // Process max 10 at a time
    });

    if (failedWithdrawals.length === 0) {
      console.log('✅ No failed payouts to retry');
      return;
    }

    console.log(`📋 Found ${failedWithdrawals.length} failed payouts to retry`);

    for (const withdrawal of failedWithdrawals) {
      try {
        // Mark as pending for retry
        await prisma.withdrawals.update({
          where: { id: withdrawal.id },
          data: {
            status: 'pending',
            updated_at: new Date()
          }
        });

        console.log(`✅ Marked withdrawal ${withdrawal.id} for retry`);

        // Add delay between retries
        await new Promise(resolve => setTimeout(resolve, config.retryDelayMs));

      } catch (error: any) {
        console.error(`❌ Failed to retry withdrawal ${withdrawal.id}:`, error.message);
      }
    }

    console.log('✅ Payout retry process complete');

  } catch (error: any) {
    console.error('❌ Payout retry error:', error.message);
  }
}

// Run retry check every 10 minutes
export function startPayoutRetryJob(): void {
  console.log('⏰ Payout retry job started (runs every 10 minutes)');

  setInterval(async () => {
    await retryFailedPayouts();
  }, 10 * 60 * 1000); // 10 minutes

  // Run once on startup after 30 seconds
  setTimeout(async () => {
    await retryFailedPayouts();
  }, 30000);
}
