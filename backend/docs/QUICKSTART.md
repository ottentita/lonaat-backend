# Lonaat Backend - Quick Start Guide

## 🚀 Fast Track to Production (5 Minutes)

This guide gets you from local development to production deployment in 5 simple steps.

---

## Prerequisites

✅ Python 3.11+ installed  
✅ Git installed  
✅ GitHub account  
✅ Render.com account (free tier works!)  
✅ Firebase project created  

---

## Step 1: Update Encryption Key (Important!)

Generate a new properly formatted encryption key:

```bash
python -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
```

**Example output:** `JrUPzlTsA9CRzu5jwdhPzqKBj2o4n-rgqBrGKTZbUYU=`

**In Replit:**
1. Click the "Secrets" tab (🔒 icon)
2. Find `ENCRYPTION_KEY`
3. Replace with your newly generated key
4. Click "Save"

**⚠️ CRITICAL:** Save this key somewhere safe! If lost, encrypted payout data cannot be recovered.

---

## Step 2: Verify Everything Works

Run the pre-deployment verification:

```bash
python verify_deployment.py
```

**Expected output:**
```
✅ All checks passed! Ready to deploy.
Success Rate: 100%
```

If you see any failures, review and fix them before proceeding.

---

## Step 3: Set Up GitHub Repository

Run the interactive setup script:

```bash
./setup_github.sh
```

This will:
1. ✅ Initialize git repository
2. ✅ Check for security issues
3. ✅ Create initial commit
4. ✅ Guide you through GitHub setup
5. ✅ Push code to GitHub

**Option 1: Already have a GitHub repo**
- Enter your repository URL when prompted
- Script will push automatically

**Option 2: Need to create a repo**
- Script will show you exact steps
- Create repo at: https://github.com/new
- Run script again to push

---

## Step 4: Deploy to Render

### Automated Deployment (Recommended)

1. **Go to Render.com**
   - Visit: https://render.com
   - Sign in or create account

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render auto-detects `render.yaml`

3. **Add Environment Variables**
   
   Copy these from your Replit Secrets:
   
   | Variable | Where to Find |
   |----------|--------------|
   | `ADMIN_USERNAME` | Replit Secrets |
   | `ADMIN_PASSWORD` | Replit Secrets |
   | `ENCRYPTION_KEY` | **Use the NEW key from Step 1** |
   | `FIREBASE_SERVICE_ACCOUNT` | Replit Secrets (entire JSON) |
   | `FIREBASE_DATABASE_URL` | `https://lonaat-93a89-default-rtdb.firebaseio.com` |

4. **Deploy**
   - Click "Create Web Service"
   - Wait 2-3 minutes for deployment
   - Your app will be live at: `https://your-app.onrender.com`

---

## Step 5: Deploy Firebase Security Rules

Your database is currently in **test mode** (insecure). Deploy production rules:

### Method 1: Firebase Console (Easy)

1. Go to: https://console.firebase.google.com
2. Select project: **lonaat-93a89**
3. Click "Realtime Database" → "Rules" tab
4. Copy contents of `firebase_rules.json`
5. Paste into console
6. Click "Publish"

### Method 2: Firebase CLI (Advanced)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize (select existing firebase_rules.json)
firebase init database

# Deploy
firebase deploy --only database
```

---

## ✅ Verification Checklist

After deployment, verify everything works:

### 1. Test Your Deployed App

```bash
# Replace YOUR-APP-URL with your Render URL
curl https://YOUR-APP-URL.onrender.com/
```

**Expected:** Homepage HTML returned

### 2. Test Admin Login

```bash
curl -X POST https://YOUR-APP-URL.onrender.com/admin_login \
  -H "Content-Type: application/json" \
  -d '{"username":"YOUR_ADMIN_USERNAME","password":"YOUR_ADMIN_PASSWORD"}'
```

**Expected:** `{"success": true}`

### 3. Check Render Logs

1. Go to Render dashboard → Your service
2. Click "Logs" tab
3. Look for: `✅ Firebase initialized successfully!`

### 4. Test Firebase Connection

Visit: `https://YOUR-APP-URL.onrender.com/api/networks/all/products`

**Expected:** JSON list of affiliate products

---

## 🎯 What You've Achieved

✅ **Secure Production Deployment**
- AES-256-GCM encrypted payout system
- Production-grade Gunicorn server
- Enterprise security headers
- Hardened Firebase security rules

✅ **Multi-Network Affiliate Integration**
- Amazon Associates
- ShareASale
- ClickBank
- PartnerStack
- Digistore24

✅ **AI-Powered Features**
- OpenAI GPT product descriptions
- Automated ad copy generation
- One-click product sync with AI ads

✅ **Professional Infrastructure**
- Git version control
- Automated deployment pipeline
- Comprehensive documentation
- Pre-deployment verification

---

## 📊 Performance & Costs

### Render Free Tier
- ✅ 750 hours/month (enough for 24/7)
- ✅ Auto-sleep after 15min inactivity
- ✅ SSL certificate included
- **Cost: $0/month**

### Firebase Free Tier
- ✅ 1 GB data storage
- ✅ 10 GB/month download
- ✅ 100 simultaneous connections
- **Typical cost: $0-5/month**

### OpenAI API
- GPT-4: ~$0.03 per 1K tokens
- **Estimated: $5-20/month** (usage-based)

**Total Monthly Cost:** $5-25/month for small to medium scale

---

## 🔧 Common Issues & Quick Fixes

### Issue: "Permission Denied" on Render

**Cause:** Environment variables not set correctly

**Fix:**
1. Go to Render dashboard → Your service → Environment
2. Verify all variables are present
3. Click "Manual Deploy" to redeploy

### Issue: "Firebase initialization failed"

**Cause:** `FIREBASE_SERVICE_ACCOUNT` format issue

**Fix:**
```bash
# Verify it's valid JSON
echo $FIREBASE_SERVICE_ACCOUNT | python -m json.tool
```

Ensure it's the **entire JSON** from Firebase Console, not just parts.

### Issue: "Encryption key is mandatory"

**Cause:** `ENCRYPTION_KEY` not set in Render

**Fix:**
1. Generate new key (see Step 1)
2. Add to Render environment variables
3. Redeploy

### Issue: App sleeps on free tier

**Expected behavior:** Render free tier sleeps after 15min

**Fix (optional):**
- Upgrade to Render Starter ($7/month) for always-on
- Or: Use a cron job to ping your app every 10 minutes

---

## 📖 Next Steps

### Immediate Actions
- [ ] Update `ENCRYPTION_KEY` with properly formatted key
- [ ] Run `python verify_deployment.py` (should be 100%)
- [ ] Deploy Firebase security rules (currently in test mode)
- [ ] Test all critical endpoints on production

### Optional Enhancements
- [ ] Set up custom domain on Render
- [ ] Configure email notifications for payouts
- [ ] Add more affiliate networks
- [ ] Implement analytics dashboard
- [ ] Set up monitoring/alerts

### Documentation
- **Full Deployment Guide:** See `DEPLOYMENT.md`
- **Firebase Security:** See `FIREBASE_SETUP.md`
- **Encryption Details:** See `ENCRYPTION_SECURITY.md`
- **API Documentation:** See `README.md`

---

## 🆘 Need Help?

### Pre-Deployment Issues
```bash
# Run verification
python verify_deployment.py

# Test locally with Gunicorn
./test_deployment.sh
```

### Production Issues
1. Check Render logs
2. Verify environment variables
3. Test Firebase connection
4. Review security rules

### Resources
- **Render Docs:** https://render.com/docs
- **Firebase Docs:** https://firebase.google.com/docs/database
- **Project Issues:** GitHub Issues tab

---

## 🎉 Congratulations!

Your Lonaat backend is now:
- ✅ Deployed to production
- ✅ Secured with encryption
- ✅ Protected with Firebase rules
- ✅ Running on professional infrastructure
- ✅ Ready to handle affiliate marketing at scale

**Your app is live at:** `https://your-app.onrender.com`

**Next:** Start adding users, syncing affiliate products, and generating AI-powered ads!

---

**Made with ❤️ for affiliate marketers worldwide** 🚀
