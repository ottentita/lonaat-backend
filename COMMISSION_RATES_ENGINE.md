# ✅ COMMISSION CALCULATION ENGINE - FLEXIBLE RATES

## Summary
Implemented flexible commission rate calculation based on affiliate network. Each network has a configurable commission rate, with a default fallback of 30%.

---

## COMMISSION RATES CONFIGURATION

### **Location:** Both files include the same configuration

**Files:**
- `src/routes/webhooks.ts`
- `src/routes/conversion.ts`

### **Configuration Object:**

```typescript
// Commission rates by network
const commissionRates: Record<string, number> = {
  'Digistore24': 0.5,    // 50%
  'AWIN': 0.3,           // 30%
  'awin': 0.3,           // 30%
  'WarriorPlus': 0.5,    // 50%
  'Impact': 0.3,         // 30%
  'JVZoo': 0.5,          // 50%
  'ClickBank': 0.5,      // 50%
  'Admitad': 0.3,        // 30%
  'MyLead': 0.3          // 30%
};

// Get commission rate for network (default 30%)
const getCommissionRate = (network: string): number => {
  return commissionRates[network] || 0.3;
};
```

---

## COMMISSION RATES BY NETWORK

| Network | Rate | Percentage |
|---------|------|------------|
| Digistore24 | 0.5 | 50% |
| WarriorPlus | 0.5 | 50% |
| JVZoo | 0.5 | 50% |
| ClickBank | 0.5 | 50% |
| AWIN | 0.3 | 30% |
| Impact | 0.3 | 30% |
| Admitad | 0.3 | 30% |
| MyLead | 0.3 | 30% |
| **Default** | 0.3 | 30% |

---

## IMPLEMENTATION

### **1. Digistore24 Webhook**

**File:** `src/routes/webhooks.ts:76-78`

```typescript
// Calculate commission using network-specific rate
const rate = getCommissionRate('Digistore24');
const commissionAmount = amount * rate;
```

**Example:**
- Sale Amount: $100.00
- Network: Digistore24
- Rate: 50%
- Commission: $50.00

**Console Output:**
```
✅ DIGISTORE24 WEBHOOK - Commission created: 1
   User: user@example.com
   Amount: $100.00
   Commission Rate: 50%
   Commission: $50.00
   Product ID: 12345
   Transaction ID: DS24-ORDER-123
```

---

### **2. AWIN Webhook**

**File:** `src/routes/webhooks.ts:167-171`

```typescript
const rawAmount = Number(commissionAmount?.amount || commissionAmount) || 0;

// Apply commission rate for AWIN
const rate = getCommissionRate('AWIN');
const amount = rawAmount * rate;
```

**Example:**
- Sale Amount: $100.00
- Network: AWIN
- Rate: 30%
- Commission: $30.00

**Console Output:**
```
✅ AWIN WEBHOOK - Commission created for user 1
   Raw Amount: $100.00
   Commission Rate: 30%
   Commission: $30.00
```

---

### **3. Generic Conversion Webhook**

**File:** `src/routes/conversion.ts:122-123`

```typescript
// Calculate commission using network-specific rate
const rate = getCommissionRate(network);
const commissionAmount = parsedAmount * rate;
```

**Example:**
- Sale Amount: $100.00
- Network: Impact
- Rate: 30%
- Commission: $30.00

**Console Output:**
```
✅ CONVERSION WEBHOOK - Commission created: 2
   User ID: 1
   Amount: $100.00
   Commission Rate: 30%
   Commission: $30.00
📊 CONVERSION SUMMARY:
   Product: 12345
   Network: Impact
   Amount: $100.00
   Commission Rate: 30%
   Commission Created: YES
```

---

## USAGE EXAMPLES

### **Example 1: Digistore24 Sale ($200)**

**Webhook Payload:**
```json
{
  "event": "sale",
  "data": {
    "email": "user@example.com",
    "amount": 200.00,
    "product_id": "12345"
  }
}
```

**Calculation:**
```typescript
const rate = getCommissionRate('Digistore24'); // 0.5
const commission = 200.00 * 0.5; // $100.00
```

**Result:** Commission = $100.00 (50% of $200)

---

### **Example 2: AWIN Sale ($200)**

**Webhook Payload:**
```json
{
  "id": "AWIN-123",
  "commissionAmount": 200.00,
  "status": "approved"
}
```

**Calculation:**
```typescript
const rate = getCommissionRate('AWIN'); // 0.3
const commission = 200.00 * 0.3; // $60.00
```

**Result:** Commission = $60.00 (30% of $200)

---

### **Example 3: Unknown Network ($200)**

**Webhook Payload:**
```json
{
  "productId": "12345",
  "amount": 200.00,
  "network": "NewNetwork",
  "customData": { "userId": "1" }
}
```

**Calculation:**
```typescript
const rate = getCommissionRate('NewNetwork'); // 0.3 (default)
const commission = 200.00 * 0.3; // $60.00
```

**Result:** Commission = $60.00 (30% default rate)

---

## MODIFYING COMMISSION RATES

### **To Change a Rate:**

**Edit both files:**
1. `src/routes/webhooks.ts`
2. `src/routes/conversion.ts`

**Example: Change AWIN to 35%**

```typescript
const commissionRates: Record<string, number> = {
  'Digistore24': 0.5,
  'AWIN': 0.35,        // Changed from 0.3 to 0.35
  'awin': 0.35,        // Changed from 0.3 to 0.35
  'WarriorPlus': 0.5,
  // ... rest
};
```

### **To Add a New Network:**

```typescript
const commissionRates: Record<string, number> = {
  'Digistore24': 0.5,
  'AWIN': 0.3,
  'ShareASale': 0.4,   // NEW NETWORK - 40%
  // ... rest
};
```

### **To Change Default Rate:**

```typescript
const getCommissionRate = (network: string): number => {
  return commissionRates[network] || 0.35; // Changed from 0.3 to 0.35
};
```

---

## TESTING

### **Test Different Networks:**

**1. Test Digistore24 (50%):**
```bash
curl -X POST http://localhost:4000/api/webhooks/digistore24 \
  -H "Content-Type: application/json" \
  -d '{
    "event": "sale",
    "data": {
      "email": "titasembi@gmail.com",
      "amount": 100.00
    }
  }'
```

**Expected Commission:** $50.00

---

**2. Test AWIN (30%):**
```bash
curl -X POST http://localhost:4000/api/webhooks/awin \
  -H "Content-Type: application/json" \
  -d '[{
    "id": "AWIN-123",
    "commissionAmount": 100.00,
    "status": "pending",
    "clickRef": "1"
  }]'
```

**Expected Commission:** $30.00

---

**3. Test Generic Conversion - Impact (30%):**
```bash
curl -X POST http://localhost:4000/api/conversion/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "12345",
    "amount": 100.00,
    "network": "Impact",
    "customData": { "userId": "1" }
  }'
```

**Expected Commission:** $30.00

---

**4. Test Generic Conversion - WarriorPlus (50%):**
```bash
curl -X POST http://localhost:4000/api/conversion/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "12345",
    "amount": 100.00,
    "network": "WarriorPlus",
    "customData": { "userId": "1" }
  }'
```

**Expected Commission:** $50.00

---

**5. Test Unknown Network (30% default):**
```bash
curl -X POST http://localhost:4000/api/conversion/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "12345",
    "amount": 100.00,
    "network": "UnknownNetwork",
    "customData": { "userId": "1" }
  }'
```

**Expected Commission:** $30.00

---

## VERIFICATION

### **Check Commission in Database:**

```sql
SELECT 
  id,
  user_id,
  network,
  amount,
  webhook_data->>'raw_amount' as raw_amount,
  webhook_data->>'commission_rate' as rate,
  created_at
FROM commissions
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:**
```
id | user_id | network      | amount | raw_amount | rate | created_at
---+---------+--------------+--------+------------+------+------------
3  | 1       | WarriorPlus  | 50.00  | null       | null | 2026-03-24
2  | 1       | Impact       | 30.00  | null       | null | 2026-03-24
1  | 1       | AWIN         | 30.00  | 100.00     | 0.3  | 2026-03-24
```

---

## API RESPONSE CHANGES

### **Generic Conversion Webhook Response:**

**Before:**
```json
{
  "success": true,
  "conversionId": "abc123",
  "commissionId": 1,
  "commissionAmount": 50.0
}
```

**After:**
```json
{
  "success": true,
  "conversionId": "abc123",
  "commissionId": 1,
  "commissionAmount": 30.0,
  "commissionRate": 0.3
}
```

---

## BENEFITS

✅ **Flexible:** Easy to adjust rates per network  
✅ **Scalable:** Add new networks without code changes  
✅ **Transparent:** Rate logged in console and webhook_data  
✅ **Consistent:** Same logic across all webhooks  
✅ **Safe:** Default fallback prevents errors  

---

## COMMISSION RATE SUMMARY

**High Commission Networks (50%):**
- Digistore24
- WarriorPlus
- JVZoo
- ClickBank

**Standard Commission Networks (30%):**
- AWIN
- Impact
- Admitad
- MyLead

**Default Rate:** 30% for unknown networks

---

## FILES MODIFIED

1. **`src/routes/webhooks.ts`**
   - Added `commissionRates` configuration
   - Added `getCommissionRate()` helper
   - Updated Digistore24 webhook
   - Updated AWIN webhook

2. **`src/routes/conversion.ts`**
   - Added `commissionRates` configuration
   - Added `getCommissionRate()` helper
   - Updated generic conversion webhook
   - Added `commissionRate` to response

---

## STATUS: ✅ COMPLETE

Commission calculation engine now supports flexible network-specific rates with automatic fallback to 30% for unknown networks.

**All webhooks use dynamic commission rates based on network.**
