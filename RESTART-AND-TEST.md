# 🔴 MANDATORY FIX - RESTART AND TEST

**Status**: ⚠️ **ACTION REQUIRED**

---

## 📋 STEP 1: STOP SERVER & CLEAN

```bash
# 1. Stop server (Ctrl+C in terminal)

# 2. Clean Prisma build artifacts
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma

# 3. Regenerate Prisma client
npx prisma generate

# 4. (Optional) Run migration
npx prisma migrate dev

# 5. Restart server
npm run dev
```

---

## 🔍 STEP 2: VERIFY HEALTH

```bash
# Check server is running
curl http://localhost:4000/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "..."
}
```

---

## 🧪 STEP 3: FINANCIAL INTEGRITY TESTS

### **Test 1: Deposit**
```bash
POST http://localhost:4000/api/wallet/deposit
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "amount": 1000,
  "source": "test"
}

# Expected:
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

### **Test 2: Withdraw**
```bash
POST http://localhost:4000/api/wallet/withdraw
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "amount": 200,
  "method": "MTN",
  "accountDetails": {
    "phone": "237XXXXXXXXX"
  }
}

# Expected:
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

### **Test 3: Check Balance**
```bash
GET http://localhost:4000/api/wallet/balance
Authorization: Bearer <your-token>

# Expected:
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

### **Test 4: Check Transactions**
```bash
GET http://localhost:4000/api/wallet/transactions
Authorization: Bearer <your-token>

# Expected:
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 2,
        "amount": 200,
        "type": "debit",
        "source": "withdrawal"
      },
      {
        "id": 1,
        "amount": 1000,
        "type": "credit",
        "source": "test"
      }
    ]
  }
}
```

---

## 🔴 STEP 4: BREAK ATTEMPTS (MUST FAIL)

### **Test 5: Negative Withdrawal (MUST FAIL)**
```bash
POST http://localhost:4000/api/wallet/withdraw
{
  "amount": 10000,
  "method": "MTN",
  "accountDetails": {...}
}

# Expected:
{
  "success": false,
  "error": "Insufficient balance. Available: 800, Required: 10000"
}
```

### **Test 6: Double Request (MUST NOT DUPLICATE)**
```bash
# Send same request twice with idempotency key
POST http://localhost:4000/api/wallet/withdraw
{
  "amount": 100,
  "method": "MTN",
  "accountDetails": {...},
  "idempotencyKey": "test-key-123"
}

# First request: SUCCESS
# Second request (same key): 
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

### **Test 7: Invalid Amount (MUST FAIL)**
```bash
POST http://localhost:4000/api/wallet/withdraw
{
  "amount": -500,
  "method": "MTN",
  "accountDetails": {...}
}

# Expected:
{
  "success": false,
  "errors": [
    {
      "msg": "Amount must be between 10 and 10,000"
    }
  ]
}
```

---

## ✅ FINAL VALIDATION CHECKLIST

**Before declaring system ready, verify ALL**:

- [ ] Prisma client regenerated successfully
- [ ] No "undefined model" errors in console
- [ ] All endpoints return 200/401 (NOT 500)
- [ ] Health endpoint returns healthy
- [ ] Deposit creates Transaction record
- [ ] Withdraw creates Transaction record
- [ ] Balance = sum of all transactions
- [ ] Negative withdrawal blocked
- [ ] Duplicate requests prevented (idempotency)
- [ ] Invalid amounts rejected
- [ ] No raw SQL in any route
- [ ] No legacy transaction fields
- [ ] Commission approval creates Transaction
- [ ] Token purchase creates Transaction
- [ ] All model names correct (Transaction, Wallet, commissions)

---

## 🎯 SUCCESS CRITERIA

**If ALL tests pass**:
```
✅ Audit trail working
✅ No balance corruption possible
✅ No double spend possible
✅ Deterministic system
✅ Production-grade financial logic
```

**If ANY test fails**:
```
❌ System NOT ready for production
❌ Fix required before deployment
```

---

## 📊 EXPECTED RESULTS

After running all tests:

**Database should contain**:
```sql
SELECT * FROM "Transaction" ORDER BY "createdAt" DESC;

-- Expected:
| id | userId | amount | type   | source     |
|----|--------|--------|--------|------------|
| 2  | 1      | 200    | debit  | withdrawal |
| 1  | 1      | 1000   | credit | test       |
```

**Wallet balance should match**:
```sql
SELECT * FROM "Wallet" WHERE "userId" = 1;

-- Expected:
| id | userId | balance | createdAt |
|----|--------|---------|-----------|
| 1  | 1      | 800     | ...       |
```

**Balance verification**:
```
Credits: 1000
Debits: 200
Balance: 800 ✅
```

---

## 🚨 TROUBLESHOOTING

### **Error: "Property 'Transaction' does not exist"**
```bash
# Fix:
rm -rf node_modules/.prisma
npx prisma generate
# Restart server
```

### **Error: 500 on /api/wallet**
```bash
# Check:
1. Prisma client regenerated?
2. Server restarted?
3. Database tables exist?
```

### **Error: Balance doesn't match**
```bash
# Debug:
GET /api/wallet/transactions
# Manually sum credits - debits
# Should equal balance
```

---

**NEXT STEP**: Stop server, run commands above, then execute tests ⬆️
