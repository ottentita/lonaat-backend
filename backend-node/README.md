# Lonaat Backend (minimal)

This is a minimal refactor of the original backend to a working Node.js + Express + Prisma setup using SQLite for local development.

Quick start

1. Install dependencies

```bash
npm install
```

2. Generate Prisma client and create SQLite DB

```bash
npx prisma generate
npx prisma db push
```

3. Start dev server

```bash
npm run dev
```

Default server URL: http://localhost:4000

Available endpoints (minimal)

- `GET /` - health
- `POST /auth/register` - register { name?, email, password }
- `POST /auth/login` - login { email, password }
- `GET /auth/me` - get current user, requires `Authorization: Bearer <token>`

New endpoints for offers & tracking

- `GET /api/health` - returns { status: "ok" }
- `GET /api/offers` - list active offers
- `POST /api/track/click` - record click { offerId, clickId, ip?, userAgent? }
- `POST /api/track/conversion` - record conversion { offerId, clickId?, amount?, status? }

Seeding sample offers

Run:

```bash
npm run seed
```

This will create 3 sample offers for testing.

Environment

Copy or edit `.env` in the project root; example values are already provided in `.env`.

Notes

- This is intentionally minimal for local development. Feel free to ask for additional routes, tests, or CI scripts.
