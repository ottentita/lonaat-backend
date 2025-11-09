# Lonaat Backend API - Postman Testing Guide

## Base URL
```
https://lonaat.replit.app
```

For local testing:
```
http://localhost:5000
```

---

## Authentication Endpoints

### 1. Register New User

**Endpoint:** `POST /api/auth/register`

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "referred_by": "ABC12345"
}
```

**Success Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "balance": 0.0,
    "verified": false,
    "referral_code": "XYZ98765",
    "referred_by": "ABC12345",
    "created_at": "2025-11-09T15:26:23.400739"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 2. Login User

**Endpoint:** `POST /api/auth/login`

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "balance": 0.0,
    "verified": false,
    "referral_code": "XYZ98765",
    "referred_by": null,
    "created_at": "2025-11-09T15:26:23.400739"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401):**
```json
{
  "error": "Invalid email or password"
}
```

---

### 3. Refresh Access Token

**Endpoint:** `POST /api/auth/refresh`

**Headers:**
```json
{
  "Authorization": "Bearer <REFRESH_TOKEN>",
  "Content-Type": "application/json"
}
```

**Success Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## User Endpoints

### 4. Get User Profile

**Endpoint:** `GET /api/user/profile`

**Headers:**
```json
{
  "Authorization": "Bearer <ACCESS_TOKEN>"
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "balance": 150.50,
    "verified": true,
    "referral_code": "XYZ98765",
    "referred_by": null,
    "created_at": "2025-11-09T15:26:23.400739"
  },
  "recent_transactions": [
    {
      "id": 1,
      "type": "commission",
      "amount": 50.00,
      "description": "Affiliate commission",
      "status": "completed",
      "created_at": "2025-11-09T16:30:00"
    }
  ]
}
```

---

## Admin Endpoints

### 5. Get Admin Dashboard

**Endpoint:** `GET /api/admin/dashboard`

**Headers:**
```json
{
  "Authorization": "Bearer <ADMIN_ACCESS_TOKEN>"
}
```

**Admin Login Credentials:**
- Email: `admin@example.com`
- Password: `Far@el11`

**Success Response (200):**
```json
{
  "statistics": {
    "total_users": 25,
    "total_admins": 1,
    "verified_users": 18,
    "total_transactions": 150,
    "total_commissions": 2500.50,
    "total_withdrawals": 1800.00,
    "pending_withdrawals": 5
  },
  "recent_users": [
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "user",
      "referral_code": "ABC12345",
      "verified": true,
      "created_at": "2025-11-09T14:20:00"
    }
  ],
  "recent_transactions": [
    {
      "id": 50,
      "user_id": 3,
      "type": "withdrawal",
      "amount": 200.00,
      "description": "Bank withdrawal",
      "status": "pending",
      "created_at": "2025-11-09T17:00:00"
    }
  ]
}
```

**Error Response (403):**
```json
{
  "error": "Admin access required"
}
```

---

## JWT Token Information

- **Access Token Expiry:** 12 hours
- **Refresh Token Expiry:** 30 days
- **Token Type:** Bearer
- **Algorithm:** HS256

---

## Testing Workflow

1. **Register a new user** → Save the `access_token`
2. **Login with credentials** → Verify token matches
3. **Get user profile** → Use the access token in Authorization header
4. **Login as admin** → Use admin credentials
5. **Access admin dashboard** → Use admin access token

---

## Error Responses

### 400 - Bad Request
```json
{
  "error": "Email and password are required"
}
```

### 401 - Unauthorized
```json
{
  "error": "Invalid email or password"
}
```

### 403 - Forbidden
```json
{
  "error": "Admin access required"
}
```

### 404 - Not Found
```json
{
  "error": "User not found"
}
```

### 409 - Conflict
```json
{
  "error": "Email already registered"
}
```

### 500 - Internal Server Error
```json
{
  "error": "Registration failed"
}
```

---

## Environment Variables (.env)

```env
# Flask Configuration
FLASK_SECRET=your_flask_secret_key_here
JWT_SECRET=your_jwt_secret_key_here

# Database (SQLite for dev, PostgreSQL for production)
# DATABASE_URL=postgresql://user:password@localhost/dbname

# Flutterwave Payment Gateway
FLUTTERWAVE_SECRET=your_flutterwave_secret
FLUTTERWAVE_PUBLIC=your_flutterwave_public

# Application Settings
BASE_URL=https://lonaat.replit.app
ADMIN_EMAIL=admin@example.com

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_password_here
```

---

## Database Models

### User Model
- `id` - Integer (Primary Key)
- `name` - String (100)
- `email` - String (120, Unique)
- `password_hash` - String (255)
- `role` - String (20) - 'user' or 'admin'
- `balance` - Float
- `verified` - Boolean
- `referral_code` - String (20, Unique)
- `referred_by` - String (20, Nullable)
- `created_at` - DateTime

### Transaction Model
- `id` - Integer (Primary Key)
- `user_id` - Integer (Foreign Key)
- `type` - String (20) - 'commission', 'withdrawal', 'bonus'
- `amount` - Float
- `description` - String (255)
- `status` - String (20) - 'pending', 'completed', 'failed'
- `created_at` - DateTime

---

## Notes

- All passwords must be at least 8 characters
- Email validation is performed on registration
- JWT tokens are stateless and contain the user ID
- Database uses SQLite by default, PostgreSQL supported via DATABASE_URL
- Flask-Migrate is configured for database migrations
