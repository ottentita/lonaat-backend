# ✅ WEBHOOK COMMISSION CREATION - IMPLEMENTATION COMPLETE

## Summary
Both Digistore24 and generic conversion webhooks now automatically create commission records for users when conversions are received.

---

## 1. DIGISTORE24 WEBHOOK ✅

### **File:** `src/routes/webhooks.ts`
### **Route:** `POST /api/webhooks/digistore24`

### **Implementation:**

```typescript
router.post('/digistore24', async (req, res) => {
  const { event, data } = req.body;
  
  // Extract user email from webhook data
  const email = data.email || data.buyer_email || data.customer_email;
  const amount = parseFloat(data.amount || data.commission || 0);
  const productId = data.product_id;
  const transactionId = data.order_id || data.transaction_id;
  
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  if (!user) {
    return res.json({ status: 'ok', message: 'User not found' });
  }
  
  // Create commission (50% commission rate)
  const commissionAmount = amount * 0.5;
  
  const commission = await prisma.commissions.create({
    data: {
      user_id: user.id,
      network: 'Digistore24',
      product_id: productId ? parseInt(productId) : null,
      amount: commissionAmount,
      status: 'pending',
      external_ref: transactionId,
      webhook_data: JSON.stringify(req.body)
    }
  });
  
  res.json({ 
    status: 'ok',
    commission_id: commission.id,
    commission_amount: commissionAmount
  });
});
```

### **How It Works:**

1. **Receives webhook** from Digistore24 with sale data
2. **Extracts email** from webhook payload (tries multiple field names)
3. **Finds user** in database by email
4. **Calculates commission** at 50% of sale amount
5. **Creates commission record** in `commissions` table
6. **Returns success** with commission ID and amount

### **Required Webhook Data:**

```json
{
  "event": "sale",
  "data": {
    "email": "user@example.com",           // REQUIRED - User email
    "amount": 100.00,                       // REQUIRED - Sale amount
    "product_id": "12345",                  // Optional - Product ID
    "order_id": "DS24-ORDER-123",           // Optional - Transaction ID
    "commission": 50.00                     // Optional - Can use instead of amount
  }
}
```

### **Expected Console Output:**

```
💰 DIGISTORE24 WEBHOOK - Received: { event: 'sale', data: {...} }
✅ DIGISTORE24 WEBHOOK - Validation passed
✅ DIGISTORE24 WEBHOOK - User found: 1 user@example.com
✅ DIGISTORE24 WEBHOOK - Commission created: 42
   User: user@example.com
   Amount: $100.00
   Commission (50%): $50.00
   Product ID: 12345
   Transaction ID: DS24-ORDER-123
```

### **Database Record Created:**

```sql
INSERT INTO commissions (
  user_id,
  network,
  product_id,
  amount,
  status,
  external_ref,
  webhook_data,
  created_at
) VALUES (
  1,
  'Digistore24',
  12345,
  50.00,
  'pending',
  'DS24-ORDER-123',
  '{"event":"sale","data":{...}}',
  NOW()
);
```

---

## 2. GENERIC CONVERSION WEBHOOK ✅

### **File:** `src/routes/conversion.ts`
### **Route:** `POST /api/conversion/webhook`

### **Implementation:**

```typescript
router.post('/webhook', async (req, res) => {
  const { productId, amount, network, orderId, customData } = req.body;
  
  // Create conversion record
  const conversion = await prisma.productConversion.create({
    data: {
      productId: productIdStr,
      amount: parsedAmount,
      network: network
    }
  });
  
  // Extract user from customData or orderId
  let userId: number | null = null;
  
  if (customData && customData.userId) {
    userId = parseInt(customData.userId);
  } else if (orderId) {
    // Try to extract user ID from order ID format (e.g., "user123-order456")
    const match = orderId.match(/user(\d+)/i);
    if (match) {
      userId = parseInt(match[1]);
    }
  }
  
  // Create commission if user ID found
  let commission = null;
  if (userId) {
    const commissionAmount = parsedAmount * 0.5; // 50% commission rate
    
    commission = await prisma.commissions.create({
      data: {
        user_id: userId,
        network: network,
        product_id: parseInt(productIdStr),
        amount: commissionAmount,
        status: 'pending',
        external_ref: orderId || conversion.id,
        webhook_data: JSON.stringify(req.body)
      }
    });
  }
  
  res.json({
    success: true,
    conversionId: conversion.id,
    commissionId: commission?.id || null,
    commissionAmount: commission ? parsedAmount * 0.5 : null
  });
});
```

### **How It Works:**

1. **Receives webhook** with conversion data
2. **Creates conversion record** in `product_conversions` table
3. **Extracts user ID** from `customData.userId` or `orderId` pattern
4. **Calculates commission** at 50% of conversion amount
5. **Creates commission record** if user ID found
6. **Returns success** with both conversion and commission IDs

### **Required Webhook Data:**

**Option 1: Using customData**
```json
{
  "productId": "12345",
  "amount": 100.00,
  "network": "AWIN",
  "orderId": "ORDER-123",
  "customData": {
    "userId": "1"                           // REQUIRED for commission
  }
}
```

**Option 2: Using orderId pattern**
```json
{
  "productId": "12345",
  "amount": 100.00,
  "network": "Impact",
  "orderId": "user1-order456"               // userId extracted from pattern
}
```

### **Expected Console Output:**

```
💰 CONVERSION WEBHOOK - Request received
📦 Request body: {...}
✅ CONVERSION WEBHOOK - Validation passed
💰 CONVERSION WEBHOOK - Creating conversion record...
✅ CONVERSION WEBHOOK - Conversion created successfully
   Conversion ID: abc123
   Created At: 2026-03-24T14:30:00.000Z
✅ CONVERSION WEBHOOK - User ID from customData: 1
✅ CONVERSION WEBHOOK - Commission created: 43
   User ID: 1
   Amount: $100.00
   Commission (50%): $50.00
📊 CONVERSION SUMMARY:
   Product: 12345
   Network: AWIN
   Amount: $100.00
   Commission Rate: 50%
   Commission Created: YES
```

### **Database Records Created:**

**1. Conversion:**
```sql
INSERT INTO product_conversions (
  id,
  productId,
  amount,
  network,
  createdAt
) VALUES (
  'abc123',
  '12345',
  100.00,
  'AWIN',
  NOW()
);
```

**2. Commission:**
```sql
INSERT INTO commissions (
  user_id,
  network,
  product_id,
  amount,
  status,
  external_ref,
  webhook_data,
  created_at
) VALUES (
  1,
  'AWIN',
  12345,
  50.00,
  'pending',
  'ORDER-123',
  '{"productId":"12345","amount":100,...}',
  NOW()
);
```

---

## COMMISSION RATE

**Both webhooks use:** 50% commission rate

**Calculation:**
```typescript
const commissionAmount = saleAmount * 0.5;
```

**Example:**
- Sale Amount: $100.00
- Commission (50%): $50.00

---

## COMMISSION STATUS

**All commissions created with status:** `"pending"`

**Status Flow:**
1. `pending` - Commission created, awaiting approval
2. `approved` - Admin approved commission
3. `paid` - Commission paid to user

---

## TESTING

### **Test Digistore24 Webhook:**

```bash
curl -X POST http://localhost:4000/api/webhooks/digistore24 \
  -H "Content-Type: application/json" \
  -d '{
    "event": "sale",
    "data": {
      "email": "titasembi@gmail.com",
      "amount": 100.00,
      "product_id": "12345",
      "order_id": "TEST-ORDER-001"
    }
  }'
```

**Expected Response:**
```json
{
  "status": "ok",
  "commission_id": 1,
  "commission_amount": 50
}
```

### **Test Generic Conversion Webhook:**

```bash
curl -X POST http://localhost:4000/api/conversion/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "12345",
    "amount": 100.00,
    "network": "AWIN",
    "orderId": "TEST-ORDER-002",
    "customData": {
      "userId": "1"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "conversionId": "abc123",
  "commissionId": 2,
  "commissionAmount": 50,
  "message": "Conversion tracked successfully",
  "data": {
    "productId": "12345",
    "amount": 100,
    "network": "AWIN",
    "conversionId": "abc123",
    "createdAt": "2026-03-24T14:30:00.000Z"
  }
}
```

---

## VERIFICATION

### **Check Commission Created:**

```sql
SELECT 
  id,
  user_id,
  network,
  product_id,
  amount,
  status,
  external_ref,
  created_at
FROM commissions
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:**
```
id | user_id | network      | product_id | amount | status  | external_ref    | created_at
---+---------+--------------+------------+--------+---------+-----------------+------------
2  | 1       | AWIN         | 12345      | 50.00  | pending | TEST-ORDER-002  | 2026-03-24
1  | 1       | Digistore24  | 12345      | 50.00  | pending | TEST-ORDER-001  | 2026-03-24
```

### **Check User Earnings:**

```bash
curl http://localhost:4000/api/analytics/earnings \
  -H "Authorization: Bearer <token>"
```

**Expected Response:**
```json
{
  "totalEarnings": 100.00,
  "totalClicks": 5,
  "conversionRate": 40,
  "activeProducts": 0,
  "activity": []
}
```

---

## SUCCESS CRITERIA ✅

- ✅ **Every Digistore24 sale → creates commission**
- ✅ **Every conversion with userId → creates commission**
- ✅ **Earnings become non-zero**
- ✅ **Commissions visible in `/api/earnings`**
- ✅ **Analytics dashboard shows real earnings**

---

## EDGE CASES HANDLED

### **Digistore24 Webhook:**
- ✅ Missing email → Returns success but no commission created
- ✅ User not found → Returns success but no commission created
- ✅ Multiple email field names → Tries `email`, `buyer_email`, `customer_email`
- ✅ Missing amount → Uses `commission` field as fallback

### **Generic Conversion Webhook:**
- ✅ Missing userId → Conversion created but no commission
- ✅ userId in customData → Commission created
- ✅ userId in orderId pattern → Commission extracted and created
- ✅ Invalid userId → No commission created, logs warning

---

## NEXT STEPS

1. **Test webhooks** with real network integrations
2. **Monitor commission creation** in production
3. **Implement commission approval** workflow
4. **Sync commissions to wallet balance**
5. **Add withdrawal processing** for paid commissions

---

## FILES MODIFIED

1. **`src/routes/webhooks.ts`** - Digistore24 webhook commission creation
2. **`src/routes/conversion.ts`** - Generic conversion webhook commission creation

---

**STATUS: ✅ COMPLETE**

Both webhooks now automatically create commissions. Users will see earnings in their dashboard as soon as conversions are received.
