DB audit script

This script performs a read-only audit of the PostgreSQL database referenced by `backend-node/.env` and prints a JSON report.

Prerequisites
- Node.js (14+)
- Install dependencies in the repository (only `pg` is required for DB access):

```bash
cd backend-node
npm install pg
```

Usage

```bash
# from repo root
node backend-node/scripts/db_audit.js
```

Notes
- The script will attempt to run `npx prisma migrate status` if `npx` is available; this is optional and non-destructive.
- The script will not modify any database objects.
