# 🔧 MTN ENVIRONMENT VARIABLES - SETUP INSTRUCTIONS

## ⚠️ CRITICAL: MTN Credentials Required

The MTN MoMo integration is now configured to load environment variables correctly, but **you need to add your actual MTN credentials** to the `.env` file.

---

## 📍 CURRENT STATUS

✅ **Dotenv Configuration:** Fixed - now loads from correct path  
✅ **Debug Logs:** Added to verify environment variables  
✅ **Server:** Running on port 4000  
⚠️ **MTN Credentials:** EMPTY (need to be added)

---

## 🔐 STEP 1: ADD YOUR MTN CREDENTIALS

**File:** `backend-node/.env`

**Current state (lines 47-50):**
```bash
# MTN MoMo API (Sandbox)
MTN_USER_ID=
MTN_API_KEY=
MTN_SUBSCRIPTION_KEY=
```

**Update to:**
```bash
# MTN MoMo API (Sandbox)
MTN_USER_ID=your-actual-uuid-here
MTN_API_KEY=your-actual-api-key-here
MTN_SUBSCRIPTION_KEY=your-actual-subscription-key-here
```

---

## ⚠️ IMPORTANT: MTN SANDBOX PHONE NUMBERS

**Before testing, understand sandbox limitations:**

### **Sandbox Phone Number Restrictions:**
- ✅ Use test numbers from MTN Developer Portal
- ✅ Use phone numbers from same account region
- ❌ Random phone numbers will NOT work
- ❌ Real customer numbers may fail

### **How to Get Valid Test Numbers:**
1. Check MTN Developer Portal documentation
2. Use your own MTN MoMo number (if in same region)
3. Request test numbers from MTN support
4. Review sandbox environment test data

---

## 🧪 STEP 2: TEST THE ENDPOINT

Once you've added your credentials, test the endpoint:

**Method 1: Browser**
```
http://localhost:4000/api/mtn/test-mtn-token
```

**Method 2: cURL**
```bash
curl http://localhost:4000/api/mtn/test-mtn-token
```

**Method 3: PowerShell**
```powershell
Invoke-WebRequest -Uri "http://localhost:4000/api/mtn/test-mtn-token" | Select-Object -ExpandProperty Content
```

---

## 📊 EXPECTED OUTPUT

### **With Empty Credentials (Current State):**

**Console Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENV CHECK:
CWD: c:\Users\lonaat\lonaat-backend-1\backend-node
MTN_USER_ID: UNDEFINED
MTN_API_KEY: UNDEFINED
MTN_SUBSCRIPTION_KEY: UNDEFINED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ MTN token generation failed: Missing MTN environment variables
```

**API Response:**
```json
{
  "success": false,
  "error": "Missing MTN environment variables"
}
```

### **With Valid Credentials:**

**Console Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENV CHECK:
CWD: c:\Users\lonaat\lonaat-backend-1\backend-node
MTN_USER_ID: abc123-def456-ghi789
MTN_API_KEY: your-api-key-value
MTN_SUBSCRIPTION_KEY: your-subscription-key-value
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 Testing MTN token generation...
✅ MTN token generated successfully
```

**API Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "MTN token generated successfully"
}
```

---

## 🔍 TROUBLESHOOTING

### **Issue 1: Still showing UNDEFINED**

**Cause:** `.env` file not in correct location or credentials not saved

**Fix:**
1. Verify file path: `c:\Users\lonaat\lonaat-backend-1\backend-node\.env`
2. Open `.env` in text editor
3. Add credentials (no quotes needed)
4. Save file
5. Restart server: `npm run dev`

### **Issue 2: Invalid Credentials Error**

**Console Output:**
```
MTN TOKEN ERROR: { error: 'invalid_credentials', ... }
❌ MTN token generation failed: Failed to get MTN token
```

**Fix:**
- Verify your MTN credentials are correct
- Check you're using sandbox credentials for sandbox URL
- Ensure no extra spaces in `.env` values

### **Issue 3: Network Error**

**Console Output:**
```
❌ MTN token generation failed: fetch failed
```

**Fix:**
- Check internet connection
- Verify MTN API is accessible
- Check firewall settings

---

## 📝 HOW TO GET MTN CREDENTIALS

If you don't have MTN credentials yet:

### **1. Register on MTN Developer Portal**
- Go to: https://momodeveloper.mtn.com/
- Sign up for an account
- Verify your email

### **2. Subscribe to Disbursement API**
- Navigate to: Products → Disbursement
- Click "Subscribe"
- Copy your **Subscription Key**

### **3. Create API User (via API)**

**PowerShell:**
```powershell
$uuid = [guid]::NewGuid().ToString()
$headers = @{
    "X-Reference-Id" = $uuid
    "Ocp-Apim-Subscription-Key" = "YOUR_SUBSCRIPTION_KEY"
    "Content-Type" = "application/json"
}
$body = @{
    providerCallbackHost = "webhook.site"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://sandbox.momodeveloper.mtn.com/v1_0/apiuser" -Method POST -Headers $headers -Body $body

Write-Host "Your User ID: $uuid"
```

### **4. Create API Key**

**PowerShell:**
```powershell
$userId = "YOUR_UUID_FROM_STEP_3"
$headers = @{
    "Ocp-Apim-Subscription-Key" = "YOUR_SUBSCRIPTION_KEY"
}

$response = Invoke-RestMethod -Uri "https://sandbox.momodeveloper.mtn.com/v1_0/apiuser/$userId/apikey" -Method POST -Headers $headers

Write-Host "Your API Key: $($response.apiKey)"
```

### **5. Update .env**
```bash
MTN_USER_ID=uuid-from-step-3
MTN_API_KEY=api-key-from-step-4
MTN_SUBSCRIPTION_KEY=subscription-key-from-step-2
```

---

## 🔧 WHAT WAS FIXED

### **1. Explicit Dotenv Configuration**

**File:** `src/index.ts` (lines 1-7)

```typescript
import dotenv from 'dotenv';
import path from 'path';

// FORCE LOAD DOTENV FROM CORRECT PATH
dotenv.config({
  path: path.resolve(__dirname, '../.env')
});
```

**Why:** Ensures `.env` is loaded from the correct location relative to the compiled JavaScript files in `dist/`

### **2. Debug Logging**

**File:** `src/services/mtn.service.ts` (lines 6-13)

```typescript
// DEBUG: Verify environment variables are loaded
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('ENV CHECK:');
console.log('CWD:', process.cwd());
console.log('MTN_USER_ID:', process.env.MTN_USER_ID || 'UNDEFINED');
console.log('MTN_API_KEY:', process.env.MTN_API_KEY || 'UNDEFINED');
console.log('MTN_SUBSCRIPTION_KEY:', process.env.MTN_SUBSCRIPTION_KEY || 'UNDEFINED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
```

**Why:** Helps verify that environment variables are being loaded correctly

---

## ✅ NEXT STEPS

1. **Add MTN credentials to `.env`**
2. **Restart server:** `npm run dev`
3. **Test endpoint:** `http://localhost:4000/api/mtn/test-mtn-token`
4. **Verify debug logs show your credentials (not UNDEFINED)**
5. **Verify you receive a valid token in the response**

---

## 🧹 CLEANUP (After Success)

Once you've verified the endpoint works, you can remove the debug logs:

**File:** `src/services/mtn.service.ts`

Remove lines 6-13 (the console.log debug section)

Keep the dotenv config in `src/index.ts` - it's needed permanently.

---

## 🎯 SUMMARY

**Environment Loading:** ✅ FIXED  
**Debug Logs:** ✅ ADDED  
**Server:** ✅ RUNNING  
**Endpoint:** ✅ REGISTERED at `/api/mtn/test-mtn-token`  
**Credentials:** ⚠️ **YOU NEED TO ADD THEM**

**The system is ready - just add your MTN credentials to `.env` and test!** 🚀
