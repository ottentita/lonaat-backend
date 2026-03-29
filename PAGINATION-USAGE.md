# 🔄 ADMITAD PAGINATION USAGE GUIDE

## 📋 OVERVIEW

The Admitad importer now supports **pagination/rotation** to import different product batches on each run. This prevents importing the same 200 products every time.

---

## 🎯 HOW IT WORKS

### **Environment Variable**: `ADMITAD_IMPORT_OFFSET`

- **Default**: `0` (start from beginning)
- **Purpose**: Skip the first N products before collecting
- **Max Products**: Always imports 200 products after skipping offset

### **Example**:

```bash
# First import: Products 0-199
ADMITAD_IMPORT_OFFSET=0

# Second import: Products 200-399
ADMITAD_IMPORT_OFFSET=200

# Third import: Products 400-599
ADMITAD_IMPORT_OFFSET=400

# Fourth import: Products 600-799
ADMITAD_IMPORT_OFFSET=600
```

---

## 🚀 USAGE

### **Method 1: Set in `.env` file**

```bash
# .env
ADMITAD_IMPORT_OFFSET=200
```

Then restart server and trigger import:
```bash
npm run dev
```

### **Method 2: Set via command line (temporary)**

**Windows PowerShell**:
```powershell
$env:ADMITAD_IMPORT_OFFSET=200
npm run dev
```

**Linux/Mac**:
```bash
ADMITAD_IMPORT_OFFSET=200 npm run dev
```

### **Method 3: Programmatic rotation**

Create a rotation script:

```javascript
// rotate-import.js
const axios = require('axios');

async function rotateImport() {
  const offsets = [0, 200, 400, 600, 800];
  
  for (const offset of offsets) {
    console.log(`\n🔄 Importing batch with offset ${offset}...`);
    
    // Set environment variable
    process.env.ADMITAD_IMPORT_OFFSET = offset.toString();
    
    // Trigger import via API
    const response = await axios.post(
      'http://localhost:4000/api/admin/import-products',
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    console.log(`✅ Imported ${response.data.imported} products`);
    
    // Wait 5 seconds between batches
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

rotateImport();
```

---

## 📊 CONSOLE OUTPUT

When offset is set, you'll see:

```
📡 Fetching Admitad XML feed (streaming mode)...
⚠️ LIMIT: Maximum 200 products per import
🔄 PAGINATION: Skipping first 200 products
🌐 Feed URL: https://export.admitad.com/...
✅ Feed stream started, parsing XML...
📦 Progress: 50/200 products (250 total processed)
📦 Progress: 100/200 products (300 total processed)
📦 Progress: 150/200 products (350 total processed)
⛔ LIMIT REACHED — aborting stream...
✅ Stream aborted successfully
✅ Saved 200 new products (duplicates skipped)
```

**Note**: "total processed" = skipped + collected

---

## 🔧 AUTOMATED ROTATION STRATEGY

### **Option 1: Cron Job with Rotating Offset**

```javascript
// In your cron job
let currentOffset = 0;
const MAX_OFFSET = 2000; // Stop after 2000 products
const BATCH_SIZE = 200;

cron.schedule('0 */6 * * *', async () => {
  console.log(`🔄 Running import with offset ${currentOffset}`);
  
  process.env.ADMITAD_IMPORT_OFFSET = currentOffset.toString();
  await importAllProducts();
  
  // Increment offset for next run
  currentOffset += BATCH_SIZE;
  
  // Reset to 0 after reaching max
  if (currentOffset >= MAX_OFFSET) {
    currentOffset = 0;
    console.log('🔄 Offset reset to 0 - starting new rotation cycle');
  }
});
```

### **Option 2: Database-Tracked Offset**

```sql
CREATE TABLE import_state (
  id SERIAL PRIMARY KEY,
  current_offset INT DEFAULT 0,
  last_import_at TIMESTAMP,
  total_imported INT DEFAULT 0
);
```

```javascript
async function importWithTracking() {
  // Get current offset from database
  const state = await prisma.import_state.findFirst();
  const offset = state?.current_offset || 0;
  
  // Set offset and import
  process.env.ADMITAD_IMPORT_OFFSET = offset.toString();
  const imported = await importAllProducts();
  
  // Update state
  await prisma.import_state.update({
    where: { id: state.id },
    data: {
      current_offset: offset + 200,
      last_import_at: new Date(),
      total_imported: { increment: imported }
    }
  });
}
```

---

## ⚠️ IMPORTANT NOTES

1. **Duplicate Prevention**: 
   - Products with same `externalId` are skipped automatically
   - Safe to re-import same offset multiple times

2. **Performance**:
   - Each import takes 2-5 seconds (with AbortController)
   - Can safely run multiple batches in sequence

3. **Feed Size**:
   - Admitad feeds can have 10,000+ products
   - Plan rotation strategy based on feed size

4. **Offset Validation**:
   - No maximum offset enforced
   - If offset > total products, import returns 0 products

---

## 🧪 TESTING

### Test different offsets:

```bash
# Test offset 0
ADMITAD_IMPORT_OFFSET=0 node -e "require('./src/services/admitadImporter').fetchAdmitadFeed().then(p => console.log('Products:', p.length))"

# Test offset 200
ADMITAD_IMPORT_OFFSET=200 node -e "require('./src/services/admitadImporter').fetchAdmitadFeed().then(p => console.log('Products:', p.length))"
```

### Verify no duplicates:

```sql
SELECT external_id, COUNT(*) 
FROM products 
WHERE external_id IS NOT NULL 
GROUP BY external_id 
HAVING COUNT(*) > 1;
```

Should return 0 rows.

---

## 📈 RECOMMENDED ROTATION SCHEDULE

| Time | Offset | Products |
|------|--------|----------|
| 00:00 | 0 | 0-199 |
| 06:00 | 200 | 200-399 |
| 12:00 | 400 | 400-599 |
| 18:00 | 600 | 600-799 |

After 4 cycles (24 hours), you'll have 800 unique products.

---

## ✅ SUMMARY

- ✅ Pagination implemented via `ADMITAD_IMPORT_OFFSET`
- ✅ Skips first N products before collecting
- ✅ Always imports 200 products per run
- ✅ Duplicate prevention via `externalId` unique constraint
- ✅ Fast imports (2-5 seconds with AbortController)
- ✅ Safe for automated rotation strategies

