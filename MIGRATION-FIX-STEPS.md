# 🔧 DATABASE MIGRATION FIX - STEP BY STEP

**Issue**: Duplicate `reference` values in `product_conversions` table blocking unique constraint

---

## 📋 STEP-BY-STEP EXECUTION

### **STEP 1: Clean Duplicate Data**

**Connect to your database** and run:

```sql
-- Find duplicates
SELECT reference, COUNT(*) as duplicate_count
FROM product_conversions
GROUP BY reference
HAVING COUNT(*) > 1;

-- Delete duplicates (keep MIN id only)
DELETE FROM product_conversions
WHERE id NOT IN (
  SELECT MIN(id)
  FROM product_conversions
  GROUP BY reference
);

-- Verify cleanup
SELECT reference, COUNT(*) as count
FROM product_conversions
GROUP BY reference
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

**How to run**:
```bash
# Option 1: Using psql
psql -U postgres -d lonaat -f fix-duplicates.sql

# Option 2: Using Prisma Studio
npx prisma studio
# Then run queries manually

# Option 3: Using pgAdmin or any PostgreSQL client
# Copy and paste the SQL from fix-duplicates.sql
```

---

### **STEP 2: Fix Windows File Lock (EPERM)**

**Kill all Node processes**:
```powershell
# Stop all Node processes
taskkill /F /IM node.exe

# Verify no Node processes running
tasklist | findstr node.exe
# Should return nothing
```

**Close VS Code** (important):
- File → Exit
- Or press `Alt+F4`

---

### **STEP 3: Clear Prisma Cache**

```powershell
# Navigate to backend directory
cd C:\Users\lonaat\lonaat-backend-1\backend-node

# Delete Prisma cache
Remove-Item -Recurse -Force node_modules\.prisma

# Verify deletion
Test-Path node_modules\.prisma
# Should return: False
```

---

### **STEP 4: Reinstall and Regenerate**

```bash
# Reinstall dependencies (optional, but safe)
npm install

# Regenerate Prisma client
npx prisma generate
```

**Expected output**:
```
✔ Generated Prisma Client to ./node_modules/@prisma/client
```

---

### **STEP 5: Run Database Migration**

```bash
npx prisma db push
```

**Expected output**:
```
✔ Database synchronized with Prisma schema
✔ Conversion table created
✔ Unique constraints applied
```

**If prompted about warnings**, type `y` to proceed.

---

### **STEP 6: Start Server**

```bash
npm run dev
```

**Expected**:
```
🚀 SERVER RUNNING ON PORT 4000
✅ API: http://localhost:4000
```

---

### **STEP 7: Run Full Stress Tests**

```bash
node test-conversion-stress.js
```

**Expected Result**:
```
✅ PASSED: 8/8
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 ALL TESTS PASSED - SYSTEM IS PRODUCTION READY!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Tests that should pass**:
- ✅ Normal Conversion
- ✅ Duplicate Prevention
- ✅ Race Condition Protection
- ✅ Invalid User Rejection
- ✅ Negative Amount Rejection
- ✅ Missing Product Rejection
- ✅ Webhook Secret Validation
- ✅ Invalid Secret Rejection

---

## 🚨 TROUBLESHOOTING

### **If EPERM persists**:
```powershell
# Check what's locking the file
Get-Process | Where-Object {$_.Path -like "*node*"}

# Force kill specific PID
Stop-Process -Id <PID> -Force

# Restart computer (last resort)
Restart-Computer
```

### **If duplicates still exist**:
```sql
-- Check for duplicates again
SELECT reference, COUNT(*), array_agg(id) as ids
FROM product_conversions
GROUP BY reference
HAVING COUNT(*) > 1;

-- Manually delete specific IDs
DELETE FROM product_conversions WHERE id IN (123, 456, 789);
```

### **If migration fails with other errors**:
```bash
# Check Prisma schema syntax
npx prisma validate

# Check database connection
npx prisma db pull

# View current database state
npx prisma studio
```

---

## ✅ VERIFICATION CHECKLIST

After completing all steps:

- [ ] No duplicate `reference` values in `product_conversions`
- [ ] No Node processes running (`tasklist | findstr node.exe` returns nothing)
- [ ] `.prisma` folder deleted and regenerated
- [ ] `npx prisma generate` completed successfully
- [ ] `npx prisma db push` completed successfully
- [ ] Server starts without errors
- [ ] All 8 stress tests pass
- [ ] Conversion webhook creates records in database
- [ ] Wallet balance updates correctly
- [ ] Transaction ledger records created

---

## 📊 EXPECTED DATABASE STATE AFTER MIGRATION

**New Table**:
```sql
TABLE: Conversion
Columns:
  - id (SERIAL PRIMARY KEY)
  - userId (INTEGER NOT NULL)
  - productId (INTEGER NOT NULL)
  - amount (DOUBLE PRECISION NOT NULL)
  - commission (DOUBLE PRECISION NOT NULL)
  - status (TEXT DEFAULT 'pending')
  - reference (TEXT UNIQUE NOT NULL) ← This is the new constraint
  - createdAt (TIMESTAMP DEFAULT NOW())

Indexes:
  - Conversion_userId_idx
  - Conversion_productId_idx
  - Conversion_status_idx
  - Conversion_reference_idx
```

**Verify**:
```sql
-- Check table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'Conversion';

-- Check unique constraint
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'Conversion' AND constraint_type = 'UNIQUE';
```

---

## 🎯 SUCCESS CRITERIA

**Migration is successful when**:
1. ✅ `Conversion` table exists in database
2. ✅ Unique constraint on `reference` column applied
3. ✅ All 8 stress tests pass
4. ✅ Webhook creates conversion records
5. ✅ Wallet balances update correctly
6. ✅ No EPERM errors
7. ✅ Server runs without errors

**Then your system is PRODUCTION READY!** 🚀

---

**END OF MIGRATION FIX GUIDE**
