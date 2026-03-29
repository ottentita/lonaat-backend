// Wallet Service - Core business logic for financial operations
import prisma from '../prisma';
// import { v4 as uuidv4 } from 'uuid'; // Using crypto.randomUUID instead

interface TransactionData {
  userId: string;
  type: 'deposit' | 'withdrawal' | 'commission';
  amount: number;
  method?: string;
  description?: string;
  metadata?: any;
}

/**
 * CRITICAL RULE: NEVER update wallet balance without logging a transaction
 * All financial operations must be atomic and logged
 */

/**
 * Get or create wallet for user
 */
export async function getOrCreateWallet(userId: string) {
  let wallet = await prisma.wallet.findUnique({
    where: { userId }
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        balance: 0,
        currency: 'XAF'
      }
    });
    console.log('✅ Wallet created for user:', userId);
  }

  return wallet;
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(userId: string): Promise<number> {
  const wallet = await getOrCreateWallet(userId);
  return wallet.balance;
}

/**
 * Create transaction log (CORE LEDGER)
 */
async function createTransaction(data: TransactionData, referenceId?: string) {
  const transaction = await prisma.transaction.create({
    data: {
      userId: data.userId,
      type: data.type,
      amount: data.amount,
      status: 'completed',
      method: data.method || null,
      referenceId: referenceId || crypto.randomUUID(),
      description: data.description || null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null
    }
  });

  console.log('📝 Transaction logged:', {
    id: transaction.id,
    type: data.type,
    amount: data.amount,
    userId: data.userId
  });

  return transaction;
}

/**
 * Add funds to wallet (ATOMIC OPERATION)
 * Used for: deposits, commissions
 */
export async function addFunds(
  userId: string,
  amount: number,
  type: 'deposit' | 'commission',
  method?: string,
  description?: string,
  metadata?: any
) {
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Use Prisma transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Get or create wallet
    let wallet = await tx.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          userId,
          balance: 0,
          currency: 'XAF'
        }
      });
    }

    // Update wallet balance
    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: {
        balance: { increment: amount }
      }
    });

    // Log transaction
    const transaction = await tx.transaction.create({
      data: {
        userId,
        type,
        amount,
        status: 'completed',
        method: method || null,
        referenceId: crypto.randomUUID(),
        description: description || null,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });

    return { wallet: updatedWallet, transaction };
  });

  console.log('✅ Funds added:', {
    userId,
    amount,
    type,
    newBalance: result.wallet.balance
  });

  return result;
}

/**
 * Deduct funds from wallet (ATOMIC OPERATION)
 * Used for: withdrawals
 */
export async function deductFunds(
  userId: string,
  amount: number,
  type: 'withdrawal',
  method?: string,
  description?: string,
  metadata?: any
) {
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Use Prisma transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Get wallet
    const wallet = await tx.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Validate sufficient balance
    if (wallet.balance < amount) {
      throw new Error(`Insufficient balance. Available: ${wallet.balance} XAF, Required: ${amount} XAF`);
    }

    // Update wallet balance
    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: amount }
      }
    });

    // Log transaction
    const transaction = await tx.transaction.create({
      data: {
        userId,
        type,
        amount,
        status: 'completed',
        method: method || null,
        referenceId: crypto.randomUUID(),
        description: description || null,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });

    return { wallet: updatedWallet, transaction };
  });

  console.log('✅ Funds deducted:', {
    userId,
    amount,
    type,
    newBalance: result.wallet.balance
  });

  return result;
}

/**
 * Process deposit approval (Admin action)
 */
export async function processDepositApproval(depositId: string, adminId: string) {
  const result = await prisma.$transaction(async (tx) => {
    // Get deposit
    const deposit = await tx.deposit.findUnique({
      where: { id: depositId }
    });

    if (!deposit) {
      throw new Error('Deposit not found');
    }

    if (deposit.status !== 'pending') {
      throw new Error(`Deposit already ${deposit.status}`);
    }

    // Update deposit status
    const updatedDeposit = await tx.deposit.update({
      where: { id: depositId },
      data: {
        status: 'confirmed',
        processedBy: adminId,
        processedAt: new Date()
      }
    });

    // Get or create wallet
    let wallet = await tx.wallet.findUnique({
      where: { userId: deposit.userId }
    });

    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          userId: deposit.userId,
          balance: 0,
          currency: 'XAF'
        }
      });
    }

    // Increase wallet balance
    const updatedWallet = await tx.wallet.update({
      where: { userId: deposit.userId },
      data: {
        balance: { increment: deposit.amount }
      }
    });

    // Create transaction log
    const transaction = await tx.transaction.create({
      data: {
        userId: deposit.userId,
        type: 'deposit',
        amount: deposit.amount,
        status: 'completed',
        method: deposit.method,
        referenceId: `deposit-${depositId}`,
        description: `Deposit approved by admin`,
        metadata: JSON.stringify({ depositId, adminId })
      }
    });

    return { deposit: updatedDeposit, wallet: updatedWallet, transaction };
  });

  console.log('✅ Deposit approved:', {
    depositId,
    amount: result.deposit.amount,
    userId: result.deposit.userId,
    newBalance: result.wallet.balance
  });

  return result;
}

/**
 * Process deposit rejection (Admin action)
 */
export async function processDepositRejection(
  depositId: string,
  adminId: string,
  adminNote?: string
) {
  const deposit = await prisma.deposit.update({
    where: { id: depositId },
    data: {
      status: 'rejected',
      processedBy: adminId,
      processedAt: new Date(),
      adminNote: adminNote || 'Deposit rejected by admin'
    }
  });

  console.log('❌ Deposit rejected:', {
    depositId,
    userId: deposit.userId,
    amount: deposit.amount
  });

  return deposit;
}

/**
 * Process withdrawal approval (Admin action)
 */
export async function processWithdrawalApproval(
  withdrawalId: string,
  adminId: string,
  adminNote?: string
) {
  const withdrawal = await prisma.withdrawal.update({
    where: { id: withdrawalId },
    data: {
      status: 'approved',
      processedBy: adminId,
      processedAt: new Date(),
      adminNote: adminNote || 'Withdrawal approved and processed'
    }
  });

  console.log('✅ Withdrawal approved:', {
    withdrawalId,
    userId: withdrawal.userId,
    amount: withdrawal.amount
  });

  return withdrawal;
}

/**
 * Process withdrawal rejection (Admin action)
 * IMPORTANT: Refund the amount back to wallet
 */
export async function processWithdrawalRejection(
  withdrawalId: string,
  adminId: string,
  adminNote?: string
) {
  const result = await prisma.$transaction(async (tx) => {
    // Get withdrawal
    const withdrawal = await tx.withdrawal.findUnique({
      where: { id: withdrawalId }
    });

    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    if (withdrawal.status !== 'pending') {
      throw new Error(`Withdrawal already ${withdrawal.status}`);
    }

    // Update withdrawal status
    const updatedWithdrawal = await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'rejected',
        processedBy: adminId,
        processedAt: new Date(),
        adminNote: adminNote || 'Withdrawal rejected by admin'
      }
    });

    // Refund amount back to wallet
    const wallet = await tx.wallet.update({
      where: { userId: withdrawal.userId },
      data: {
        balance: { increment: withdrawal.amount }
      }
    });

    // Log refund transaction
    const transaction = await tx.transaction.create({
      data: {
        userId: withdrawal.userId,
        type: 'deposit',
        amount: withdrawal.amount,
        status: 'completed',
        method: 'refund',
        referenceId: `refund-${withdrawalId}`,
        description: `Withdrawal refund: ${adminNote || 'Withdrawal rejected'}`,
        metadata: JSON.stringify({ withdrawalId, adminId, refund: true })
      }
    });

    return { withdrawal: updatedWithdrawal, wallet, transaction };
  });

  console.log('❌ Withdrawal rejected and refunded:', {
    withdrawalId,
    userId: result.withdrawal.userId,
    amount: result.withdrawal.amount,
    newBalance: result.wallet.balance
  });

  return result;
}

/**
 * Add commission to wallet
 */
export async function addCommission(
  userId: string,
  amount: number,
  description?: string,
  metadata?: any
) {
  return addFunds(userId, amount, 'commission', 'commission', description, metadata);
}

/**
 * Check if transaction reference already exists (prevent duplicates)
 */
export async function transactionExists(referenceId: string): Promise<boolean> {
  const transaction = await prisma.transaction.findUnique({
    where: { referenceId }
  });
  return !!transaction;
}

/**
 * Get user transactions
 */
export async function getUserTransactions(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.transaction.count({
      where: { userId }
    })
  ]);

  return { transactions, total };
}

/**
 * PRODUCTION-GRADE TRANSACTION SYSTEM
 * For TransactionLedger model with Int userId
 */

/**
 * Ensure wallet exists for Int userId
 */
export async function ensureWalletForIntUser(userId: number) {
  const userIdStr = String(userId);
  
  let wallet = await prisma.wallet.findUnique({
    where: { userId: userIdStr }
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId: userIdStr,
        balance: 0,
        currency: 'XAF'
      }
    });
    console.log('✅ Wallet created for user:', userId);
  }

  return wallet;
}

/**
 * Create transaction with atomic balance update
 * Uses TransactionLedger model
 */
export async function createTransaction({
  userId,
  amount,
  type,
  description
}: {
  userId: number;
  amount: number;
  type: 'credit' | 'debit';
  description?: string;
}) {
  if (!amount || amount <= 0) {
    throw new Error("Invalid amount");
  }

  return await prisma.$transaction(async (tx) => {
    const userIdStr = String(userId);

    const wallet = await tx.wallet.findUnique({
      where: { userId: userIdStr }
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    let newBalance = wallet.balance;

    if (type === 'credit') {
      newBalance += amount;
    } else {
      if (wallet.balance < amount) {
        throw new Error("Insufficient balance");
      }
      newBalance -= amount;
    }

    const transaction = await tx.transactionLedger.create({
      data: {
        userId,
        amount: Math.round(amount),
        type,
        reason: description || ''
      }
    });

    await tx.wallet.update({
      where: { userId: userIdStr },
      data: {
        balance: newBalance
      }
    });

    console.log("TX:", {
      userId,
      amount,
      type
    });

    return transaction;
  });
}

export default {
  getOrCreateWallet,
  getWalletBalance,
  addFunds,
  deductFunds,
  processDepositApproval,
  processDepositRejection,
  processWithdrawalApproval,
  processWithdrawalRejection,
  addCommission,
  transactionExists,
  getUserTransactions,
  ensureWalletForIntUser,
  createTransaction
};
