# Lonaat Backend API - Complete Documentation

## Base URL
```
Production: https://lonaat.replit.app
Development: http://localhost:5000
```

---

## 📦 New Features

### Models Added
- ✅ Product - Affiliate product management
- ✅ AffiliateClick - Click tracking
- ✅ WithdrawalRequest - Withdrawal processing
- ✅ Notification - User notifications
- ✅ AdBoost - AdBoost campaigns
- ✅ Plan - Subscription plans (Free, Pro, Business)
- ✅ Subscription - User subscriptions
- ✅ CreditWallet - AdBoost credit wallet
- ✅ ReferralPayout - Referral commissions

### Systems Implemented
- ✅ Flutterwave payment integration
- ✅ AdBoost engine with automatic expiry
- ✅ APScheduler for background tasks
- ✅ Comprehensive logging
- ✅ Error handling

---

## 🔐 Authentication

All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <access_token>
```

---

## 📝 Products API

### 1. Get User Products
```http
GET /api/products
```

**Query Parameters:**
- `page` (int, default: 1)
- `per_page` (int, default: 20)
- `is_active` (boolean)

**Response:**
```json
{
  "products": [
    {
      "id": 1,
      "user_id": 2,
      "name": "Test Product",
      "description": "Product description",
      "price": "$99",
      "affiliate_link": "https://example.com/aff",
      "network": "clickbank",
      "category": "Tech",
      "image_url": null,
      "commission_rate": "50%",
      "is_active": true,
      "total_clicks": 0,
      "created_at": "2025-11-09T15:48:04.771133"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20,
  "total_pages": 1
}
```

### 2. Create Product
```http
POST /api/products
```

**Request Body:**
```json
{
  "name": "My Product",
  "description": "Product description",
  "price": "$99",
  "affiliate_link": "https://example.com/aff/123",
  "network": "clickbank",
  "category": "Software",
  "image_url": "https://example.com/image.jpg",
  "commission_rate": "50%"
}
```

### 3. Update Product
```http
PUT /api/products/<product_id>
```

### 4. Delete Product
```http
DELETE /api/products/<product_id>
```

### 5. Import Products from Affiliate Network
```http
POST /api/products/import
```

---

## 💰 Billing & Payments API

### Token Balance & Purchases (internal)
These endpoints are used by the frontend to check the user's token balance and to simulate token purchases.

**GET /api/billing/balance**
- Headers: `Authorization: Bearer <token>`
- Response: `{ plan, tokens, totalUsed }`

**POST /api/billing/purchase-tokens**
- Body: `{ package: 'small'|'medium'|'large' }`
- Adds tokens to user account and records a `TokenPurchase`.

**GET /api/billing/usage-summary**
- Provides totals for tokens used, drafts created, AI cost estimate, and tokens purchased.

### Coinbase Commerce Integration
Real money purchases are handled via Coinbase Commerce.

**POST /api/payments/create-charge**
- Headers: `Authorization: Bearer <token>`
- Body: `{ package: 'small'|'medium'|'large' }`
- Returns `{ hosted_url }` the user should be redirected to in order to complete payment.

**POST /api/payments/webhook/coinbase**
- Expects raw JSON payload from Coinbase (configure webhook URL accordingly).
- Validates the `X-CC-Webhook-Signature` header using `COINBASE_COMMERCE_WEBHOOK_SECRET`.
- On `charge:confirmed` events credits tokens to the user's account and records the charge.


### Environment Variables (additions)
- `COINBASE_COMMERCE_API_KEY` - API key for creating charges
- `COINBASE_COMMERCE_WEBHOOK_SECRET` - secret used to verify webhook signatures

---

**Request Body:**
```json
{
  "network": "clickbank",
  "max_results": 10
}
```

**Supported Networks:**
- `clickbank`
- `shareasale`
- `amazon`
- `digistore24`
- `cj`
- `impact`

---

## 🎯 AdBoost API

### 1. Launch AdBoost Campaign
```http
POST /api/ads/launch
```

**Request Body:**
```json
{
  "product_id": 123
}
```

**How AdBoost Works:**
- Each campaign lasts 24 hours
- Starts at 1x boost level
- Each click doubles boost (1x → 2x → 4x → 8x → 16x → 32x max)
- Credits deducted per boost level:
  - 1x: 10 credits
  - 2x: 20 credits
  - 4x: 40 credits
  - 8x: 80 credits
  - 16x: 160 credits
  - 32x: 320 credits (max)

**Response:**
```json
{
  "message": "AdBoost campaign launched successfully",
  "campaign": {
    "id": 1,
    "user_id": 2,
    "product_id": 123,
    "boost_level": 1,
    "credits_spent": 10,
    "clicks_received": 0,
    "status": "active",
    "started_at": "2025-11-09T15:00:00",
    "expires_at": "2025-11-10T15:00:00"
  },
  "credits_remaining": 90
}
```

### 2. Get Campaign Status
```http
GET /api/ads/status
```

**Response:**
```json
{
  "active_campaigns": [...],
  "expired_campaigns": [...],
  "total_active": 2
}
```

### 3. Get Campaign Details
```http
GET /api/ads/<campaign_id>
```

### 4. Pause Campaign
```http
POST /api/ads/<campaign_id>/pause
```

---

## 💰 Wallet API

### 1. Get Wallet Balance
```http
GET /api/wallet
```

**Response:**
```json
{
  "wallet": {
    "id": 1,
    "user_id": 2,
    "credits": 100,
    "total_purchased": 500,
    "total_spent": 400,
    "updated_at": "2025-11-09T15:48:07.983669"
  }
}
```

### 2. Buy AdBoost Credits
```http
POST /api/wallet/buy_credits
```

**Request Body:**
```json
{
  "credits": 100,
  "amount": 1000
}
```

**Pricing:**
- ₦10 per credit

**Response:**
```json
{
  "message": "Payment initialized",
  "payment_link": "https://checkout.flutterwave.com/...",
  "tx_ref": "CREDIT_2_52627534104d59c2",
  "amount": 1000,
  "credits": 100
}
```

### 3. Get Wallet Transactions
```http
GET /api/wallet/transactions
```

---

## 📤 Withdrawal API

### 1. Request Withdrawal
```http
POST /api/withdraw
```

**Request Body:**
```json
{
  "amount": 5000,
  "method": "mobile_money",
  "account_details": {
    "phone": "0812345678"
  }
}
```

**Or for bank transfer:**
```json
{
  "amount": 5000,
  "method": "bank_transfer",
  "account_details": {
    "bank_code": "058",
    "account_number": "1234567890",
    "account_name": "John Doe"
  }
}
```

**Requirements:**
- Minimum withdrawal: ₦1,000
- Must have sufficient balance

### 2. Get My Withdrawals
```http
GET /api/withdrawals/my
```

### 3. Get All Withdrawals (Admin Only)
```http
GET /api/admin/withdrawals?status=pending
```

### 4. Approve Withdrawal (Admin Only)
```http
POST /api/admin/withdrawals/<withdrawal_id>/approve
```

**Request Body (optional):**
```json
{
  "notes": "Processed via Flutterwave"
}
```

### 5. Reject Withdrawal (Admin Only)
```http
POST /api/admin/withdrawals/<withdrawal_id>/reject
```

**Request Body:**
```json
{
  "notes": "Insufficient documentation"
}
```

---

## 🔗 Affiliate Click Tracking

### 1. Track Click & Redirect
```http
GET /api/affiliate/click/<product_id>
```

**What happens:**
1. Click is recorded in database
2. If product has active AdBoost:
   - Boost level doubles (up to 32x)
   - Additional credits deducted
3. User is redirected to affiliate link

**Example:**
```
https://lonaat.replit.app/api/affiliate/click/123
```

### 2. Get Click Statistics
```http
GET /api/affiliate/stats/<product_id>
```

**Response:**
```json
{
  "product_id": 123,
  "total_clicks": 45,
  "recent_clicks": [
    {
      "id": 1,
      "product_id": 123,
      "user_id": 2,
      "ip_address": "192.168.1.1",
      "clicked_at": "2025-11-09T15:30:00"
    }
  ]
}
```

---

## 💳 Flutterwave Payment Webhook

### Webhook Endpoint
```http
POST /api/payments/flutterwave/webhook
```

**Headers Required:**
```
verif-hash: <flutterwave_signature>
```

**Handles Events:**
- `charge.completed` - Payment successful
- `transfer.completed` - Withdrawal processed

**Auto-Processing:**
- Credits are automatically added to wallet on successful payment
- Withdrawal status updated on transfer completion

---

## 📊 Subscription Plans

### Available Plans

#### Free Plan
- Price: ₦0
- Max Products: 5
- Max AdBoosts: 1

#### Pro Plan
- Price: ₦5,000/month
- Max Products: 50
- Max AdBoosts: 10

#### Business Plan
- Price: ₦15,000/month
- Max Products: Unlimited
- Max AdBoosts: Unlimited

---

## 🔄 APScheduler Background Tasks

### Automatic AdBoost Expiry
- Runs every 5 minutes
- Automatically expires campaigns after 24 hours
- No manual intervention required

---

## 🛡️ Error Handling

### Common Error Responses

**400 Bad Request**
```json
{
  "error": "Invalid amount"
}
```

**401 Unauthorized**
```json
{
  "msg": "Bad Authorization header"
}
```

**403 Forbidden**
```json
{
  "error": "Admin access required"
}
```

**404 Not Found**
```json
{
  "error": "Product not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to create product"
}
```

---

## 🧪 Testing Workflow

### 1. Authentication
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login & Get Token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.access_token')
```

### 2. Create Product
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Product","affiliate_link":"https://example.com/aff","price":"$99"}'
```

### 3. Import Products
```bash
curl -X POST http://localhost:5000/api/products/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"network":"clickbank","max_results":5}'
```

### 4. Check Wallet
```bash
curl http://localhost:5000/api/wallet \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Launch AdBoost
```bash
curl -X POST http://localhost:5000/api/ads/launch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"product_id":1}'
```

---

## 📝 Logging

All operations are logged with structured logging:
- INFO: Successful operations
- WARNING: Non-critical issues
- ERROR: Failures and exceptions

**Log Format:**
```
2025-11-09 15:47:32,778 - main - INFO - ✅ SQLAlchemy database initialized
```

---

## 🔒 Security Features

- ✅ JWT authentication with 12-hour expiry
- ✅ Webhook signature verification
- ✅ Input validation on all endpoints
- ✅ Admin role verification
- ✅ SQL injection prevention (SQLAlchemy ORM)
- ✅ CORS enabled
- ✅ Secure password hashing

---

## 🚀 Deployment

### Environment Variables Required
```env
FLASK_SECRET=your_secret
JWT_SECRET=your_jwt_secret
FLUTTERWAVE_SECRET=your_flutterwave_secret
FLUTTERWAVE_PUBLIC=your_flutterwave_public
BASE_URL=https://your-domain.com
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_password
DATABASE_URL=postgresql://... (or defaults to SQLite)
```

### Production Ready Features
- ✅ Gunicorn deployment configuration
- ✅ PostgreSQL support
- ✅ APScheduler for background tasks
- ✅ Comprehensive error handling
- ✅ Structured logging
- ✅ Database migrations support (Flask-Migrate)

---

## 📈 Rate Limiting (Recommended)

While not implemented in this version, consider adding Flask-Limiter:
```python
from flask_limiter import Limiter

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)
```

---

## 🎯 Next Steps

1. Configure Flutterwave credentials
2. Set up production database
3. Add rate limiting
4. Implement email notifications
5. Add analytics dashboard
6. Create frontend interface

---

## 💡 Tips

- Use Postman Collections for easy testing
- Monitor APScheduler logs for background task status
- Check Flutterwave dashboard for payment tracking
- Use database migrations for schema changes
- Enable debug logging during development
