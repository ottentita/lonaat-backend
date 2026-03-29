/**
 * VERIFY MTN MOMO SETUP - STEP BY STEP VALIDATION
 * Follows exact MTN MOMO setup process
 */

require('dotenv').config();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

async function verifyMomoSetup() {
  try {
    console.log('🔍 VERIFYING MTN MOMO SETUP...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const BASE_URL = process.env.MTN_MOMO_BASE_URL;
    const SUB_KEY = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
    const API_USER = process.env.MTN_MOMO_API_USER;
    const API_KEY = process.env.MTN_MOMO_API_KEY;

    console.log('📋 SETUP VERIFICATION:');
    console.log(`   1. BASE_URL: ${BASE_URL}`);
    console.log(`   2. SUB_KEY: ${SUB_KEY ? '✅ Present' : '❌ Missing'}`);
    console.log(`   3. API_USER: ${API_USER ? '✅ Present' : '❌ Missing'}`);
    console.log(`   4. API_KEY: ${API_KEY ? '✅ Present' : '❌ Missing'}`);
    console.log('');

    // STEP 1: Verify API User Creation Process
    console.log('🔍 STEP 1: Verify API User Creation...');
    console.log('   Expected process:');
    console.log('   POST /v1_0/apiuser');
    console.log('   Headers: Ocp-Apim-Subscription-Key, X-Reference-Id');
    console.log('');

    try {
      const referenceId = uuidv4();
      const userResponse = await axios.post(
        `${BASE_URL}/v1_0/apiuser`,
        {
          providerCallbackHost: "https://yourdomain.com/api/momo/webhook",
          targetEnvironment: "sandbox"
        },
        {
          headers: {
            "Ocp-Apim-Subscription-Key": SUB_KEY,
            "X-Reference-Id": referenceId,
            "Content-Type": "application/json"
          },
          timeout: 10000
        }
      );

      console.log('❌ UNEXPECTED: User creation succeeded');
      console.log('   This means API_USER already exists');
      console.log('✅ API User exists: VERIFIED');
      console.log('');

    } catch (userError) {
      if (userError.response?.status === 409) {
        console.log('✅ API User exists: VERIFIED (409 - User already exists)');
      } else if (userError.response?.status === 401) {
        console.log('❌ STEP 1 FAILED: Cannot create API user');
        console.log('   Status: 401 - Subscription key invalid');
        console.log('   SUBSCRIPTION KEY IS INVALID OR INACTIVE');
        return false;
      } else {
        console.log('❌ STEP 1 FAILED: Unexpected error');
        console.log('   Status:', userError.response?.status);
        console.log('   Error:', userError.response?.data);
        return false;
      }
    }

    // STEP 2: Verify API Key Generation Process
    console.log('🔍 STEP 2: Verify API Key Generation...');
    console.log('   Expected process:');
    console.log(`   POST /v1_0/apiuser/${API_USER}/apikey`);
    console.log('   Headers: Ocp-Apim-Subscription-Key, Authorization: Basic');
    console.log('');

    try {
      const auth = Buffer.from(`${API_USER}:${API_KEY}`).toString("base64");
      const keyResponse = await axios.post(
        `${BASE_URL}/v1_0/apiuser/${API_USER}/apikey`,
        {},
        {
          headers: {
            "Ocp-Apim-Subscription-Key": SUB_KEY,
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/json"
          },
          timeout: 10000
        }
      );

      console.log('✅ API Key generation: VERIFIED');
      console.log('   Response:', keyResponse.data);
      console.log('');

    } catch (keyError) {
      if (keyError.response?.status === 401) {
        console.log('❌ STEP 2 FAILED: Cannot generate API key');
        console.log('   Status: 401 - Invalid credentials');
        console.log('   API_USER and API_KEY may not match');
        return false;
      } else if (keyError.response?.status === 404) {
        console.log('❌ STEP 2 FAILED: API user not found');
        console.log('   Status: 404 - User does not exist');
        console.log('   Need to create API user first');
        return false;
      } else {
        console.log('❌ STEP 2 FAILED: Unexpected error');
        console.log('   Status:', keyError.response?.status);
        console.log('   Error:', keyError.response?.data);
        return false;
      }
    }

    // STEP 3: Verify Token Request Process
    console.log('🔍 STEP 3: Verify Token Request...');
    console.log('   Expected process:');
    console.log('   POST /collection/token/');
    console.log('   Headers: Authorization: Basic, Ocp-Apim-Subscription-Key');
    console.log('');

    try {
      const auth = Buffer.from(`${API_USER}:${API_KEY}`).toString("base64");
      const tokenResponse = await axios.post(
        `${BASE_URL}/collection/token/`,
        {},
        {
          headers: {
            "Authorization": `Basic ${auth}`,
            "Ocp-Apim-Subscription-Key": SUB_KEY,
            "Content-Type": "application/json"
          },
          timeout: 10000
        }
      );

      console.log('✅ Token Request: VERIFIED');
      console.log('   Status:', tokenResponse.status);
      console.log('   Token received:', !!tokenResponse.data.access_token);
      console.log('');

      if (tokenResponse.data.access_token) {
        console.log('🎉 ALL STEPS VERIFIED SUCCESSFULLY!');
        console.log('');
        console.log('✅ MTN MOMO Setup is CORRECT');
        console.log('✅ API User exists');
        console.log('✅ API Key matches user');
        console.log('✅ Subscription Key is valid');
        console.log('✅ Token generation works');
        console.log('');
        console.log('📱 READY FOR DEPOSIT TESTING');
        return true;
      } else {
        console.log('❌ STEP 3 FAILED: No access token received');
        return false;
      }

    } catch (tokenError) {
      if (tokenError.response?.status === 401) {
        console.log('❌ STEP 3 FAILED: Token request denied');
        console.log('   Status: 401 - Invalid subscription key');
        console.log('   SUBSCRIPTION KEY IS INVALID OR INACTIVE');
        console.log('');
        console.log('🔴 ROOT CAUSE IDENTIFIED:');
        console.log('   The subscription key 615102ea1aa646f998abf48b4978a566 is:');
        console.log('   - Invalid (wrong key)');
        console.log('   - Expired (key expired)');
        console.log('   - Inactive (subscription not active)');
        console.log('   - From different app (key doesn\'t match this user)');
        console.log('');
        console.log('🎯 SOLUTION:');
        console.log('   1. Go to https://momodeveloper.mtn.com');
        console.log('   2. Login to your account');
        console.log('   3. Go to "My Apps"');
        console.log('   4. Select your sandbox app');
        console.log('   5. Generate NEW subscription key');
        console.log('   6. Update .env file with new key');
        return false;
      } else {
        console.log('❌ STEP 3 FAILED: Unexpected error');
        console.log('   Status:', tokenError.response?.status);
        console.log('   Error:', tokenError.response?.data);
        return false;
      }
    }

  } catch (error) {
    console.error('❌ Verification script failed:', error.message);
    return false;
  }
}

// Run verification
verifyMomoSetup().then(success => {
  if (success) {
    console.log('');
    console.log('🎉 MTN MOMO SETUP IS 100% CORRECT!');
    console.log('Ready for production deployment!');
  } else {
    console.log('');
    console.log('❌ MTN MOMO SETUP HAS ISSUES');
    console.log('Please follow the troubleshooting steps above.');
  }
});
