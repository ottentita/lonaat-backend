# Conversion Routes

Base path: `/api/conversions`

Endpoints:

- `POST /track` - Record a conversion event and associate it with a click token
  - Body: `{ clickToken: string, revenue: number }`
  - Success: `{ ok: true }`
  - Errors:
    - `400` missing or invalid parameters
    - `404` click token not found
    - `409` duplicate conversion (tracker already recorded this token)
    - `500` internal server error
  - Notes: the handler checks that the click exists, prevents duplicates and wraps creation inside a Prisma transaction.

Examples (curl):

```bash
curl -X POST http://localhost:4000/api/conversions/track \
  -H "Content-Type: application/json" \
  -d '{"clickToken":"abc123","revenue":500}'
```