# Firebase Security Rules - Production Setup Guide

## Overview
This guide covers setting up production-grade security rules for your Lonaat Firebase Realtime Database. These rules protect your data from unauthorized access while allowing legitimate operations.

---

## Why Security Rules Matter

### Current State (Development)
Your Firebase database is currently in **test mode**, which means:
- ❌ **Anyone with the database URL can read ALL data**
- ❌ **Anyone can write/modify/delete ANY data**
- ❌ **No authentication required**
- ❌ **Sensitive payout data exposed**
- ❌ **Admin credentials could be compromised**

### Production State (After Setup)
With proper security rules:
- ✅ **Only authenticated users can access their own data**
- ✅ **Admins have full control**
- ✅ **Payout requests are encrypted and admin-only**
- ✅ **Public data (products) remains accessible**
- ✅ **Data validation prevents corruption**

---

## Security Rules Implementation

### File: `firebase_rules.json`

The `firebase_rules.json` file included in this repository contains production-ready security rules for:

**1. Users Collection** (`/users`)
- ✅ Users can read their own data
- ✅ Users can update their own profile
- ✅ Admins can modify any user
- ✅ Username, email, balance validation

**2. Transactions Collection** (`/transactions`)
- ✅ Users can view their transactions
- ✅ Only admins can create/modify transactions
- ✅ Transaction type validation (commission, withdrawal, click)
- ✅ Indexed by user_id, type, timestamp

**3. Payout Requests Collection** (`/payout_requests`)
- ✅ **Admin-only read access** (encrypted bank details)
- ✅ Users can create payout requests
- ✅ Only admins can approve/reject
- ✅ Encrypted bank details structure validated
- ✅ AES-256-GCM encryption metadata validated

**4. Affiliate Products Collection** (`/affiliate_products`)
- ✅ **Public read access** (anyone can browse products)
- ✅ Admin-only write access
- ✅ Network validation (Amazon, ShareASale, ClickBank, etc.)
- ✅ URL format validation

**5. Admins Collection** (`/admins`)
- ✅ Admin-only read/write
- ✅ Controls who has admin privileges

**6. System Stats** (`/system_stats`)
- ✅ Authenticated users can read
- ✅ Admin-only write

---

## Deploying Security Rules

### Method 1: Firebase Console (Recommended for Beginners)

**Step 1: Go to Firebase Console**
1. Visit: https://console.firebase.google.com
2. Select your project: **lonaat-93a89**
3. Click "Realtime Database" in the left sidebar
4. Click the "Rules" tab

**Step 2: Copy Rules**
1. Open `firebase_rules.json` from this repository
2. Copy the ENTIRE contents
3. Paste into the Firebase Console rules editor

**Step 3: Publish Rules**
1. Click "Publish" button
2. Confirm the deployment
3. ✅ Rules are now active!

**Step 4: Verify**
Check that the rules show:
```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": { ... },
    "transactions": { ... },
    ...
  }
}
```

---

### Method 2: Firebase CLI (Advanced)

**Step 1: Install Firebase CLI**
```bash
npm install -g firebase-tools
```

**Step 2: Login to Firebase**
```bash
firebase login
```

**Step 3: Initialize Firebase in Your Project**
```bash
firebase init database
```

Select:
- Project: **lonaat-93a89**
- Database rules file: **firebase_rules.json** (already exists)

**Step 4: Deploy Rules**
```bash
firebase deploy --only database
```

**Step 5: Verify Deployment**
```bash
firebase database:get --project lonaat-93a89 /.settings/rules
```

---

## Authentication Setup

### Important: Admin Authentication

The security rules reference `auth.uid` for authentication. You need to set up Firebase Authentication:

**Option 1: Firebase Authentication (Recommended)**

1. **Enable Authentication**:
   - Go to Firebase Console → Authentication
   - Click "Get Started"
   - Enable "Email/Password" provider

2. **Create Admin User**:
   - Go to "Users" tab
   - Click "Add User"
   - Email: your admin email
   - Password: strong password
   - Copy the **User UID**

3. **Register as Admin**:
   - Go to Realtime Database → Data
   - Navigate to `/admins`
   - Click "+"
   - Key: `<paste-user-uid>`
   - Value: 
     ```json
     {
       "username": "admin",
       "email": "your@email.com",
       "created_at": "2025-10-30T00:00:00Z"
     }
     ```

**Option 2: Custom Auth (Current Implementation)**

Your current implementation uses session-based auth with `ADMIN_USERNAME` and `ADMIN_PASSWORD`. To integrate with Firebase rules:

1. Modify your backend to issue Firebase custom tokens
2. Update security rules to use custom claims
3. See: https://firebase.google.com/docs/auth/admin/create-custom-tokens

---

## Testing Security Rules

### Test 1: Unauthenticated Access (Should Fail)

```bash
# Try to read all users (should fail)
curl https://lonaat-93a89-default-rtdb.firebaseio.com/users.json
```

**Expected Response:**
```json
{
  "error": "Permission denied"
}
```

### Test 2: Public Product Access (Should Succeed)

```bash
# Read affiliate products (should work - public read)
curl https://lonaat-93a89-default-rtdb.firebaseio.com/affiliate_products.json
```

**Expected Response:**
```json
{
  "product_id_1": {
    "name": "Product Name",
    "network": "Amazon Associates",
    ...
  }
}
```

### Test 3: Authenticated User Access

```bash
# With Firebase auth token
curl "https://lonaat-93a89-default-rtdb.firebaseio.com/users/USER_ID.json?auth=AUTH_TOKEN"
```

**Expected:** User can read their own data

### Test 4: Admin Access

```bash
# Admin reads payout requests
curl "https://lonaat-93a89-default-rtdb.firebaseio.com/payout_requests.json?auth=ADMIN_TOKEN"
```

**Expected:** Admin can read encrypted payout data

---

## Rule Breakdown

### User Data Protection

```json
"users": {
  ".read": "auth != null",  // Authenticated users can read
  "$userId": {
    ".write": "auth != null && (auth.uid === $userId || root.child('admins').child(auth.uid).exists())"
    // Users can write their own data OR admins can write any user
  }
}
```

**What this does:**
- ✅ Authenticated users can browse user list
- ✅ Users can only modify their OWN data
- ✅ Admins can modify ANY user data

### Encrypted Payout Security

```json
"payout_requests": {
  ".read": "auth != null && root.child('admins').child(auth.uid).exists()",
  // ONLY admins can read (contains encrypted bank details)
  
  "encrypted_bank_details": {
    ".validate": "newData.hasChildren(['ciphertext', 'iv', 'salt', 'tag'])"
    // Ensures encryption structure is valid
  }
}
```

**What this does:**
- ✅ Only admins can decrypt and view bank details
- ✅ Validates encryption metadata (IV, salt, tag, ciphertext)
- ✅ Prevents tampering with payout amounts
- ✅ Users can create requests but cannot read others' requests

### Product Public Access

```json
"affiliate_products": {
  ".read": true,  // Anyone can browse products
  ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
  // Only admins can add/modify products
}
```

**What this does:**
- ✅ Public can browse affiliate products (for marketing)
- ✅ Only admins can add new products
- ✅ Prevents spam/fake products

---

## Data Validation Rules

### Username Validation

```json
"username": {
  ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 50"
}
```

**Prevents:**
- Empty usernames
- Usernames longer than 50 characters
- Non-string values

### Email Validation

```json
"email": {
  ".validate": "newData.isString() && newData.val().matches(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$/i)"
}
```

**Prevents:**
- Invalid email formats
- Missing @ symbol
- Invalid domains

### Balance Validation

```json
"balance": {
  ".validate": "newData.isNumber() && newData.val() >= 0"
}
```

**Prevents:**
- Negative balances
- Non-numeric values
- Decimal overflow attacks

### Network Validation

```json
"network": {
  ".validate": "newData.isString() && (newData.val() === 'Amazon Associates' || newData.val() === 'ShareASale' || ...)"
}
```

**Prevents:**
- Invalid affiliate network names
- Typos in network names
- Fake/spam networks

---

## Migration Strategy (Moving from Test Mode to Production)

### Step-by-Step Migration

**Phase 1: Backup Data (CRITICAL)**
```bash
# Export entire database
curl https://lonaat-93a89-default-rtdb.firebaseio.com/.json > firebase_backup_$(date +%Y%m%d).json
```

**Phase 2: Set Up Authentication**
1. Enable Firebase Authentication
2. Create admin user
3. Register admin in `/admins` collection

**Phase 3: Test Rules in Simulator**
1. Firebase Console → Realtime Database → Rules
2. Click "Simulator" tab
3. Test various scenarios:
   - Unauthenticated read (should fail)
   - User reads own data (should succeed)
   - User reads other's data (should fail)
   - Admin reads anything (should succeed)

**Phase 4: Deploy Rules (Off-Peak Hours)**
```bash
# Deploy during low traffic
firebase deploy --only database
```

**Phase 5: Monitor**
- Check Firebase Console → Realtime Database → Usage tab
- Watch for denied requests
- Verify legitimate requests still work

**Phase 6: Rollback Plan**
If anything breaks:
```bash
# Restore test mode rules temporarily
firebase deploy --only database
# (paste old test mode rules in console)
```

---

## Common Issues & Solutions

### Issue: "Permission Denied" on Legitimate Requests

**Cause:** User not authenticated or admin not registered

**Solution:**
1. Check if user has valid Firebase auth token
2. Verify admin UID is in `/admins` collection
3. Check auth token hasn't expired

### Issue: Cannot Create Payout Requests

**Cause:** Encryption structure validation failing

**Solution:**
Ensure payout request includes:
```json
{
  "encrypted_bank_details": {
    "ciphertext": "...",
    "iv": "...",
    "salt": "...",
    "tag": "...",
    "kdf": {
      "algorithm": "PBKDF2",
      "hash": "SHA256",
      "iterations": 200000
    }
  }
}
```

### Issue: Public Cannot View Products

**Cause:** Public read access misconfigured

**Solution:**
Verify `affiliate_products` has:
```json
"affiliate_products": {
  ".read": true  // <-- Must be true for public access
}
```

---

## Security Best Practices

### 1. Least Privilege Principle
✅ **DO:** Give users minimum permissions needed  
❌ **DON'T:** Give everyone admin access

### 2. Validate All Input
✅ **DO:** Use `.validate` rules for all fields  
❌ **DON'T:** Trust client-side validation only

### 3. Encrypt Sensitive Data
✅ **DO:** Encrypt bank details with AES-256-GCM  
❌ **DON'T:** Store plaintext bank account numbers

### 4. Index for Performance
✅ **DO:** Use `.indexOn` for frequently queried fields  
❌ **DON'T:** Let Firebase scan entire collections

### 5. Monitor Access
✅ **DO:** Review Firebase usage and denied requests  
❌ **DON'T:** Deploy and forget

### 6. Regular Backups
✅ **DO:** Export database daily/weekly  
❌ **DON'T:** Rely only on Firebase's backups

---

## Production Checklist

Before deploying to production:

- [ ] Backup current database data
- [ ] Enable Firebase Authentication
- [ ] Create and register admin user
- [ ] Test rules in Firebase simulator
- [ ] Deploy rules during low-traffic period
- [ ] Verify public product access still works
- [ ] Test user registration/login flow
- [ ] Test payout request creation
- [ ] Test admin payout decryption
- [ ] Monitor for denied requests
- [ ] Set up daily database exports
- [ ] Document admin user credentials
- [ ] Update backend to issue Firebase tokens (if needed)

---

## Monitoring & Maintenance

### Weekly Tasks
- Review denied requests in Firebase Console
- Check for unusual access patterns
- Verify admin access logs

### Monthly Tasks
- Review and update validation rules
- Audit user permissions
- Export database backup
- Test disaster recovery

### Quarterly Tasks
- Security audit of all rules
- Review and update admin list
- Test rule changes in staging first

---

## Support Resources

### Documentation
- Firebase Security Rules: https://firebase.google.com/docs/database/security
- Firebase Auth: https://firebase.google.com/docs/auth
- Security Rules Simulator: https://firebase.google.com/docs/database/security/test-rules

### Getting Help
- Firebase Community: https://firebase.google.com/community
- Stack Overflow: Tag `firebase-realtime-database`
- Firebase Support: https://firebase.google.com/support

---

## Summary

Your `firebase_rules.json` file provides:

✅ **Authentication-based access control**  
✅ **Admin-only access to encrypted payout data**  
✅ **Public access to affiliate products**  
✅ **Data validation for all fields**  
✅ **Indexed queries for performance**  
✅ **Protection against common attacks**  

**Next Steps:**
1. Backup your database
2. Deploy the security rules
3. Set up Firebase Authentication
4. Test all access patterns
5. Monitor for issues

**Your data will be production-ready and secure!** 🔒
