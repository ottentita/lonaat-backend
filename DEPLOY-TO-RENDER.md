# 🚀 QUICK START: DEPLOY TO RENDER

**Time to deploy**: ~10 minutes  
**Cost**: FREE (Render free tier)

---

## ✅ PRE-FLIGHT CHECK

Your system is ready:
- ✅ 8/8 stress tests passing
- ✅ Manual products mode enabled
- ✅ Auto-import disabled
- ✅ Database schema ready
- ✅ `render.yaml` configured

---

## 🎯 DEPLOYMENT STEPS

### **STEP 1: Push to GitHub** (5 minutes)

```bash
# Navigate to backend directory
cd c:\Users\lonaat\lonaat-backend-1\backend-node

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Production ready - Manual products mode enabled"

# Create GitHub repository
# Go to https://github.com/new
# Repository name: lonaat-backend
# Make it Private
# Don't initialize with README

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/lonaat-backend.git
git branch -M main
git push -u origin main
```

---

### **STEP 2: Create Render Account** (2 minutes)

1. Go to https://render.com
2. Click **"Get Started"**
3. Sign up with **GitHub**
4. Authorize Render to access your repositories

---

### **STEP 3: Create PostgreSQL Database** (2 minutes)

1. In Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `lonaat-db`
   - **Database**: `lonaat`
   - **Region**: **Oregon** (or closest to you)
   - **PostgreSQL Version**: 15
   - **Plan**: **Free**
3. Click **"Create Database"**
4. Wait for status to show **"Available"** (~2 minutes)
5. Click on the database → **"Info"** tab
6. **COPY** the **Internal Database URL** (you'll need this)

---

### **STEP 4: Deploy Web Service** (3 minutes)

1. Click **"New +"** → **"Web Service"**
2. Click **"Build and deploy from a Git repository"**
3. Select your **lonaat-backend** repository
4. Configure:

**Basic Settings**:
- **Name**: `lonaat-backend`
- **Region**: **Oregon** (same as database)
- **Branch**: `main`
- **Root Directory**: (leave blank)
- **Environment**: **Node**
- **Build Command**: 
  ```
  npm install
  ```
- **Start Command**: 
  ```
  npm start
  ```

**Plan**:
- Select **Free**

5. Click **"Advanced"** to add environment variables

---

### **STEP 5: Add Environment Variables** (3 minutes)

Click **"Add Environment Variable"** for each:

```
NODE_ENV=production
MANUAL_PRODUCTS_ONLY=true
PORT=4000
```

**Database URL** (paste the Internal Database URL from Step 3):
```
DATABASE_URL=postgresql://lonaat_user:password@dpg-xxxxx-a.oregon-postgres.render.com/lonaat_db
```

**Generate Secrets** (run these commands on your computer):
```bash
# Generate WEBHOOK_SECRET
openssl rand -base64 48

# Generate JWT_SECRET  
openssl rand -base64 64
```

Add the generated values:
```
WEBHOOK_SECRET=<paste generated secret>
JWT_SECRET=<paste generated secret>
SYSTEM_SECRET=sys_lonaat_internal_2026_secure_key_9f8e7d6c5b4a3
```

**Optional** (add if you have them):
```
OPENAI_API_KEY=<your key>
MTN_MOMO_SUBSCRIPTION_KEY=<your key>
```

6. Click **"Create Web Service"**

---

### **STEP 6: Push Database Schema (AFTER FIRST DEPLOY)**

**⚠️ CRITICAL**: Run this ONCE after service is deployed

1. Go to Render Dashboard → Your Service → **Shell** tab
2. Run:
   ```bash
   npx prisma db push
   ```
3. Verify: `✔ Database schema pushed successfully`

**Why not in build command?**
- ✅ Prevents accidental schema overwrites
- ✅ Avoids data loss on redeployments  
- ✅ Prevents failed deploy loops
- ✅ You control when schema changes

---

### **STEP 7: Monitor Deployment** (2-3 minutes)

Watch the deployment logs:
1. You'll see:
   ```
   ==> Installing dependencies
   ==> Running build command
   ==> Starting server
   ```

2. Wait for:
   ```
   ==> Your service is live 🎉
   ```

3. You'll get a URL like:
   ```
   https://lonaat-backend.onrender.com
   ```

---

### **STEP 8: Verify Deployment** (2 minutes)

**Test 1: Health Check**
```bash
curl https://lonaat-backend.onrender.com/api/health
```

Expected:
```json
{"status":"ok","timestamp":"..."}
```

**Test 2: Check Logs**

In Render Dashboard → Your Service → **Logs** tab

Look for:
```
🚫 PRODUCT SYNC DISABLED
🚫 AUTO PRODUCT IMPORT DISABLED
📝 Mode: MANUAL_PRODUCTS_ONLY=true
🚀 SERVER RUNNING ON PORT 4000
✅ Database connected
```

---

## 🎉 YOU'RE LIVE!

Your backend is now deployed at:
```
https://lonaat-backend.onrender.com
```

---

## 🔥 NEXT STEPS

### **1. Add Your First Product**

Connect to production database:
```bash
# Get External Database URL from Render Dashboard
# Database → Connection → External Database URL

psql "postgresql://user:pass@host/lonaat"
```

Add product:
```sql
INSERT INTO products (
  name, price, "affiliateLink", "isActive", "isApproved",
  description, "imageUrl"
) VALUES (
  'Crypto Trading Masterclass',
  15000,
  'https://clickbank.net/your-affiliate-link',
  true,
  true,
  'Learn professional crypto trading from experts',
  'https://via.placeholder.com/300'
) RETURNING id;
```

### **2. Test Conversion**

```bash
curl -X POST https://lonaat-backend.onrender.com/api/conversion/webhook-v2 \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "reference": "first_test",
    "amount": 10000,
    "userId": 1,
    "productId": 1
  }'
```

### **3. Generate AI Ad**

```bash
curl -X POST https://lonaat-backend.onrender.com/api/ai/generate-ad/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **4. Start Marketing**

- Add 10-20 quality products
- Generate AI ads for each
- Post to WhatsApp, Facebook, TikTok
- Monitor conversions!

---

## 📊 MONITORING

**View Logs**:
- Render Dashboard → Your Service → **Logs**

**Check Database**:
```sql
-- Total conversions
SELECT COUNT(*) FROM "Conversion";

-- Today's revenue
SELECT SUM(amount) FROM "Conversion" 
WHERE "createdAt" >= CURRENT_DATE;
```

**Metrics**:
- Render Dashboard → Your Service → **Metrics**
- Monitor CPU, Memory, Requests

---

## 🔧 TROUBLESHOOTING

**Service won't start?**
- Check environment variables are set
- Verify DATABASE_URL is correct (use Internal URL)
- Check logs for specific errors

**Database connection failed?**
- Ensure database is in same region as service
- Use Internal Database URL, not External
- Verify database is "Available" status

**Build failed?**
- Check `package.json` has all dependencies
- Verify build command is correct
- Check logs for missing packages

---

## 💰 FREE TIER LIMITS

- **Web Service**: 750 hours/month (enough for 24/7)
- **Database**: 1 GB storage
- **Bandwidth**: 100 GB/month
- **Sleeps after 15 min inactivity** (first request takes ~30s)

**Tip**: Upgrade to paid plan ($7/month) to prevent sleep

---

## 🎯 SUCCESS!

You now have:
- ✅ Backend deployed on Render
- ✅ PostgreSQL database provisioned
- ✅ Auto-deploy from GitHub enabled
- ✅ Manual products mode active
- ✅ Production-ready system

**Start making money!** 🚀💰
