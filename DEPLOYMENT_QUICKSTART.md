# 🚀 Lonaat Deployment Quick Start

## What You're Seeing

If your deployment is showing **crash loops** or **database errors**, this is **EXPECTED BEHAVIOR**. 

The app uses **fail-fast** deployment to protect your data:
- ❌ **Won't start** without DATABASE_URL → Prevents runtime crashes
- ❌ **Won't start** without ENCRYPTION_KEY → Prevents data loss
- ✅ **Clear error messages** in logs → Tells you exactly what to add

**This is a FEATURE, not a bug** - it prevents silent failures and data corruption.

---

## 🎯 Fix Deployment in 3 Steps

### Step 1: Create PostgreSQL Database

**Render:**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **PostgreSQL**
3. Name: `lonaat-db`
4. Plan: **Free** or Starter
5. Click **Create Database**
6. **Copy the "External Database URL"** (starts with `postgresql://`)

**Other Platforms:**
- Railway: Create PostgreSQL addon
- Fly.io: `flyctl postgres create`
- Vercel: Add Vercel Postgres integration

---

### Step 2: Generate Required Secrets

Open your terminal and run these commands:

```bash
# Generate ENCRYPTION_KEY
python3 -c "import base64, os; print('ENCRYPTION_KEY=' + base64.urlsafe_b64encode(os.urandom(32)).decode())"

# Generate FLASK_SECRET  
python3 -c "import secrets; print('FLASK_SECRET=' + secrets.token_hex(32))"
```

---

### Step 3: Add Secrets to Deployment

**Render:**
1. Go to your web service dashboard
2. Click **Environment** tab
3. Click **Add Environment Variable**
4. Add these one by one:

```bash
DATABASE_URL=<paste-your-external-database-url-from-step-1>
ENCRYPTION_KEY=<paste-generated-key-from-step-2>
FLASK_SECRET=<paste-generated-secret-from-step-2>
ADMIN_USERNAME=admin@lonaat.com
ADMIN_PASSWORD=YourSecurePassword123!
ADMIN_EMAIL=admin@lonaat.com
```

**Railway/Fly.io/Vercel:**
Similar process - add environment variables in your platform's dashboard.

---

## ✅ Verify Deployment

After adding secrets, your deployment should show:

```
✅ SQLAlchemy database initialized successfully
✅ Admin user created: admin@lonaat.com
✅ Default subscription plans initialized
Server running on port 8000
```

**Check deployment status:**
Visit: `https://your-app-url.com/api/deployment/status`

---

## 📧 Optional: Email Notifications

For email features (welcome emails, withdrawal notifications):

**Free Option - Brevo (SendinBlue):**
1. Sign up at https://brevo.com (free tier: 300 emails/day)
2. Go to SMTP & API → **SMTP** tab
3. Click "Generate a new SMTP key"
4. Add to deployment:

```bash
EMAIL_HOST=smtp-relay.sendinblue.com
EMAIL_PORT=587
EMAIL_USER=<your-brevo-email>
EMAIL_PASS=<your-smtp-key>
EMAIL_SENDER=Lonaat Support <no-reply@lonaat.com>
```

---

## ❓ Troubleshooting

### "ENCRYPTION_KEY is mandatory for production"
✅ Run the command in Step 2 to generate a key, then add to deployment

### "Database connection failed in production"
✅ Make sure DATABASE_URL is the **External Database URL**, not Internal

### "Cannot connect to database"
✅ Check your DATABASE_URL has correct format: `postgresql://user:password@host:port/dbname`

### Still seeing errors?
✅ Check deployment logs for the exact error message
✅ Visit `/api/deployment/status` to see which secrets are missing

---

## 🎉 Next Steps

Once deployed successfully:

1. **Login as admin:** `admin@lonaat.com` with your ADMIN_PASSWORD
2. **Run seed script** (optional): Creates 3 test users with sample data
3. **Add affiliate network API keys** (optional): Enables product sync from Amazon, ShareASale, etc.

---

## 💡 Why Fail-Fast?

You might wonder: "Why doesn't it just start anyway?"

**Fail-fast deployment prevents:**
- ❌ Data loss from temporary encryption keys
- ❌ Runtime crashes on first database request  
- ❌ Silent failures that are hard to debug
- ❌ Corrupted user data from missing secrets

**Instead, you get:**
- ✅ Clear error messages in logs
- ✅ Exact commands to fix issues
- ✅ Safe deployment that won't corrupt data
- ✅ Confidence that if it starts, it works

---

Need help? Check the full [DEPLOYMENT.md](./DEPLOYMENT.md) guide or open an issue.
