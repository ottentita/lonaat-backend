# Backend Response Contract Definitions
**API Response Shapes - Verified & Locked**

---

## Auth Endpoints

### POST /api/auth/register
**Frontend Client**: `authAPI.register(data)`

**Request**:
```json
{
  "name": "string",
  "email": "string",
  "password": "string (min 8 chars)"
}
```

**Success Response (201)**:
```json
{
  "user": {
    "id": "number",
    "email": "string",
    "name": "string"
  },
  "token": "string (JWT)"
}
```

**Error Response (400/409/500)**:
```json
{
  "error": "string",
  "errors": "array (optional validation errors)"
}
```

---

### POST /api/auth/login
**Frontend Client**: `authAPI.login(data)`

**Request**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Success Response (200)**:
```json
{
  "user": {
    "id": "number",
    "email": "string",
    "name": "string"
  },
  "token": "string (JWT)"
}
```

---

### GET /api/auth/me
**Frontend Client**: `authAPI.getMe()`

**Request Headers**: `Authorization: Bearer {token}`

**Success Response (200)**:
```json
{
  "id": "number",
  "email": "string",
  "name": "string"
}
```

---

## User Profile Endpoints

### GET /api/user/profile
**Frontend Client**: `authAPI.getProfile()`

**Request Headers**: `Authorization: Bearer {token}`

**Success Response (200)**:
```json
{
  "id": "number",
  "email": "string",
  "name": "string",
  "phone": "string (optional)",
  "address": "string (optional)",
  "created_at": "ISO8601 string",
  "updated_at": "ISO8601 string"
}
```

---

### PUT /api/user/profile
**Frontend Client**: `authAPI.updateProfile(data)`

**Request**:
```json
{
  "name": "string (optional)",
  "phone": "string (optional)",
  "address": "string (optional)"
}
```

**Success Response (200)**:
```json
{
  "id": "number",
  "email": "string",
  "name": "string",
  "phone": "string (optional)",
  "address": "string (optional)"
}
```

---

## Wallet Endpoints

### GET /api/wallet
**Frontend Client**: `walletAPI.getBalance()`

**Request Headers**: `Authorization: Bearer {token}`

**Success Response (200)**:
```json
{
  "wallet": {
    "credits": "number",
    "balance": "number or string (Prisma Decimal)",
    "total_purchased": "number",
    "total_spent": "number"
  }
}
```

**⚠️ Note**: Frontend normalizes `wallet.balance` to number

---

### GET /api/wallet/summary
**Frontend Client**: `walletAPI.getSummary()`

**Request Headers**: `Authorization: Bearer {token}`

**Success Response (200)**:
```json
{
  "wallet": {
    "credits": "number",
    "balance": "number or string (Prisma Decimal)",
    "total_purchased": "number",
    "total_spent": "number"
  }
}
```

---

### GET /api/wallet/transactions
**Frontend Client**: `walletAPI.getTransactions()`

**Request Headers**: `Authorization: Bearer {token}`

**Success Response (200)**:
```json
{
  "transactions": [
    {
      "id": "number",
      "user_id": "number",
      "type": "string (credit, debit, purchase, withdrawal)",
      "amount": "number",
      "balance_before": "number",
      "balance_after": "number",
      "description": "string",
      "reference_id": "string (optional)",
      "created_at": "ISO8601 string"
    }
  ]
}
```

---

### POST /api/wallet/buy_credits
**Frontend Client**: `walletAPI.buyCredits(data)`

**Request**:
```json
{
  "package_id": "number"
}
```

**Success Response (200)**:
```json
{
  "success": "boolean",
  "credits": "number",
  "new_balance": "number",
  "transaction_id": "string"
}
```

---

## Commissions Endpoints

### GET /api/commissions
**Frontend Client**: `commissionsAPI.getMy(params?)`

**Request Headers**: `Authorization: Bearer {token}`

**Query Parameters** (optional):
```
?page=1&limit=20&status=pending&network=digistore24
```

**Success Response (200)**:
```json
{
  "commissions": [
    {
      "id": "number",
      "user_id": "number",
      "product_id": "number (optional)",
      "network": "string",
      "amount": "number or string (Prisma Decimal)",
      "currency": "string",
      "status": "string (pending, approved, rejected, paid)",
      "description": "string (optional)",
      "external_reference": "string (optional)",
      "created_at": "ISO8601 string",
      "user": {
        "id": "number",
        "name": "string",
        "email": "string"
      }
    }
  ],
  "stats": {
    "total_count": "number",
    "total_amount": "number",
    "approved_amount": "number"
  },
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "pages": "number"
  }
}
```

---

### GET /api/commissions/summary
**Frontend Client**: `commissionsAPI.getSummary()`

**Request Headers**: `Authorization: Bearer {token}`

**Success Response (200)**:
```json
{
  "total": "number",
  "approved": "number",
  "pending": "number",
  "rejected": "number",
  "paid": "number"
}
```

---

## Withdrawals Endpoints

### GET /api/wallet/withdrawals
**Frontend Client**: `withdrawalAPI.getMy()`

**Request Headers**: `Authorization: Bearer {token}`

**Success Response (200)**:
```json
{
  "withdrawals": [
    {
      "id": "number",
      "user_id": "number",
      "amount": "number",
      "currency": "string",
      "status": "string (pending, approved, rejected, paid)",
      "payment_method": "string (bank_transfer, paypal, etc)",
      "bank_details": {
        "account_number": "string (masked)",
        "account_name": "string",
        "bank_name": "string"
      },
      "admin_notes": "string (optional)",
      "created_at": "ISO8601 string",
      "approved_at": "ISO8601 string (nullable)",
      "paid_at": "ISO8601 string (nullable)"
    }
  ]
}
```

---

### GET /api/wallet/balance
**Frontend Client**: `withdrawalAPI.getBalance()`

**Request Headers**: `Authorization: Bearer {token}`

**Success Response (200)**:
```json
{
  "balance": "number",
  "available_for_withdrawal": "number",
  "pending_withdrawal": "number"
}
```

---

### POST /api/wallet/withdraw
**Frontend Client**: `withdrawalAPI.create(data)`

**Request**:
```json
{
  "amount": "number (min 10)",
  "payment_method": "string",
  "account_number": "string",
  "account_name": "string",
  "bank_name": "string"
}
```

**Success Response (201)**:
```json
{
  "id": "number",
  "amount": "number",
  "status": "pending",
  "created_at": "ISO8601 string"
}
```

---

## Products Endpoints

### GET /api/products
**Frontend Client**: `productsAPI.getAll(params?)`

**Request Headers**: `Authorization: Bearer {token}`

**Query Parameters** (optional):
```
?page=1&limit=20&network=digistore24&search=keyword
```

**Success Response (200)**:
```json
{
  "products": [
    {
      "id": "number",
      "user_id": "number",
      "title": "string",
      "description": "string (optional)",
      "price": "number",
      "currency": "string",
      "image_url": "string (optional)",
      "affiliate_url": "string",
      "network": "string (digistore24, awin, etc)",
      "external_id": "string",
      "commission_rate": "number (optional)",
      "is_active": "boolean",
      "created_at": "ISO8601 string"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "pages": "number"
  }
}
```

---

### POST /api/products
**Frontend Client**: `productsAPI.create(data)`

**Request**:
```json
{
  "title": "string",
  "description": "string (optional)",
  "price": "number",
  "currency": "string",
  "image_url": "string (optional)",
  "affiliate_url": "string",
  "network": "string",
  "external_id": "string",
  "commission_rate": "number (optional)"
}
```

**Success Response (201)**:
```json
{
  "id": "number",
  "title": "string",
  "price": "number",
  "network": "string",
  "created_at": "ISO8601 string"
}
```

---

## Offers Endpoints

### GET /api/offers
**Frontend Client**: `offersAPI.getOffers(network, query?, page?)`

**Query Parameters**:
```
?network=digistore24&q=search_term&page=1
```

**Success Response (200)**:
```json
[
  {
    "id": "number",
    "title": "string",
    "name": "string (optional)",
    "description": "string (optional)",
    "url": "string",
    "payout": "number",
    "network": "string",
    "externalOfferId": "string",
    "networkName": "string",
    "trackingUrl": "string (optional)",
    "isActive": "boolean",
    "slug": "string (optional)"
  }
]
```

---

## Admin Dashboard Endpoints

### GET /api/admin/dashboard
**Frontend Client**: `adminAPI.getDashboard()`

**Request Headers**: `Authorization: Bearer {token}` (Admin only)

**Success Response (200)**:
```json
{
  "stats": {
    "total_users": "number",
    "active_users": "number",
    "total_products": "number",
    "active_campaigns": "number",
    "total_volume": "number",
    "pending_withdrawals": "number",
    "total_commissions": "number"
  },
  "recent_users": [
    {
      "id": "number",
      "name": "string",
      "email": "string",
      "role": "string",
      "created_at": "ISO8601 string",
      "balance": "number"
    }
  ],
  "recent_commissions": [
    {
      "id": "number",
      "amount": "number",
      "status": "string",
      "network": "string",
      "created_at": "ISO8601 string"
    }
  ]
}
```

---

### GET /api/admin/stats
**Frontend Client**: `adminAPI.getStats()`

**Request Headers**: `Authorization: Bearer {token}` (Admin only)

**Success Response (200)**:
```json
{
  "totalUsers": "number",
  "totalOffers": "number",
  "totalClicks": "number",
  "totalConversions": "number",
  "totalCommissions": "number",
  "totalPayouts": "number",
  "totalRevenue": "number"
}
```

---

## Properties/Real Estate Endpoints

### GET /api/properties/my
**Frontend Client**: `realEstateAPI.getMyProperties(params?)`

**Request Headers**: `Authorization: Bearer {token}`

**Query Parameters** (optional):
```
?page=1&limit=20&status=approved
```

**Success Response (200)**:
```json
{
  "properties": [
    {
      "id": "number",
      "user_id": "number",
      "title": "string",
      "description": "string",
      "location": "string",
      "price": "number",
      "type": "string (residential, commercial, land, etc)",
      "bedrooms": "number (optional)",
      "bathrooms": "number (optional)",
      "square_feet": "number (optional)",
      "images": [ "string (urls)" ],
      "status": "string (pending, approved, rejected)",
      "created_at": "ISO8601 string",
      "updated_at": "ISO8601 string"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number"
  }
}
```

---

### POST /api/properties/create
**Frontend Client**: `realEstateAPI.createProperty(data)`

**Request**:
```json
{
  "title": "string",
  "description": "string",
  "location": "string",
  "price": "number",
  "type": "string",
  "bedrooms": "number (optional)",
  "bathrooms": "number (optional)",
  "square_feet": "number (optional)"
}
```

**Success Response (201)**:
```json
{
  "id": "number",
  "title": "string",
  "status": "pending",
  "created_at": "ISO8601 string"
}
```

---

## Leads Endpoints

### GET /api/leads
**Frontend Client**: `leadsAPI.getLeads(params?)`

**Request Headers**: `Authorization: Bearer {token}`

**Query Parameters** (optional):
```
?page=1&limit=20&status=open&priority=high
```

**Success Response (200)**:
```json
{
  "leads": [
    {
      "id": "number",
      "user_id": "number",
      "source": "string",
      "name": "string",
      "email": "string",
      "phone": "string (optional)",
      "status": "string (open, contacted, converted, rejected)",
      "priority": "string (low, medium, high)",
      "notes": "string (optional)",
      "property_id": "number (optional)",
      "created_at": "ISO8601 string",
      "updated_at": "ISO8601 string"
    }
  ],
  "stats": {
    "total": "number",
    "open": "number",
    "contacted": "number",
    "converted": "number"
  },
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number"
  }
}
```

---

## Social Automation Endpoints

### GET /api/social/accounts
**Frontend Client**: `socialAPI.getAccounts()`

**Request Headers**: `Authorization: Bearer {token}`

**Success Response (200)**:
```json
{
  "accounts": [
    {
      "id": "number",
      "user_id": "number",
      "platform": "string (twitter, instagram, facebook, linkedin)",
      "account_name": "string",
      "access_token": "string (encrypted, masked)",
      "is_connected": "boolean",
      "is_active": "boolean",
      "connected_at": "ISO8601 string"
    }
  ]
}
```

---

### GET /api/social/posts
**Frontend Client**: `socialAPI.getPosts(params?)`

**Request Headers**: `Authorization: Bearer {token}`

**Query Parameters** (optional):
```
?limit=50&status=pending
```

**Success Response (200)**:
```json
{
  "posts": [
    {
      "id": "number",
      "user_id": "number",
      "account_id": "number",
      "product_id": "number (optional)",
      "content": "string",
      "media_urls": [ "string" ],
      "status": "string (draft, pending, published, failed)",
      "scheduled_at": "ISO8601 string (nullable)",
      "published_at": "ISO8601 string (nullable)",
      "created_at": "ISO8601 string"
    }
  ]
}
```

---

## Land Registry Endpoints

### GET /api/land-registry
**Frontend Client**: `landRegistryAPI.getLands(params?)`

**Request Headers**: `Authorization: Bearer {token}`

**Query Parameters** (optional):
```
?page=1&limit=100&status=registered
```

**Success Response (200)**:
```json
{
  "lands": [
    {
      "id": "number",
      "user_id": "number",
      "location": "string",
      "coordinates": {
        "lat": "number",
        "lng": "number",
        "polygon": [ { "lat": "number", "lng": "number" } ]
      },
      "size": "number (hectares)",
      "status": "string (registered, pending_verification, disputed)",
      "owner_name": "string",
      "certificate_number": "string",
      "created_at": "ISO8601 string"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number"
  }
}
```

---

## Affiliate Partner Endpoints

### GET /api/affiliate/stats
**Frontend Client**: `affiliateAPI.getStats()`

**Request Headers**: `Authorization: Bearer {token}`

**Success Response (200)**:
```json
{
  "total_clicks": "number",
  "total_conversions": "number",
  "total_earnings": "number",
  "active_offers": "number",
  "pending_commissions": "number",
  "approved_commissions": "number",
  "networks": [
    {
      "network": "string",
      "clicks": "number",
      "conversions": "number",
      "earnings": "number"
    }
  ]
}
```

---

## Error Response Format (Standard for All Endpoints)

### 4xx Client Errors
```json
{
  "error": "string (human-readable message)",
  "errors": [
    {
      "field": "string (optional)",
      "message": "string"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Admin access required"
}
```

### 500 Server Error
```json
{
  "error": "Internal server error",
  "message": "string (optional details)"
}
```

---

## Data Type Conventions

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `id` | number | 123 | Primary key |
| `*_id` | number | user_id | Foreign key |
| `amount` | number OR string | 99.99 or "99.99" | Prisma Decimal - frontend must normalize |
| `balance` | number OR string | 500.50 or "500.50" | Prisma Decimal - frontend normalizes |
| `*_at` | ISO8601 string | 2026-03-01T12:00:00Z | Timestamps |
| `is_*` | boolean | true | Boolean flags |
| `status` | string (enum) | "pending" | Predefined values |
| `currency` | string | "USD" | ISO 4217 code |
| `url` | string | "https://..." | Full URL |

---

## Required Frontend Normalizations

### 1. Decimal/BigDecimal Fields
**Backend sends as string** (Prisma Decimal serialization):
```javascript
"balance": "99.99"
```

**Frontend must convert to number**:
```javascript
const balance = Number(response.data.wallet.balance);
```

Implementation: `frontend/src/services/api.js` already does this in `walletAPI.getBalance()` and `walletAPI.getSummary()`

### 2. Timestamp Handling
**Backend sends**: ISO8601 strings
**Frontend uses**: Multiple date libraries (assume Date object conversion)

### 3. Pagination
**Standard structure** across list endpoints:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## Status Codes Reference

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET/PUT/PATCH |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (e.g., user email) |
| 500 | Server Error | Unexpected error |

---

## Verification Checklist

- [x] Auth endpoints match frontend usage
- [x] Wallet endpoints structure verified
- [x] Commissions endpoints verified
- [x] Products endpoints verified
- [x] Admin dashboard endpoints verified
- [ ] Real Estate endpoints (detailed verification pending)
- [ ] Land Registry endpoints (detailed verification pending)
- [ ] Social Automation endpoints (detailed verification pending)
- [ ] Leads endpoints (detailed verification pending)

---

**Status**: 🟡 PARTIAL - Core endpoints verified, feature modules pending detailed response shape validation

**Last Updated**: Mar 1, 2026
