# 🔴 PRODUCTION READY TEST - COMPLETE VALIDATION

**Date**: March 28, 2026  
**Status**: ⚠️ **TESTING IN PROGRESS**

---

## ✅ STEP 1: CLEAN & REGENERATE (WINDOWS)

```bash
cd c:\Users\lonaat\lonaat-backend-1\backend-node

# Delete Prisma cache (Windows-safe)
rmdir /s /q node_modules\.prisma
rmdir /s /q node_modules\@prisma

# Regenerate Prisma client
npx prisma generate

# Apply DB schema
npx prisma migrate dev

# Restart server
npm run dev
```

**Status**: ✅ Prisma client regenerated

---

## 🔍 STEP 2: VERIFY MODELS IN PRISMA STUDIO

```bash
npx prisma studio
```

**Check these tables exist**:
- [ ] Transaction table ✅
- [ ] Wallet table ✅
- [ ] Commission table ✅

**If Transaction does NOT appear → SYSTEM IS BROKEN**

---

## 🧪 STEP 3: COMPLETE TEST SEQUENCE

### **Test 1: Health Check**
```bash
curl http://localhost:4000/api/health
```

**Expected**:
```json
{
  "status": "healthy"
}
```

---

### **Test 2: Login (Get Token)**
```bash
curl -X POST http://localhost:4000/api/auth/login ^
-H "Content-Type: application/json" ^
-d "{\"email\":\"titasembi@gmail.com\",\"password\":\"Far@el11\"}"
```

**Expected**:
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {...}
}
```

**👉 COPY THE TOKEN**

---

### **Test 3: Deposit 1000**
```bash
curl -X POST http://localhost:4000/api/wallet/deposit ^
-H "Content-Type: application/json" ^
-H "Authorization: Bearer YOUR_TOKEN_HERE" ^
-d "{\"amount\":1000,\"source\":\"test\"}"
```

**Expected**:
```json
{
  "success": true,
  "data": {
    "message": "Deposit successful",
    "transaction": {
      "id": 1,
      "amount": 1000,
      "type": "credit",
      "source": "test"
    }
  }
}
```

**✅ VERIFY**: Transaction record created

---

### **Test 4: Withdraw 200**
```bash
curl -X POST http://localhost:4000/api/wallet/withdraw ^
-H "Content-Type: application/json" ^
-H "Authorization: Bearer YOUR_TOKEN_HERE" ^
-d "{\"amount\":200,\"method\":\"MTN\",\"accountDetails\":{\"phone\":\"237XXXXXXXXX\"}}"
```

**Expected**:
```json
{
  "success": true,
  "data": {
    "message": "Withdrawal request submitted successfully",
    "withdrawal": {
      "id": 2,
      "amount": 200,
      "status": "pending"
    }
  }
}
```

**✅ VERIFY**: Transaction record created

---

### **Test 5: Balance Check (CRITICAL)**
```bash
curl http://localhost:4000/api/wallet/balance ^
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected**:
```json
{
  "success": true,
  "data": {
    "total_earnings": 1000,
    "balance": 800,
    "total_withdrawn": 200,
    "withdrawable_balance": 800
  }
}
```

**✅ MUST BE: 800** (1000 - 200)

---

### **Test 6: Transaction Ledger (MOST IMPORTANT)**
```bash
curl http://localhost:4000/api/wallet/transactions ^
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected**:
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 2,
        "userId": 1,
        "amount": 200,
        "type": "debit",
        "source": "withdrawal",
        "createdAt": "..."
      },
      {
        "id": 1,
        "userId": 1,
        "amount": 1000,
        "type": "credit",
        "source": "test",
        "createdAt": "..."
      }
    ]
  }
}
```

**✅ MUST SHOW**:
- +1000 (credit)
- -200 (debit)

**👉 If this fails → ENTIRE SYSTEM IS INVALID**

---

## 🔥 STEP 4: BREAK TESTS (DO NOT SKIP)

### **Break Test 1: Over-Withdraw**
```bash
curl -X POST http://localhost:4000/api/wallet/withdraw ^
-H "Content-Type: application/json" ^
-H "Authorization: Bearer YOUR_TOKEN_HERE" ^
-d "{\"amount\":10000,\"method\":\"MTN\",\"accountDetails\":{\"phone\":\"237XXXXXXXXX\"}}"
```

**Expected**:
```json
{
  "success": false,
  "error": "Insufficient balance. Available: 800, Required: 10000"
}
```

**✅ MUST FAIL** - Negative balance prevention working

---

### **Break Test 2: Negative Value**
```bash
curl -X POST http://localhost:4000/api/wallet/withdraw ^
-H "Content-Type: application/json" ^
-H "Authorization: Bearer YOUR_TOKEN_HERE" ^
-d "{\"amount\":-500,\"method\":\"MTN\",\"accountDetails\":{\"phone\":\"237XXXXXXXXX\"}}"
```

**Expected**:
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Amount must be between 10 and 10,000"
    }
  ]
}
```

**✅ MUST FAIL** - Amount validation working

---

### **Break Test 3: Double Request (Spam Click)**
```bash
# First request
curl -X POST http://localhost:4000/api/wallet/withdraw ^
-H "Content-Type: application/json" ^
-H "Authorization: Bearer YOUR_TOKEN_HERE" ^
-d "{\"amount\":100,\"method\":\"MTN\",\"accountDetails\":{\"phone\":\"237XXXXXXXXX\"},\"idempotencyKey\":\"test-key-123\"}"

# Second request (SAME KEY)
curl -X POST http://localhost:4000/api/wallet/withdraw ^
-H "Content-Type: application/json" ^
-H "Authorization: Bearer YOUR_TOKEN_HERE" ^
-d "{\"amount\":100,\"method\":\"MTN\",\"accountDetails\":{\"phone\":\"237XXXXXXXXX\"},\"idempotencyKey\":\"test-key-123\"}"
```

**Expected (First)**:
```json
{
  "success": true,
  "data": {
    "message": "Withdrawal request submitted successfully"
  }
}
```

**Expected (Second)**:
```json
{
  "success": true,
  "data": {
    "message": "Withdrawal already processed",
    "withdrawal": {
      "status": "already_processed"
    }
  }
}
```

**✅ MUST NOT DUPLICATE** - Idempotency working

---

## 🧠 WHAT YOU ARE VERIFYING

**Not just "API works"**

You are verifying:
- ✅ Atomic transactions
- ✅ Ledger integrity
- ✅ No race conditions
- ✅ No balance corruption
- ✅ No double-spend vulnerability

---

## 🚨 RED FLAGS (STOP IF YOU SEE ANY)

- ❌ Balance ≠ sum of transactions
- ❌ Missing transaction record
- ❌ Duplicate withdrawals
- ❌ 500 error anywhere
- ❌ "undefined model" anywhere

**👉 If ANY appears → SYSTEM IS NOT PRODUCTION READY**

---

## ✅ FINAL VALIDATION CHECKLIST

**Before declaring PRODUCTION READY, verify ALL**:

- [ ] Prisma client regenerated successfully
- [ ] Transaction, Wallet, Commission visible in Prisma Studio
- [ ] Health endpoint returns healthy
- [ ] Login returns valid token
- [ ] Deposit creates Transaction record
- [ ] Withdraw creates Transaction record
- [ ] Balance = 800 (1000 - 200)
- [ ] Transaction ledger shows +1000, -200
- [ ] Ledger sum matches balance exactly
- [ ] Over-withdraw blocked (insufficient balance)
- [ ] Negative amount blocked (validation)
- [ ] Duplicate request prevented (idempotency)
- [ ] No 500 errors anywhere
- [ ] No "undefined model" errors
- [ ] All endpoints return proper JSON

---

## 🟢 PASS CONDITION

**You can ONLY say "PRODUCTION READY" IF**:

- ✅ Prisma regenerated
- ✅ Models visible in Prisma Studio
- ✅ Ledger matches balance
- ✅ All validations block invalid actions
- ✅ No crashes
- ✅ No inconsistencies

---

## 📊 DATABASE VERIFICATION

After all tests, check database directly:

```sql
-- Check Transaction table
SELECT * FROM "Transaction" ORDER BY "createdAt" DESC;

-- Expected:
| id | userId | amount | type   | source     | createdAt |
|----|--------|--------|--------|------------|-----------|
| 3  | 1      | 100    | debit  | withdrawal | ...       |
| 2  | 1      | 200    | debit  | withdrawal | ...       |
| 1  | 1      | 1000   | credit | test       | ...       |

-- Check Wallet table
SELECT * FROM "Wallet" WHERE "userId" = 1;

-- Expected:
| id | userId | balance | createdAt |
|----|--------|---------|-----------|
| 1  | 1      | 700     | ...       |

-- Verify balance calculation
SELECT 
  SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as credits,
  SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as debits,
  SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) as balance
FROM "Transaction"
WHERE "userId" = 1;

-- Expected:
| credits | debits | balance |
|---------|--------|---------|
| 1000    | 300    | 700     |
```

---

**NEXT**: Run all tests above and report results ⬆️
