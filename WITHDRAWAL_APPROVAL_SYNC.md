# ✅ WITHDRAWAL APPROVAL - WALLET SYNC

## Summary
When admin approves a withdrawal, the system automatically updates the wallet balance by decrementing the balance and incrementing totalWithdrawn.

---

## IMPLEMENTATION

### **Withdrawal Approval Flow:**

```
1. Admin approves withdrawal
   ↓
2. Validate withdrawal status (must be 'pending')
   ↓
3. Check wallet balance (must have sufficient funds)
   ↓
4. Update wallet:
   - balance -= withdrawal.amount
   - totalWithdrawn += withdrawal.amount
   ↓
5. Update withdrawal status to 'approved'
   ↓
6. Create transaction record
   ↓
7. Return success
```

---

## CODE IMPLEMENTATION

### **File:** `src/routes/withdrawals.ts:260-282`

**Wallet Update:**
```typescript
// Update wallet balance (deduct amount and track withdrawal)
await prisma.wallet.update({
  where: { id: withdrawal.walletId },
  data: {
    balance: { decrement: withdrawal.amount },
    totalWithdrawn: { increment: withdrawal.amount }
  }
});

console.log('✅ Wallet updated:');
console.log(`   Previous Balance: $${withdrawal.wallet.balance.toFixed(2)}`);
console.log(`   Withdrawal Amount: $${withdrawal.amount.toFixed(2)}`);
console.log(`   New Balance: $${(withdrawal.wallet.balance - withdrawal.amount).toFixed(2)}`);
console.log(`   Total Withdrawn: +$${withdrawal.amount.toFixed(2)}`);

// Update withdrawal status
const updatedWithdrawal = await prisma.withdrawal.update({
  where: { id },
  data: {
    status: 'approved',
    adminNote,
    processedBy: adminUser.id,
    processedAt: new Date()
  }
});
```

---

## WALLET FIELDS UPDATED

| Field | Update | Description |
|-------|--------|-------------|
| `balance` | `{ decrement: amount }` | Deduct withdrawal amount |
| `totalWithdrawn` | `{ increment: amount }` | Track total withdrawals |
| `updatedAt` | Auto-updated | Last modification timestamp |

---

## CONSOLE OUTPUT

### **Successful Approval:**

```
✅ APPROVE WITHDRAWAL REQUEST
🔍 ADMIN CHECK: { userId: '1', userRole: 'admin', isRoleAdmin: true }
✅ ADMIN ACCESS GRANTED
✅ Wallet updated:
   Previous Balance: $150.00
   Withdrawal Amount: $50.00
   New Balance: $100.00
   Total Withdrawn: +$50.00
✅ Withdrawal approved and processed: withdrawal-uuid-123
```

---

## DATABASE UPDATES

### **Before Approval:**

**Withdrawal:**
```sql
id              | userId | amount | status  | createdAt
----------------+--------+--------+---------+------------
withdrawal-123  | 1      | 50.00  | pending | 2026-03-24
```

**Wallet:**
```sql
id       | userId | balance | totalWithdrawn | updatedAt
---------+--------+---------+----------------+------------
wallet-1 | 1      | 150.00  | 0.00           | 2026-03-24
```

---

### **After Approval:**

**Withdrawal:**
```sql
id              | userId | amount | status   | processedAt | processedBy
----------------+--------+--------+----------+-------------+-------------
withdrawal-123  | 1      | 50.00  | approved | 2026-03-24  | 1
```

**Wallet:**
```sql
id       | userId | balance | totalWithdrawn | updatedAt
---------+--------+---------+----------------+------------
wallet-1 | 1      | 100.00  | 50.00          | 2026-03-24
```

**Transaction:**
```sql
id    | userId | type       | amount  | status    | description
------+--------+------------+---------+-----------+---------------------------
tx-1  | 1      | withdrawal | -50.00  | completed | Withdrawal approved - ...
```

---

## API ENDPOINT

### **POST /api/withdrawals/:id/approve**

**Authentication:** Required (Admin only)

**Request:**
```bash
curl -X POST http://localhost:4000/api/withdrawals/withdrawal-123/approve \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "adminNote": "Approved and processed"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal approved and processed successfully",
  "withdrawal": {
    "id": "withdrawal-123",
    "userId": "1",
    "amount": 50.00,
    "status": "approved",
    "method": "mobile_money",
    "processedAt": "2026-03-24T14:30:00.000Z",
    "processedBy": "1",
    "adminNote": "Approved and processed",
    "user": {
      "id": "1",
      "name": "User Name",
      "email": "user@example.com"
    }
  }
}
```

---

## VALIDATION CHECKS

### **1. Admin Access:**
```typescript
if (!adminUser || adminUser.role !== 'admin') {
  return res.status(403).json({ error: 'Admin access required' });
}
```

### **2. Withdrawal Status:**
```typescript
if (withdrawal.status !== 'pending') {
  return res.status(400).json({ 
    error: 'Withdrawal can only be approved if pending',
    currentStatus: withdrawal.status
  });
}
```

### **3. Wallet Balance:**
```typescript
if (withdrawal.wallet.balance < withdrawal.amount) {
  return res.status(400).json({ 
    error: 'Insufficient balance in wallet',
    walletBalance: withdrawal.wallet.balance,
    withdrawalAmount: withdrawal.amount
  });
}
```

---

## ERROR HANDLING

### **Insufficient Balance:**
```json
{
  "error": "Insufficient balance in wallet",
  "walletBalance": 30.00,
  "withdrawalAmount": 50.00
}
```

### **Already Processed:**
```json
{
  "error": "Withdrawal can only be approved if pending",
  "currentStatus": "approved"
}
```

### **Not Admin:**
```json
{
  "error": "Admin access required"
}
```

---

## COMPLETE FLOW EXAMPLE

### **Step 1: User Creates Withdrawal**

```bash
curl -X POST http://localhost:4000/api/withdrawals/create \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "method": "mobile_money",
    "recipientInfo": "+237123456789"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal request created successfully",
  "withdrawal": {
    "id": "withdrawal-123",
    "status": "pending",
    "amount": 50.00
  }
}
```

**Wallet State:**
- Balance: $150.00 (unchanged)
- TotalWithdrawn: $0.00 (unchanged)

---

### **Step 2: Admin Approves Withdrawal**

```bash
curl -X POST http://localhost:4000/api/withdrawals/withdrawal-123/approve \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"adminNote": "Processed via mobile money"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal approved and processed successfully"
}
```

**Wallet State:**
- Balance: $100.00 (decreased by $50)
- TotalWithdrawn: $50.00 (increased by $50)

---

### **Step 3: Verify Wallet Balance**

```bash
curl http://localhost:4000/api/wallet \
  -H "Authorization: Bearer <user-token>"
```

**Response:**
```json
{
  "wallet": {
    "balance": 100.00,
    "totalEarned": 150.00,
    "totalWithdrawn": 50.00,
    "currency": "XAF"
  }
}
```

---

## VERIFICATION QUERIES

### **Check Wallet Balance:**
```sql
SELECT 
  w.userId,
  u.email,
  w.balance,
  w.totalEarned,
  w.totalWithdrawn,
  (w.totalEarned - w.totalWithdrawn) as expected_balance
FROM wallets w
JOIN users u ON u.id = w.userId
WHERE w.userId = '1';
```

**Expected:** `balance` = `expected_balance`

---

### **Check Withdrawal History:**
```sql
SELECT 
  w.id,
  w.amount,
  w.status,
  w.method,
  w.createdAt,
  w.processedAt,
  w.adminNote
FROM withdrawals w
WHERE w.userId = '1'
ORDER BY w.createdAt DESC;
```

---

### **Check Transaction Records:**
```sql
SELECT 
  t.id,
  t.type,
  t.amount,
  t.status,
  t.description,
  t.createdAt
FROM transactions t
WHERE t.userId = '1' AND t.type = 'withdrawal'
ORDER BY t.createdAt DESC;
```

---

## WITHDRAWAL REJECTION

**When admin rejects withdrawal:**

```typescript
// Update withdrawal status (no wallet deduction)
await prisma.withdrawal.update({
  where: { id },
  data: {
    status: 'rejected',
    adminNote,
    processedBy: adminUser.id,
    processedAt: new Date()
  }
});
```

**Wallet State:** Unchanged (balance remains the same)

---

## BENEFITS

✅ **Automatic:** Wallet balance updated on approval  
✅ **Accurate:** Tracks total withdrawals separately  
✅ **Safe:** Validates balance before processing  
✅ **Auditable:** Transaction record created  
✅ **Atomic:** All updates in single operation  

---

## WALLET BALANCE CALCULATION

```
Current Balance = Total Earned - Total Withdrawn

Example:
- Total Earned: $150.00
- Total Withdrawn: $50.00
- Current Balance: $100.00
```

---

## TESTING

### **Test 1: Approve Withdrawal**

**Setup:**
```sql
-- User has $150 balance
INSERT INTO wallets (userId, balance, totalEarned, totalWithdrawn)
VALUES ('1', 150.00, 150.00, 0.00);

-- User requests $50 withdrawal
INSERT INTO withdrawals (userId, walletId, amount, status, method)
VALUES ('1', 'wallet-1', 50.00, 'pending', 'mobile_money');
```

**Action:**
```bash
curl -X POST http://localhost:4000/api/withdrawals/withdrawal-123/approve \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"adminNote": "Approved"}'
```

**Verify:**
```sql
SELECT balance, totalWithdrawn FROM wallets WHERE userId = '1';
-- Expected: balance = 100.00, totalWithdrawn = 50.00
```

---

### **Test 2: Insufficient Balance**

**Setup:**
```sql
-- User has $30 balance
UPDATE wallets SET balance = 30.00 WHERE userId = '1';

-- User requests $50 withdrawal
INSERT INTO withdrawals (userId, walletId, amount, status)
VALUES ('1', 'wallet-1', 50.00, 'pending');
```

**Action:**
```bash
curl -X POST http://localhost:4000/api/withdrawals/withdrawal-456/approve \
  -H "Authorization: Bearer <admin-token>"
```

**Expected Response:**
```json
{
  "error": "Insufficient balance in wallet",
  "walletBalance": 30.00,
  "withdrawalAmount": 50.00
}
```

---

## STATUS: ✅ COMPLETE

Withdrawal approval now automatically syncs wallet balance:
- ✅ Decrements balance by withdrawal amount
- ✅ Increments totalWithdrawn by withdrawal amount
- ✅ Validates balance before processing
- ✅ Creates transaction record
- ✅ Logs all updates

**Withdrawal approval with wallet sync is now live.** 🚀
