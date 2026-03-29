# ⚠️ MTN SANDBOX TESTING GUIDE

## CRITICAL: Phone Number Restrictions

MTN Sandbox environment has **LIMITED** test phone numbers. You cannot use random phone numbers for testing.

---

## 🚫 SANDBOX LIMITATIONS

### **What DOESN'T Work:**
- ❌ Random phone numbers (e.g., `237600000000`)
- ❌ Fake/generated numbers
- ❌ Real customer numbers (may fail in sandbox)
- ❌ Numbers from different regions/countries

### **What DOES Work:**
- ✅ Test numbers from MTN Developer Portal documentation
- ✅ Your own MTN MoMo number (if in same region as sandbox)
- ✅ Numbers provided by MTN support for testing
- ✅ Numbers specific to your sandbox environment

---

## 📋 HOW TO GET TEST NUMBERS

### **Method 1: MTN Developer Portal**
1. Go to https://momodeveloper.mtn.com/
2. Navigate to **Products** → **Disbursement**
3. Click on **Documentation** or **API Reference**
4. Look for **Test Data** or **Sandbox Testing** section
5. Copy the test phone numbers provided

### **Method 2: Your Own Number**
If you have an MTN MoMo account in Cameroon:
- Use your own phone number: `237XXXXXXXXX`
- This works if your number is in the same region as your sandbox

### **Method 3: MTN Support**
1. Contact MTN Developer Support
2. Request test phone numbers for your sandbox environment
3. Specify you need numbers for Cameroon (237)

### **Method 4: Sandbox Documentation**
- Check your sandbox environment dashboard
- Look for "Test Data" or "Sample Requests"
- Use the phone numbers listed there

---

## 🧪 TESTING WORKFLOW

### **Step 1: Get Valid Test Number**
```
Option A: From MTN docs (e.g., 237670000001)
Option B: Your own MTN number (e.g., 237670123456)
Option C: From MTN support
```

### **Step 2: Test Token Generation**
```bash
curl http://localhost:4000/api/mtn/test-mtn-token
```

**Expected:** Valid token returned

### **Step 3: Test Payment with Valid Number**
```bash
curl -X POST http://localhost:4000/api/mtn/test-payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "100",
    "phone": "237670000001"
  }'
```

**Replace `237670000001` with your actual test number!**

### **Step 4: Verify Response**
```json
{
  "success": true,
  "referenceId": "abc-123-def-456",
  "message": "MTN payment sent successfully"
}
```

---

## ❌ COMMON ERRORS

### **Error 1: Invalid Phone Number**
```json
{
  "error": "Invalid phone number"
}
```

**Cause:** Phone number not registered in sandbox  
**Fix:** Use a valid test number from MTN docs

### **Error 2: Account Not Found**
```json
{
  "error": "Account not found"
}
```

**Cause:** Phone number doesn't exist in sandbox environment  
**Fix:** Use test numbers provided by MTN

### **Error 3: Forbidden**
```json
{
  "error": "Forbidden"
}
```

**Cause:** Number not allowed in your sandbox  
**Fix:** Contact MTN support for valid test numbers

---

## 🌍 REGION-SPECIFIC TESTING

### **Cameroon (237)**
- Use Cameroon MTN test numbers
- Format: `237XXXXXXXXX`
- Must be MTN Cameroon numbers

### **Other Regions**
If testing for other countries:
- Use test numbers for that specific country
- Check MTN documentation for that region
- Ensure your sandbox supports that country

---

## 🔄 SANDBOX VS PRODUCTION

### **Sandbox Environment:**
- ✅ Limited test phone numbers
- ✅ No real money transferred
- ✅ Instant responses
- ❌ Cannot use any phone number

### **Production Environment:**
- ✅ Any valid MTN MoMo number works
- ✅ Real money transferred
- ✅ Real-time processing
- ⚠️ Requires production credentials

---

## 📞 EXAMPLE TEST NUMBERS

**Note:** These are examples - verify with MTN documentation!

### **Possible Test Format:**
```
237670000001  (Test number 1)
237670000002  (Test number 2)
237680000001  (Test number 3)
```

**⚠️ IMPORTANT:** These are just examples! You MUST get actual test numbers from:
- MTN Developer Portal documentation
- Your sandbox environment
- MTN support team

---

## ✅ TESTING CHECKLIST

Before testing withdrawals:

- [ ] MTN credentials added to `.env`
- [ ] Token generation endpoint tested and working
- [ ] Valid test phone number obtained from MTN
- [ ] Test number verified in sandbox documentation
- [ ] Payment endpoint tested with valid number
- [ ] Error handling tested with invalid number
- [ ] Withdrawal endpoint tested with valid number

---

## 🎯 RECOMMENDED TESTING APPROACH

### **Phase 1: Token Testing**
```bash
# Test token generation
GET /api/mtn/test-mtn-token

# Verify token is returned
```

### **Phase 2: Payment Testing**
```bash
# Test with VALID test number from MTN docs
POST /api/mtn/test-payment
{
  "amount": "100",
  "phone": "YOUR_VALID_TEST_NUMBER"
}

# Verify success response
```

### **Phase 3: Withdrawal Testing**
```bash
# Test full withdrawal flow
POST /api/withdrawals/withdraw
Headers: Authorization: Bearer YOUR_JWT_TOKEN
{
  "amount": "100",
  "phone": "YOUR_VALID_TEST_NUMBER"
}

# Verify:
# - Payment sent
# - Wallet balance updated
# - Withdrawal record created
```

---

## 📖 ADDITIONAL RESOURCES

### **MTN Developer Portal:**
- https://momodeveloper.mtn.com/

### **Documentation:**
- API Reference
- Sandbox Testing Guide
- Test Data Section

### **Support:**
- MTN Developer Support
- Community Forums
- Technical Documentation

---

## 🎯 FINAL NOTES

**Remember:**
1. ✅ Sandbox has LIMITED phone numbers
2. ✅ Get test numbers from MTN documentation
3. ✅ Use your own number if in same region
4. ✅ Contact MTN support if needed
5. ❌ Don't use random/fake numbers
6. ❌ Don't expect all real numbers to work

**Production will work with ANY valid MTN MoMo number!**

This restriction is ONLY for sandbox testing. 🚀
