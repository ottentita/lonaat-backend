# Lonaat Backend Setup Guide

## Environment Configuration

### 1. Create .env File

Copy the example file and update with your credentials:

```bash
cd backend
cp .env.example .env
```

### 2. Configure Required Environment Variables

Edit `backend/.env` and set the following:

```env
# Flask Configuration
FLASK_SECRET=your_random_secret_key_here_minimum_32_characters
JWT_SECRET=your_jwt_secret_key_here_minimum_32_characters

# Database Configuration (Docker PostgreSQL only)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/lonaat

# Flutterwave Payment Gateway
FLUTTERWAVE_SECRET=your_flutterwave_secret_key
FLUTTERWAVE_PUBLIC=your_flutterwave_public_key

# Application Settings
BASE_URL=https://your-replit-domain.replit.app
ADMIN_EMAIL=admin@yourdomain.com

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=create_a_strong_password_here
```

### 3. Generate Secure Secrets

Use these commands to generate secure random secrets:

```bash
# Generate FLASK_SECRET
python3 -c "import secrets; print(secrets.token_hex(32))"

# Generate JWT_SECRET
python3 -c "import secrets; print(secrets.token_hex(32))"

# Generate ADMIN_PASSWORD
python3 -c "import secrets; print(secrets.token_urlsafe(16))"
```

### 4. Replit Secrets Configuration

If deploying on Replit, add these as Secrets (not in .env):

1. Go to Tools → Secrets
2. Add each variable:
   - `FLASK_SECRET`
   - `JWT_SECRET`
   - `ADMIN_PASSWORD`
   - `FLUTTERWAVE_SECRET` (when ready)
   - `FLUTTERWAVE_PUBLIC` (when ready)

### 5. Database Setup

The application uses the Docker PostgreSQL container exclusively:
- Ensure the `postgres` service from `docker-compose.yml` is running
- `DATABASE_URL` must be set to `postgresql://postgres:postgres@postgres:5432/lonaat`
- On startup the app will run migrations and create tables
- An admin user is created using credentials from environment

### 6. Start the Server

```bash
cd backend
flask --app main run --host=0.0.0.0 --port=5000
```

Or use the Replit Run button (configured to use the Server workflow).

## Testing

See `POSTMAN_TESTING.md` for complete API testing guide.

### Quick Test

```bash
# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env` file to version control
- Always use strong, unique passwords for admin accounts
- Rotate secrets regularly in production
- Use Replit Secrets for production deployment
- Keep `.env.example` updated without real credentials

## Database Migrations

Initialize migrations (if needed):

```bash
cd backend
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

## Admin Access

Default admin user is created automatically on first run with:
- Email: Value from `ADMIN_EMAIL` environment variable
- Password: Value from `ADMIN_PASSWORD` environment variable

To create additional admin users, update the database directly or add registration endpoint with admin privilege check.
