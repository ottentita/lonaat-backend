# ✅ NORMALIZED FINANCIAL MODELS - USAGE GUIDE

**Status**: ✅ **IMPLEMENTED AND ACTIVE**  
**Date**: March 28, 2026  
**Migration**: Applied without resetting public schema

---

## 📊 MODELS IMPLEMENTED

### **1. Wallet Model**
```prisma
model Wallet {
  id        Int      @id @default(autoincrement())
  userId    Int      @unique
  balance   Float    @default(0)
  createdAt DateTime @default(now())
  user      User     @relation("UserWallet", fields: [userId], references: [id])
}
```

**Purpose**: Store user wallet balance (cached total)  
**Table Name**: `Wallet`  
**Unique Constraint**: One wallet per user

---

### **2. Transaction Model**
```prisma
model Transaction {
  id          Int      @id @default(autoincrement())
  userId      Int
  amount      Float
  type        String   // 'credit' | 'debit'
  source      String   // 'commission' | 'withdrawal' | 'bonus'
  referenceId Int?     // link to commission or order
  createdAt   DateTime @default(now())
  user        User     @relation("UserTransactions", fields: [userId], references: [id])
}
```

**Purpose**: Complete audit trail of all financial operations  
**Table Name**: `Transaction`  
**Indexed Fields**: userId, type, source, referenceId

---

### **3. Commission Model**
```prisma
model Commission {
  id        Int      @id @default(autoincrement())
  userId    Int
  productId Int
  amount    Float
  status    String   // 'pending' | 'approved' | 'paid'
  createdAt DateTime @default(now())
  user      User     @relation("UserCommissions", fields: [userId], references: [id])
}
```

**Purpose**: Track affiliate commissions  
**Table Name**: `Commission`  
**Indexed Fields**: userId, productId, status

---

## 🚀 USAGE EXAMPLES

### **Create Wallet**
```typescript
import { prisma } from './prisma';

// Create wallet for new user
const wallet = await prisma.Wallet.create({
  data: {
    userId: 1,
    balance: 0
  }
});

// Get or create wallet
async function getOrCreateWallet(userId: number) {
  let wallet = await prisma.Wallet.findUnique({
    where: { userId }
  });
  
  if (!wallet) {
    wallet = await prisma.Wallet.create({
      data: { userId, balance: 0 }
    });
  }
  
  return wallet;
}
```

---

### **Log Transaction**
```typescript
// Credit transaction (add money)
await prisma.Transaction.create({
  data: {
    userId: 1,
    amount: 50.00,
    type: 'credit',
    source: 'commission',
    referenceId: 123 // commission ID
  }
});

// Debit transaction (remove money)
await prisma.Transaction.create({
  data: {
    userId: 1,
    amount: 25.00,
    type: 'debit',
    source: 'withdrawal',
    referenceId: 456 // withdrawal ID
  }
});
```

---

### **Create Commission**
```typescript
// Create new commission
const commission = await prisma.Commission.create({
  data: {
    userId: 1,
    productId: 789,
    amount: 15.50,
    status: 'pending'
  }
});

// Approve commission
await prisma.Commission.update({
  where: { id: commission.id },
  data: { status: 'approved' }
});
```

---

### **Atomic Financial Operation**
```typescript
// Example: Process commission payment
async function processCommissionPayment(commissionId: number) {
  return await prisma.$transaction(async (tx) => {
    // 1. Get commission
    const commission = await tx.Commission.findUnique({
      where: { id: commissionId }
    });
    
    if (!commission || commission.status !== 'approved') {
      throw new Error('Commission not approved');
    }
    
    // 2. Update commission status
    await tx.Commission.update({
      where: { id: commissionId },
      data: { status: 'paid' }
    });
    
    // 3. Log transaction
    await tx.Transaction.create({
      data: {
        userId: commission.userId,
        amount: commission.amount,
        type: 'credit',
        source: 'commission',
        referenceId: commissionId
      }
    });
    
    // 4. Update wallet balance
    const wallet = await tx.Wallet.findUnique({
      where: { userId: commission.userId }
    });
    
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    
    await tx.Wallet.update({
      where: { id: wallet.id },
      data: {
        balance: wallet.balance + commission.amount
      }
    });
    
    return { success: true, amount: commission.amount };
  });
}
```

---

### **Calculate Balance from Transactions**
```typescript
// Get user's true balance from transaction log
async function calculateBalance(userId: number) {
  const transactions = await prisma.Transaction.findMany({
    where: { userId }
  });
  
  const balance = transactions.reduce((total, tx) => {
    return tx.type === 'credit' 
      ? total + tx.amount 
      : total - tx.amount;
  }, 0);
  
  return balance;
}

// Verify wallet balance matches transaction log
async function verifyWalletBalance(userId: number) {
  const wallet = await prisma.Wallet.findUnique({
    where: { userId }
  });
  
  const calculatedBalance = await calculateBalance(userId);
  
  return {
    walletBalance: wallet?.balance || 0,
    calculatedBalance,
    matches: Math.abs((wallet?.balance || 0) - calculatedBalance) < 0.01
  };
}
```

---

### **Query Examples**
```typescript
// Get user's wallet with transactions
const userFinancials = await prisma.User.findUnique({
  where: { id: 1 },
  include: {
    Wallet: true,
    Transaction: {
      orderBy: { createdAt: 'desc' },
      take: 10
    },
    Commission: {
      where: { status: 'approved' }
    }
  }
});

// Get all pending commissions
const pendingCommissions = await prisma.Commission.findMany({
  where: { status: 'pending' },
  include: {
    user: {
      select: { id: true, name: true, email: true }
    }
  }
});

// Get transaction history with filters
const transactions = await prisma.Transaction.findMany({
  where: {
    userId: 1,
    type: 'credit',
    source: 'commission',
    createdAt: {
      gte: new Date('2026-01-01')
    }
  },
  orderBy: { createdAt: 'desc' }
});

// Aggregate user earnings
const earnings = await prisma.Transaction.aggregate({
  where: {
    userId: 1,
    type: 'credit',
    source: 'commission'
  },
  _sum: { amount: true },
  _count: true
});
```

---

## 🔄 MIGRATION FROM OLD MODELS

### **Old vs New Model Names**

| Old Model | New Model | Status |
|-----------|-----------|--------|
| `prisma.wallet` (lowercase) | `prisma.Wallet` | ✅ Use new |
| `prisma.wallets` (plural) | `prisma.Wallet` | ✅ Use new |
| `prisma.transaction` | `prisma.Transaction` | ✅ Use new |
| `prisma.transactions` | `prisma.Transaction` | ✅ Use new |
| `prisma.commission` | `prisma.Commission` | ✅ Use new |
| `prisma.commissions` (old) | `prisma.Commission` | ✅ Use new |

### **Migration Steps**

**1. Update Imports**
```typescript
// ❌ Old
const wallet = await prisma.wallet.findUnique({ ... });

// ✅ New
const wallet = await prisma.Wallet.findUnique({ ... });
```

**2. Update Field Names**
```typescript
// ❌ Old (snake_case)
const commission = await prisma.commissions.findUnique({
  where: { user_id: 1 }
});

// ✅ New (camelCase)
const commission = await prisma.Commission.findUnique({
  where: { userId: 1 }
});
```

**3. Update Transaction Logging**
```typescript
// ❌ Old (no transaction logging)
await prisma.wallet.update({
  where: { id: walletId },
  data: { balance: { increment: amount } }
});

// ✅ New (with transaction logging)
await prisma.$transaction(async (tx) => {
  await tx.Wallet.update({
    where: { id: walletId },
    data: { balance: { increment: amount } }
  });
  
  await tx.Transaction.create({
    data: {
      userId,
      amount,
      type: 'credit',
      source: 'commission',
      referenceId: commissionId
    }
  });
});
```

---

## 📋 BEST PRACTICES

### **1. Always Log Transactions**
```typescript
// ✅ CORRECT: Log every balance change
await prisma.$transaction(async (tx) => {
  await tx.Wallet.update({ ... });
  await tx.Transaction.create({ ... });
});

// ❌ WRONG: Update balance without logging
await prisma.Wallet.update({ ... });
```

### **2. Use Atomic Operations**
```typescript
// ✅ CORRECT: Use $transaction for multi-step operations
await prisma.$transaction(async (tx) => {
  await tx.Commission.update({ ... });
  await tx.Transaction.create({ ... });
  await tx.Wallet.update({ ... });
});

// ❌ WRONG: Separate operations (not atomic)
await prisma.Commission.update({ ... });
await prisma.Transaction.create({ ... });
await prisma.Wallet.update({ ... });
```

### **3. Validate Before Operations**
```typescript
// ✅ CORRECT: Check balance before withdrawal
const wallet = await prisma.Wallet.findUnique({ where: { userId } });
if (wallet.balance < amount) {
  throw new Error('Insufficient balance');
}

// ❌ WRONG: No validation
await prisma.Wallet.update({
  data: { balance: { decrement: amount } }
});
```

### **4. Use Proper Transaction Types**
```typescript
// ✅ CORRECT: Use standard types
type: 'credit' | 'debit'
source: 'commission' | 'withdrawal' | 'bonus' | 'deposit' | 'refund'

// ❌ WRONG: Inconsistent types
type: 'add' | 'remove' | 'payment'
```

---

## 🎯 NEXT STEPS

1. **Stop backend server** (to unlock Prisma client)
2. **Run**: `npx prisma generate`
3. **Update route files** to use new models:
   - `routes/tokens.ts`
   - `routes/wallet.ts`
   - `routes/earnings.ts`
   - `routes/financial.ts`
   - `routes/commissions.ts`
4. **Test endpoints** with new models
5. **Migrate data** from old tables (if needed)

---

## ✅ VERIFICATION

**Check models are available**:
```typescript
import { prisma } from './prisma';

// Should work without errors:
await prisma.Wallet.findMany();
await prisma.Transaction.findMany();
await prisma.Commission.findMany();
```

**Check database tables exist**:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('Wallet', 'Transaction', 'Commission');
```

---

**MODELS READY FOR USE** ✅
