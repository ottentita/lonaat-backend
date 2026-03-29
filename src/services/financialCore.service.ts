/**
 * FINANCIAL CORE SERVICE
 * Production-grade financial operations with complete audit trail
 * 
 * RULES:
 * 1. Every balance change MUST log a Transaction
 * 2. All operations are atomic (use $transaction)
 * 3. Balance is calculated from Transaction log (source of truth)
 * 4. Wallet.balance is optional cache
 */

import { prisma } from '../prisma';

// ==================== TYPES ====================

export type TransactionType = 'credit' | 'debit';
export type TransactionSource = 'commission' | 'withdrawal' | 'bonus' | 'deposit' | 'refund' | 'purchase';

export interface CreateTransactionData {
  userId: number;
  amount: number;
  type: TransactionType;
  source: TransactionSource;
  referenceId?: number;
  idempotencyKey?: string;
}

export interface WalletBalance {
  balance: number;
  totalCredits: number;
  totalDebits: number;
  transactionCount: number;
}

// ==================== WALLET OPERATIONS ====================

/**
 * Get or create wallet for user
 * Wallet.balance is optional cache - true balance comes from transactions
 */
export async function getOrCreateWallet(userId: number) {
  let wallet = await prisma.Wallet.findUnique({
    where: { userId }
  });

  if (!wallet) {
    wallet = await prisma.Wallet.create({
      data: {
        userId,
        balance: 0
      }
    });
    console.log('✅ Wallet created for user:', userId);
  }

  return wallet;
}

/**
 * Calculate true balance from transaction log (SOURCE OF TRUTH)
 */
export async function calculateBalance(userId: number): Promise<WalletBalance> {
  const transactions = await prisma.Transaction.findMany({
    where: { userId }
  });

  let totalCredits = 0;
  let totalDebits = 0;

  transactions.forEach(tx => {
    if (tx.type === 'credit') {
      totalCredits += tx.amount;
    } else {
      totalDebits += tx.amount;
    }
  });

  const balance = totalCredits - totalDebits;

  return {
    balance,
    totalCredits,
    totalDebits,
    transactionCount: transactions.length
  };
}

/**
 * Sync wallet cache with transaction log
 */
export async function syncWalletBalance(userId: number) {
  const { balance } = await calculateBalance(userId);
  
  await prisma.Wallet.update({
    where: { userId },
    data: { balance }
  });

  return balance;
}

// ==================== TRANSACTION OPERATIONS ====================

/**
 * Create transaction and update wallet (ATOMIC)
 * Includes all financial guards
 */
export async function createTransaction(data: CreateTransactionData) {
  // GUARD 1: Validate amount
  validateAmount(data.amount);

  // GUARD 2: Check idempotency (prevent duplicate execution)
  if (data.idempotencyKey) {
    const existing = await checkIdempotency(data.idempotencyKey);
    if (existing) {
      console.log(`⚠️ Duplicate transaction prevented: ${data.idempotencyKey}`);
      return existing;
    }
  }

  // GUARD 3: For debits, check sufficient balance (prevent negative balance)
  if (data.type === 'debit') {
    const { balance } = await calculateBalance(data.userId);
    if (balance < data.amount) {
      throw new Error(`Insufficient balance. Available: ${balance}, Required: ${data.amount}`);
    }
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Create transaction log
    const transaction = await tx.Transaction.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        type: data.type,
        source: data.source,
        referenceId: data.referenceId || null,
        idempotencyKey: data.idempotencyKey || null
      }
    });

    // 2. Update wallet cache
    const wallet = await tx.Wallet.findUnique({
      where: { userId: data.userId }
    });

    if (!wallet) {
      // Create wallet if doesn't exist
      await tx.Wallet.create({
        data: {
          userId: data.userId,
          balance: data.type === 'credit' ? data.amount : -data.amount
        }
      });
    } else {
      // Update existing wallet
      const balanceChange = data.type === 'credit' ? data.amount : -data.amount;
      await tx.Wallet.update({
        where: { userId: data.userId },
        data: {
          balance: { increment: balanceChange }
        }
      });
    }

    console.log(`✅ Transaction created: ${data.type} ${data.amount} from ${data.source}`);
    
    return transaction;
  });
}

/**
 * Add funds (credit)
 */
export async function addFunds(
  userId: number,
  amount: number,
  source: TransactionSource,
  referenceId?: number
) {
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  return await createTransaction({
    userId,
    amount,
    type: 'credit',
    source,
    referenceId
  });
}

/**
 * Deduct funds (debit)
 */
export async function deductFunds(
  userId: number,
  amount: number,
  source: TransactionSource,
  referenceId?: number
) {
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Check sufficient balance
  const { balance } = await calculateBalance(userId);
  if (balance < amount) {
    throw new Error(`Insufficient balance. Available: ${balance}, Required: ${amount}`);
  }

  return await createTransaction({
    userId,
    amount,
    type: 'debit',
    source,
    referenceId
  });
}

// ==================== COMMISSION OPERATIONS ====================

/**
 * Create commission and credit wallet (ATOMIC)
 */
export async function createCommission(
  userId: number,
  productId: number,
  amount: number,
  status: 'pending' | 'approved' | 'paid' = 'pending'
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create commission
    const commission = await tx.Commission.create({
      data: {
        userId,
        productId,
        amount,
        status
      }
    });

    // 2. If approved, credit wallet immediately
    if (status === 'approved' || status === 'paid') {
      await tx.Transaction.create({
        data: {
          userId,
          amount,
          type: 'credit',
          source: 'commission',
          referenceId: commission.id
        }
      });

      // Update wallet cache
      await tx.Wallet.upsert({
        where: { userId },
        create: {
          userId,
          balance: amount
        },
        update: {
          balance: { increment: amount }
        }
      });
    }

    console.log(`✅ Commission created: ${amount} (${status})`);
    
    return commission;
  });
}

/**
 * Approve commission and credit wallet (ATOMIC)
 */
export async function approveCommission(commissionId: number) {
  return await prisma.$transaction(async (tx) => {
    // 1. Get commission
    const commission = await tx.Commission.findUnique({
      where: { id: commissionId }
    });

    if (!commission) {
      throw new Error('Commission not found');
    }

    if (commission.status !== 'pending') {
      throw new Error(`Commission already ${commission.status}`);
    }

    // 2. Update commission status
    const updated = await tx.Commission.update({
      where: { id: commissionId },
      data: { status: 'approved' }
    });

    // 3. Credit wallet
    await tx.Transaction.create({
      data: {
        userId: commission.userId,
        amount: commission.amount,
        type: 'credit',
        source: 'commission',
        referenceId: commissionId
      }
    });

    // 4. Update wallet cache
    await tx.Wallet.upsert({
      where: { userId: commission.userId },
      create: {
        userId: commission.userId,
        balance: commission.amount
      },
      update: {
        balance: { increment: commission.amount }
      }
    });

    console.log(`✅ Commission approved: ${commission.amount} for user ${commission.userId}`);
    
    return updated;
  });
}

// ==================== QUERY HELPERS ====================

/**
 * Get transaction history
 */
export async function getTransactions(
  userId: number,
  limit: number = 50,
  offset: number = 0,
  type?: TransactionType,
  source?: TransactionSource
) {
  const where: any = { userId };
  if (type) where.type = type;
  if (source) where.source = source;

  const [transactions, total] = await Promise.all([
    prisma.Transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.Transaction.count({ where })
  ]);

  return {
    transactions,
    total,
    limit,
    offset,
    pages: Math.ceil(total / limit)
  };
}

/**
 * Get user commissions
 */
export async function getCommissions(
  userId: number,
  status?: string,
  limit: number = 50,
  offset: number = 0
) {
  const where: any = { userId };
  if (status) where.status = status;

  const [commissions, total] = await Promise.all([
    prisma.Commission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.Commission.count({ where })
  ]);

  return {
    commissions,
    total,
    limit,
    offset,
    pages: Math.ceil(total / limit)
  };
}

/**
 * Get wallet with calculated balance
 */
export async function getWalletWithBalance(userId: number) {
  const wallet = await getOrCreateWallet(userId);
  const calculatedBalance = await calculateBalance(userId);

  return {
    wallet,
    calculatedBalance,
    balanceMatch: Math.abs(wallet.balance - calculatedBalance.balance) < 0.01
  };
}

// ==================== SECURITY & VALIDATION ====================

const MAX_WITHDRAWAL_AMOUNT = 10000;
const MIN_WITHDRAWAL_AMOUNT = 10;
const MIN_BALANCE_AFTER_WITHDRAWAL = 0;
const MAX_TRANSACTION_AMOUNT = 1000000;
const MIN_TRANSACTION_AMOUNT = 0.01;

/**
 * Validate withdrawal request
 */
export function validateWithdrawal(amount: number, balance: number) {
  if (amount < MIN_WITHDRAWAL_AMOUNT) {
    throw new Error(`Minimum withdrawal is ${MIN_WITHDRAWAL_AMOUNT}`);
  }

  if (amount > MAX_WITHDRAWAL_AMOUNT) {
    throw new Error(`Maximum withdrawal is ${MAX_WITHDRAWAL_AMOUNT}`);
  }

  if (balance < amount) {
    throw new Error(`Insufficient balance. Available: ${balance}, Requested: ${amount}`);
  }

  if (balance - amount < MIN_BALANCE_AFTER_WITHDRAWAL) {
    throw new Error(`Minimum balance after withdrawal must be ${MIN_BALANCE_AFTER_WITHDRAWAL}`);
  }

  return true;
}

/**
 * Check if transaction reference exists (prevent duplicates)
 */
export async function transactionExists(referenceId: number): Promise<boolean> {
  const transaction = await prisma.Transaction.findFirst({
    where: { referenceId }
  });
  return !!transaction;
}

/**
 * GUARD: Check idempotency key (prevent duplicate execution)
 */
export async function checkIdempotency(idempotencyKey: string) {
  const existing = await prisma.Transaction.findUnique({
    where: { idempotencyKey }
  });
  return existing;
}

/**
 * GUARD: Validate transaction amount
 */
export function validateAmount(amount: number) {
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  if (amount < MIN_TRANSACTION_AMOUNT) {
    throw new Error(`Amount must be at least ${MIN_TRANSACTION_AMOUNT}`);
  }

  if (amount > MAX_TRANSACTION_AMOUNT) {
    throw new Error(`Amount cannot exceed ${MAX_TRANSACTION_AMOUNT}`);
  }

  // Check for invalid numbers
  if (!Number.isFinite(amount)) {
    throw new Error('Amount must be a valid number');
  }

  return true;
}

/**
 * GUARD: Prevent negative balance
 */
export async function preventNegativeBalance(userId: number, debitAmount: number) {
  const { balance } = await calculateBalance(userId);
  
  if (balance < debitAmount) {
    throw new Error(
      `Insufficient balance. Available: ${balance.toFixed(2)}, Required: ${debitAmount.toFixed(2)}`
    );
  }

  if (balance - debitAmount < 0) {
    throw new Error('Transaction would result in negative balance');
  }

  return true;
}

/**
 * GUARD: Prevent double withdrawal
 */
export async function preventDoubleWithdrawal(
  userId: number,
  amount: number,
  timeWindowMinutes: number = 5
) {
  const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  const recentWithdrawal = await prisma.Transaction.findFirst({
    where: {
      userId,
      type: 'debit',
      source: 'withdrawal',
      amount,
      createdAt: { gte: timeWindow }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (recentWithdrawal) {
    throw new Error(
      `Duplicate withdrawal detected. A withdrawal of ${amount} was already processed ${Math.floor((Date.now() - recentWithdrawal.createdAt.getTime()) / 1000)} seconds ago.`
    );
  }

  return true;
}

export default {
  // Wallet
  getOrCreateWallet,
  calculateBalance,
  syncWalletBalance,
  getWalletWithBalance,
  
  // Transactions
  createTransaction,
  addFunds,
  deductFunds,
  getTransactions,
  transactionExists,
  
  // Commissions
  createCommission,
  approveCommission,
  getCommissions,
  
  // Validation & Guards
  validateWithdrawal,
  validateAmount,
  checkIdempotency,
  preventNegativeBalance,
  preventDoubleWithdrawal
};
