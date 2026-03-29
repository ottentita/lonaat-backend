/**
 * LEDGER SERVICE - INVARIANTS AND GUARDS
 * Enforces business rules at database and service level
 */

import { prisma } from '../prisma';
import { monitoringService } from './monitoring.service';

export interface CreateTransactionData {
  userId: number;
  amount: number;
  type: 'credit' | 'debit';
  source: string;
  referenceId?: number;
  idempotencyKey?: string;
}

/**
 * Compute balance within transaction (consistent read)
 */
async function computeBalance(tx: any, userId: number): Promise<number> {
  const result = await tx.transaction.aggregate({
    where: { userId },
    _sum: { amount: true }
  });

  const credits = await tx.transaction.aggregate({
    where: { userId, type: 'credit' },
    _sum: { amount: true }
  });

  const debits = await tx.transaction.aggregate({
    where: { userId, type: 'debit' },
    _sum: { amount: true }
  });

  const totalCredits = credits._sum.amount || 0;
  const totalDebits = debits._sum.amount || 0;
  
  return totalCredits - totalDebits;
}

/**
 * Create transaction with ledger invariants enforced
 */
export async function createTransaction(data: CreateTransactionData) {
  // Service-level validation
  if (data.amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  if (!['credit', 'debit'].includes(data.type)) {
    throw new Error('Type must be credit or debit');
  }

  return await prisma.$transaction(async (tx) => {
    // Get current balance within transaction
    const currentBalance = await computeBalance(tx, data.userId);

    // Ledger invariant: prevent negative balance for debits
    if (data.type === 'debit' && currentBalance < data.amount) {
      await monitoringService.incrementMetric('insufficient_funds', data.userId, {
        requested: data.amount,
        available: currentBalance
      });
      
      throw new Error(`INSUFFICIENT_FUNDS: Available ${currentBalance}, Required ${data.amount}`);
    }

    // Create transaction record
    const transaction = await tx.transaction.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        type: data.type,
        source: data.source,
        referenceId: data.referenceId || null,
        idempotencyKey: data.idempotencyKey || null,
        createdAt: new Date()
      }
    });

    // Update wallet cache (optional, for performance)
    const newBalance = data.type === 'credit' 
      ? currentBalance + data.amount 
      : currentBalance - data.amount;

    await tx.wallet.upsert({
      where: { userId: data.userId },
      create: {
        userId: data.userId,
        balance: newBalance,
        createdAt: new Date()
      },
      update: {
        balance: newBalance,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Ledger transaction: ${data.type} ${data.amount} for user ${data.userId}`);
    console.log(`   Balance: ${currentBalance} → ${newBalance}`);

    return transaction;
  });
}

/**
 * Validate ledger integrity (run via cron)
 */
export async function validateLedgerIntegrity(): Promise<void> {
  try {
    console.log('🔍 Validating ledger integrity...');
    
    const users = await prisma.user.findMany({
      where: { 
        wallet: { is: { not: null } }
      },
      include: { wallet: true }
    });

    let inconsistencies = 0;

    for (const user of users) {
      // Calculate true balance from transactions
      const transactionBalance = await computeBalance(prisma, user.id);
      const walletBalance = user.wallet?.balance || 0;

      if (Math.abs(transactionBalance - walletBalance) > 0.01) {
        inconsistencies++;
        console.error(`❌ Ledger inconsistency for user ${user.id}:`, {
          walletBalance,
          transactionBalance,
          difference: Math.abs(transactionBalance - walletBalance)
        });

        // Auto-correct wallet balance
        await prisma.wallet.update({
          where: { userId: user.id },
          data: { balance: transactionBalance }
        });

        console.log(`✅ Auto-corrected wallet balance for user ${user.id}`);
      }
    }

    if (inconsistencies === 0) {
      console.log('✅ Ledger integrity validated - no inconsistencies found');
    } else {
      console.log(`⚠️ Found and corrected ${inconsistencies} ledger inconsistencies`);
    }

    await monitoringService.incrementMetric('ledger_integrity_check', undefined, {
      inconsistencies,
      usersChecked: users.length
    });

  } catch (error) {
    console.error('❌ Ledger integrity validation failed:', error);
    await monitoringService.incrementMetric('ledger_integrity_error', undefined, { error: error.message });
  }
}

/**
 * Get transaction history with balance running total
 */
export async function getTransactionHistory(userId: number, limit: number = 50) {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  // Calculate running balance
  let runningBalance = 0;
  const history = transactions.reverse().map(tx => {
    runningBalance += tx.type === 'credit' ? tx.amount : -tx.amount;
    return {
      ...tx,
      balanceAfter: runningBalance
    };
  }).reverse(); // Reverse back to chronological order

  return history;
}

/**
 * Get daily transaction summary
 */
export async function getDailySummary(userId: number, date?: Date) {
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const summary = await prisma.transaction.aggregate({
    where: {
      userId,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    _sum: { amount: true },
    _count: { id: true }
  });

  const credits = await prisma.transaction.aggregate({
    where: {
      userId,
      type: 'credit',
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    _sum: { amount: true },
    _count: { id: true }
  });

  const debits = await prisma.transaction.aggregate({
    where: {
      userId,
      type: 'debit',
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    _sum: { amount: true },
    _count: { id: true }
  });

  return {
    date: targetDate.toISOString().split('T')[0],
    totalTransactions: summary._count.id || 0,
    totalAmount: summary._sum.amount || 0,
    credits: {
      count: credits._count.id || 0,
      amount: credits._sum.amount || 0
    },
    debits: {
      count: debits._count.id || 0,
      amount: debits._sum.amount || 0
    }
  };
}
