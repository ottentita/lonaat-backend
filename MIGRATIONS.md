Migration workflow (development + test)

Overview
- This project uses Prisma migrations. Do not use `prisma db push`.
- Development: use `prisma migrate dev` to create and apply migrations and keep them in `prisma/migrations`.
- Test: vitest global setup runs `prisma migrate deploy --schema=prisma/schema.test.prisma` which applies committed migrations to the SQLite `test.db`.
- Test Prisma client is generated into `node_modules/.prisma-test/client` and used only when `NODE_ENV=test`.

Generate initial migration (development machine)
1. Ensure `DATABASE_URL` in your `.env` points to your development database (Postgres).
2. Run:

```bash
# create a migration and apply it locally
npx prisma migrate dev --name init
# generate the client for development use
npx prisma generate
```

3. Commit the generated migration folder(s) under `prisma/migrations` and commit changes.

Apply migrations in CI or test flow
- The test global setup will run:

```bash
# from backend-node/
npx prisma generate --schema=prisma/schema.test.prisma
npx prisma migrate deploy --schema=prisma/schema.test.prisma
node prisma/seed.test.js
```

- `prisma migrate deploy` will apply the committed migrations to the SQLite test DB. This keeps test and dev databases in sync via migrations.

Notes and Windows tips
- If you see EPERM / file lock errors when running `prisma generate`, ensure no Node processes are running that hold `node_modules/.prisma` or `node_modules/.prisma-test` files. Stop dev servers or restart your machine if necessary.
- Migrations should be idempotent and safe. Avoid dropping production data in migrations.
- If you change the Prisma schema, create a new migration via `npx prisma migrate dev --name descriptive-name` and commit it.

CI Recommendation
- Add steps to your CI to run `npx prisma generate` and `npx prisma migrate deploy` before running tests or starting the service.

If you want, I can create an initial migration file from the current schema and add it to the repo, but that requires running `prisma migrate dev` locally or here with a target DB. Let me know if you want me to attempt generating a migration file in this environment and commit it.
