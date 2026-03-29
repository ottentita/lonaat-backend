# ⚠️ CRITICAL: STOP BACKEND SERVER FIRST

Before proceeding with the financial core refactor, you MUST:

## 1. Stop Backend Server

The Prisma client file is locked by the running backend process.

**Stop the server**, then run:

```bash
npx prisma generate
```

## 2. After Prisma Generate Completes

I will then proceed with:

✅ Phase 1: Transaction model (DONE - tables created)
🔄 Phase 2: Fix all Prisma model mismatches
🔄 Phase 3: Mount /api/commissions route
🔄 Phase 4: Remove raw SQL
🔄 Phase 5: Add transaction logging
🔄 Phase 6: Fix wallet logic
🔄 Phase 7: Standardize responses
🔄 Phase 8: Add security features

---

**ACTION REQUIRED**: Stop backend, run `npx prisma generate`, then let me know to continue.
