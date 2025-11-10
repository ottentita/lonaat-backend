# Lonaat Deployment Guide

## Production Deployment to Render

This guide covers deploying Lonaat to Render with PostgreSQL, SMTP email, and all production configurations.

---

## ⚠️ CRITICAL: Fix Deployment Crash Loops

If you're experiencing deployment failures with errors like:
- "SQLAlchemy database initialization failed"
- "Missing or invalid DATABASE_URL environment variable"  
- "Crash loop detected"
- "ENCRYPTION_KEY is mandatory for secure operation"

**The app now uses FAIL-FAST semantics in production:**

✅ **Production Detection** - Automatically detects Render or PostgreSQL deployments
✅ **ENCRYPTION_KEY is MANDATORY in production** - App will crash with clear error if missing
✅ **DATABASE_URL is MANDATORY in production** - App will crash with clear error if missing/invalid
✅ **Firebase is optional** - Gracefully falls back to SQLite (development only)
✅ **Development Mode** - Auto-generates ENCRYPTION_KEY and allows DB failures (local dev only)

**IMPORTANT: The app will NOT start in production without these critical secrets configured.**

This is intentional - fail-fast behavior prevents silent data corruption and security issues.

### Minimum Required Secrets for Production
```bash
# 1. Database Connection (CRITICAL)
DATABASE_URL=postgresql://user:password@host:port/database

# 2. Encryption Key (CRITICAL - generate a new one)
ENCRYPTION_KEY=$(python -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())")

# 3. Flask Secret (CRITICAL)
FLASK_SECRET=$(python -c "import secrets; print(secrets.token_hex(32))")

# 4. Admin Credentials (CRITICAL)
ADMIN_USERNAME=admin@lonaat.com
ADMIN_PASSWORD=YourSecurePassword123!
ADMIN_EMAIL=admin@lonaat.com

# 5. Email SMTP (CRITICAL for notifications)
EMAIL_HOST=smtp-relay.sendinblue.com
EMAIL_PORT=587
EMAIL_USER=your-smtp-username
EMAIL_PASS=your-smtp-password
EMAIL_SENDER=Lonaat Support <no-reply@lonaat.com>
```

**Set these in Render Dashboard → Your Service → Environment → Add Environment Variable**

---

## 🚀 Quick Deployment Steps

### 1. Create Render Services

#### A. PostgreSQL Database
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **PostgreSQL**
3. Configure:
   - **Name**: lonaat-db
   - **Database**: lonaat
   - **User**: lonaat
   - **Region**: Oregon (or closest to your users)
   - **Plan**: Starter ($7/month) or Free
4. Click **Create Database**
5. **Copy the External Database URL** - you'll need this for environment variables

#### B. Flask Backend (Web Service)
1. Click **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: lonaat-backend
   - **Environment**: Python 3
   - **Region**: Same as database
   - **Branch**: main
   - **Root Directory**: backend
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 main:app`
4. **Plan**: Starter ($7/month) or Free

#### C. React Frontend (Static Site)
1. Click **New** → **Static Site**
2. Connect your GitHub repository
3. Configure:
   - **Name**: lonaat-frontend
   - **Branch**: main
   - **Root Directory**: frontend
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: dist
4. **Plan**: Free

---

## 🔐 Environment Variables

### Backend Environment Variables (Render Web Service)

Set these in Render Dashboard → lonaat-backend → Environment:

#### Required - Database
```
DATABASE_URL=<paste-your-render-postgresql-url>
```

#### Required - Security
```
FLASK_SECRET=<generate-random-string-min-32-chars>
JWT_SECRET_KEY=<generate-random-string-min-32-chars>
ENCRYPTION_KEY=<your-existing-encryption-key>
```

#### Required - Admin
```
ADMIN_EMAIL=admin@lonaat.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<secure-password>
```

#### Required - Application
```
BASE_URL=https://lonaat-frontend.onrender.com
```

#### Required - Email (SMTP)
Choose one provider:

**Option A: Brevo (SendinBlue) - Recommended**
```
EMAIL_HOST=smtp-relay.sendinblue.com
EMAIL_PORT=587
EMAIL_USER=<your-brevo-email>
EMAIL_PASS=<your-brevo-smtp-key>
EMAIL_SENDER=Lonaat Support <no-reply@lonaat.com>
```

**Option B: Mailgun**
```
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=<your-mailgun-smtp-user>
EMAIL_PASS=<your-mailgun-smtp-password>
EMAIL_SENDER=Lonaat Support <no-reply@lonaat.com>
```

**Option C: SendGrid**
```
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=<your-sendgrid-api-key>
EMAIL_SENDER=Lonaat Support <no-reply@lonaat.com>
```

#### Optional - Affiliate Network APIs

**Amazon Product Advertising API 5.0**
```
AMAZON_ACCESS_KEY=<your-amazon-access-key>
AMAZON_SECRET_KEY=<your-amazon-secret-key>
AMAZON_ASSOC_TAG=<your-amazon-associate-tag>
```

**ShareASale**
```
SHAREASALE_TOKEN=<your-shareasale-token>
SHAREASALE_SECRET=<your-shareasale-secret>
SHAREASALE_AFFILIATE_ID=<your-shareasale-affiliate-id>
```

**CJ Affiliate (Commission Junction)**
```
CJ_TOKEN=<your-cj-personal-access-token>
```

**Impact**
```
IMPACT_TOKEN=<your-impact-auth-token>
IMPACT_ACCOUNT_SID=<your-impact-account-sid>
```

**Additional Networks** (optional)
```
ADMITAD_TOKEN=<your-admitad-token>
AFRIEX_TOKEN=<your-afriex-token>
KALAWEB_API_KEY=<your-kalaweb-key>
PAYSALE_TOKEN=<your-paysale-token>
NALAREF_TOKEN=<your-nalaref-token>
GREY_TOKEN=<your-grey-token>
TRADETRACKER_TOKEN=<your-tradetracker-token>
```

#### Optional - Firebase (if using Firebase features)
```
FIREBASE_SERVICE_ACCOUNT=<your-firebase-service-account-json>
```

---

## 📝 Frontend Environment Variables

Set these in Render Dashboard → lonaat-frontend → Environment:

```
VITE_API_URL=https://lonaat-backend.onrender.com
```

---

## 🗄️ Database Setup

### Automatic Migration (Recommended)

The backend automatically creates all tables on first startup using `db.create_all()`. No manual SQL required!

### Seed Test Users

After deployment, run the seed script to create test accounts:

```bash
# SSH into your Render backend service
# Or run locally pointing to production database

cd backend
python seed.py
```

This creates:
- **Admin**: admin@lonaat.com / Admin123!
- **User 1**: user1@lonaat.com / Test123!
- **User 2**: user2@lonaat.com / Test123!

---

## ✅ Post-Deployment Checklist

### 1. Verify Backend
- [ ] Visit `https://lonaat-backend.onrender.com/`
- [ ] Should see: "Welcome to Lonaat API"
- [ ] Check logs for errors

### 2. Verify Database
- [ ] Backend logs show: "✅ SQLAlchemy database initialized"
- [ ] Check Render PostgreSQL metrics for connections

### 3. Verify Email
- [ ] Register a new test user
- [ ] Check for welcome email
- [ ] Test withdrawal request → should receive email notification

### 4. Verify Frontend
- [ ] Visit `https://lonaat-frontend.onrender.com/`
- [ ] Login with test credentials
- [ ] Browse affiliate products
- [ ] Test withdrawal flow

### 5. Security Check
- [ ] All environment variables set correctly
- [ ] No secrets in code or logs
- [ ] HTTPS enabled (automatic on Render)
- [ ] CORS configured correctly

---

## 🔧 Troubleshooting

### Backend won't start
```
Error: ModuleNotFoundError
→ Solution: Check requirements.txt includes all dependencies
→ Run: pip freeze > requirements.txt
```

```
Error: Database connection failed
→ Solution: Verify DATABASE_URL is correct
→ Check: Render PostgreSQL is in same region as backend
```

### Frontend build fails
```
Error: VITE_API_URL not defined
→ Solution: Set environment variable in Render Static Site settings
```

### Email not sending
```
Warning: EMAIL_ENABLED = False
→ Solution: Verify EMAIL_USER and EMAIL_PASS are set
→ Test: Send test email via SMTP provider dashboard
```

### Database tables missing
```
Error: Table 'users' doesn't exist
→ Solution: Check backend logs for migration errors
→ Verify: db.create_all() ran successfully
→ Manual: python seed.py (creates tables)
```

---

## 🚀 Custom Domain Setup

### Backend Domain
1. Go to Render → lonaat-backend → Settings
2. Scroll to **Custom Domain**
3. Add: api.lonaat.com
4. Update DNS (CNAME): api → lonaat-backend.onrender.com
5. Update `BASE_URL` environment variable

### Frontend Domain
1. Go to Render → lonaat-frontend → Settings
2. Add: lonaat.com or www.lonaat.com
3. Update DNS (CNAME): www → lonaat-frontend.onrender.com
4. Update `VITE_API_URL` to: https://api.lonaat.com

---

## 📊 Monitoring & Maintenance

### Check Logs
```bash
# Backend logs
render tail lonaat-backend

# Database logs
render pg:logs lonaat-db
```

### Database Backups
- Render PostgreSQL: Automatic daily backups (Starter plan)
- Manual backup: Use Render dashboard → Database → Backups

### Scaling
```yaml
# Increase workers for more traffic
Start Command: gunicorn --workers 8 --threads 4 --timeout 120 main:app
```

---

## 🔄 Continuous Deployment

Render automatically deploys when you push to the `main` branch:

```bash
git add .
git commit -m "Update deployment"
git push origin main
```

Render will:
1. Pull latest code
2. Install dependencies
3. Restart services
4. Zero-downtime deployment (Starter plan)

---

## 💰 Cost Estimate

### Minimum Production Setup
- PostgreSQL Starter: $7/month
- Backend Web Service: $7/month
- Frontend Static Site: Free
- **Total: $14/month**

### Recommended Setup
- PostgreSQL Standard: $20/month
- Backend Web Service Starter: $7/month
- Frontend Static Site: Free
- **Total: $27/month**

### Enterprise
- PostgreSQL Pro: $100/month
- Backend Web Service Professional: $25/month
- CDN for frontend: $10/month
- **Total: $135/month**

---

## 📧 Email Provider Costs

**Brevo (SendinBlue)**
- Free: 300 emails/day
- Lite: $25/month (10K emails)

**Mailgun**
- Free: 5,000 emails/month
- Pay-as-you-go: $0.80 per 1K emails

**SendGrid**
- Free: 100 emails/day
- Essentials: $19.95/month (50K emails)

---

## 🔐 Security Best Practices

1. **Never commit secrets** to Git
2. **Rotate keys regularly** (quarterly)
3. **Use strong passwords** (20+ characters)
4. **Enable 2FA** on Render account
5. **Monitor logs** for suspicious activity
6. **Backup database** before major changes
7. **Test in staging** before production deploys

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Lonaat Issues**: GitHub Issues
- **Email**: support@lonaat.com

---

## 🎉 You're Live!

Your Lonaat platform is now running in production with:
- ✅ PostgreSQL database
- ✅ Direct bank transfer withdrawals
- ✅ Email notifications
- ✅ Fraud detection
- ✅ Multiple affiliate networks
- ✅ AI-powered ad generation
- ✅ Secure authentication

Happy affiliate marketing! 🚀
