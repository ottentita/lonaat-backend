# Ads Module Routes (Internal Token Engine)

Base path: `/api/ads/internal`

Endpoints:

- `POST /campaign` - Create a new ad campaign
  - Body: `{ userId?: number, dailyBudget: number, productId?: number, offerId?: number }`
  - Auth: required
  - Response: campaign object or error

- `POST /campaign/:id/click` - Register an ad click
  - Params: `id` campaign id
  - Body: none
  - Auth: required (clicks from admin bypass token deduction)
  - Rate limit: max 10 clicks per 30s per IP
  - Response: `{ success: boolean, deducted?: number, message?: string }`

- `GET /dashboard/:userId` - Ads dashboard summary for a user
  - Response: `{ balance, activeCampaigns, totalSpent, ctr, conversionRate }`

- `POST /admin/credit` - Admin: credit tokens to a user
  - Body: `{ userId: number, amount: number }`
  - Auth: admin required
  - Response: `{ newBalance }`

Notes:
- Routes are mounted at `/api/ads/internal` to avoid clashing with existing public `/api/ads` endpoints.
- All balance updates are performed transactionally in the services; controllers call those services.
- For local development you can call routes with `NODE_ENV=development` to use the dev mock user.

Examples (curl):

Create campaign:

curl -X POST http://localhost:4000/api/ads/internal/campaign \
  -H "Content-Type: application/json" \
  -d '{"dailyBudget":50, "productId":123}'

Dashboard:

curl http://localhost:4000/api/ads/internal/dashboard/1

Admin credit (requires admin auth):

curl -X POST http://localhost:4000/api/ads/internal/admin/credit \
  -H "Content-Type: application/json" \
  -d '{"userId":1, "amount":100}'
