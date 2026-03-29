import prisma from '../prisma';

/**
 * DAILY RECONCILIATION JOB
 * Checks DB withdrawals against provider records to fix inconsistencies
 */

interface ProviderRecord {
  reference: string;
  status: 'pending' | 'success' | 'failed';
  externalReference: string;
  amount: number;
}

/**
 * Mock function to fetch records from payment provider
 * In production, this would call actual provider APIs
 */
async function fetchProviderRecords(provider: string, startDate: Date, endDate: Date): Promise<ProviderRecord[]> {
  console.log(`📡 Fetching ${provider} records from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  // TODO: Replace with actual provider API calls
  // Example:
  // - MTN Mobile Money API
  // - Orange Money API
  // - Payoneer API
  
  // Mock data for testing
  return [];
}

/**
 * Reconcile withdrawals for a specific provider
 */
async function reconcileProvider(provider: string) {
  try {
    console.log(`\n🔄 Starting reconciliation for ${provider}...`);

    // Get date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Fetch DB withdrawals for this provider
    const dbWithdrawals = await prisma.withdrawals.findMany({
      where: {
        provider,
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['approved', 'pending', 'completed']
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Found ${dbWithdrawals.length} withdrawals in DB for ${provider}`);

    if (dbWithdrawals.length === 0) {
      console.log(`✅ No withdrawals to reconcile for ${provider}`);
      return;
    }

    // Fetch provider records
    const providerRecords = await fetchProviderRecords(provider, startDate, endDate);
    console.log(`📊 Found ${providerRecords.length} records from ${provider} API`);

    // Create lookup map for provider records
    const providerMap = new Map<string, ProviderRecord>();
    providerRecords.forEach(record => {
      providerMap.set(record.reference, record);
    });

    let discrepanciesFound = 0;
    let fixedCount = 0;

    // Check each DB withdrawal against provider records
    for (const withdrawal of dbWithdrawals) {
      const providerRecord = providerMap.get(withdrawal.reference || '');

      // DISCREPANCY 1: Withdrawal in DB but not in provider records
      if (!providerRecord && withdrawal.status === 'approved') {
        console.log(`⚠️ DISCREPANCY: Withdrawal ${withdrawal.reference} not found in ${provider} records`);
        discrepanciesFound++;

        // Log discrepancy
        await prisma.withdrawalStatusHistory.create({
          data: {
            withdrawalId: withdrawal.id,
            fromStatus: withdrawal.status,
            toStatus: withdrawal.status,
            changedBy: null,
            reason: `Reconciliation: Not found in ${provider} records - may need manual review`
          }
        });
      }

      // DISCREPANCY 2: Status mismatch
      if (providerRecord && withdrawal.externalStatus !== providerRecord.status) {
        console.log(`⚠️ DISCREPANCY: Status mismatch for ${withdrawal.reference}`);
        console.log(`   DB: ${withdrawal.externalStatus}, Provider: ${providerRecord.status}`);
        discrepanciesFound++;

        // Fix the discrepancy
        await prisma.$transaction(async (tx) => {
          await tx.withdrawals.update({
            where: { id: withdrawal.id },
            data: {
              externalStatus: providerRecord.status,
              externalReference: providerRecord.externalReference,
              updated_at: new Date()
            }
          });

          await tx.withdrawalStatusHistory.create({
            data: {
              withdrawalId: withdrawal.id,
              fromStatus: withdrawal.externalStatus || null,
              toStatus: providerRecord.status,
              changedBy: null,
              reason: `Reconciliation: Updated from ${provider} records`
            }
          });

          // If provider shows success but DB shows pending, mark as completed
          if (providerRecord.status === 'success' && withdrawal.status === 'pending') {
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
                reason: `Reconciliation: Confirmed by ${provider}`
              }
            });
          }

          // If provider shows failed, refund if needed
          if (providerRecord.status === 'failed' && withdrawal.status !== 'failed') {
            await tx.withdrawals.update({
              where: { id: withdrawal.id },
              data: { status: 'failed' }
            });

            const userIdStr = String(withdrawal.user_id);
            const wallet = await tx.wallet.findUnique({
              where: { userId: userIdStr }
            });

            if (wallet && wallet.locked_balance >= withdrawal.amount) {
              await tx.wallet.update({
                where: { userId: userIdStr },
                data: {
                  balance: wallet.balance + withdrawal.amount,
                  locked_balance: wallet.locked_balance - withdrawal.amount
                }
              });

              await tx.transactionLedger.create({
                data: {
                  userId: withdrawal.user_id,
                  amount: Math.round(withdrawal.amount),
                  type: 'credit',
                  reason: `Reconciliation: Payment failed at ${provider}`
                }
              });
            }
          }
        });

        fixedCount++;
        console.log(`✅ Fixed discrepancy for ${withdrawal.reference}`);
      }

      // DISCREPANCY 3: Amount mismatch
      if (providerRecord && Math.abs(withdrawal.amount - providerRecord.amount) > 0.01) {
        console.log(`⚠️ DISCREPANCY: Amount mismatch for ${withdrawal.reference}`);
        console.log(`   DB: ${withdrawal.amount}, Provider: ${providerRecord.amount}`);
        discrepanciesFound++;

        await prisma.withdrawalStatusHistory.create({
          data: {
            withdrawalId: withdrawal.id,
            fromStatus: withdrawal.status,
            toStatus: withdrawal.status,
            changedBy: null,
            reason: `Reconciliation: Amount mismatch - DB: ${withdrawal.amount}, Provider: ${providerRecord.amount}`
          }
        });
      }
    }

    console.log(`\n📊 ${provider} Reconciliation Summary:`);
    console.log(`   Discrepancies found: ${discrepanciesFound}`);
    console.log(`   Discrepancies fixed: ${fixedCount}`);
    console.log(`✅ ${provider} reconciliation complete\n`);

  } catch (error: any) {
    console.error(`❌ Error reconciling ${provider}:`, error.message);
  }
}

/**
 * Main reconciliation job - runs for all providers
 */
export async function reconcilePaymentsJob() {
  try {
    console.log('\n═══════════════════════════════════════');
    console.log('🔄 STARTING DAILY PAYMENT RECONCILIATION');
    console.log('═══════════════════════════════════════');

    const providers = ['MTN', 'ORANGE', 'PAYONEER'];

    for (const provider of providers) {
      await reconcileProvider(provider);
    }

    console.log('═══════════════════════════════════════');
    console.log('✅ DAILY RECONCILIATION COMPLETE');
    console.log('═══════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ Reconciliation job failed:', error.message);
  }
}

/**
 * Start daily reconciliation job
 * Runs every 24 hours at 2 AM
 */
export function startReconciliationJob() {
  console.log('🚀 Starting daily payment reconciliation job (runs at 2 AM daily)');

  // Calculate time until next 2 AM
  const now = new Date();
  const next2AM = new Date();
  next2AM.setHours(2, 0, 0, 0);
  
  if (next2AM <= now) {
    next2AM.setDate(next2AM.getDate() + 1);
  }

  const msUntilNext2AM = next2AM.getTime() - now.getTime();

  // Run first reconciliation at 2 AM
  setTimeout(() => {
    reconcilePaymentsJob();
    
    // Then run every 24 hours
    setInterval(reconcilePaymentsJob, 24 * 60 * 60 * 1000);
  }, msUntilNext2AM);

  console.log(`⏰ Next reconciliation scheduled for: ${next2AM.toLocaleString()}`);
}
