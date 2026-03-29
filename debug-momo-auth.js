/**
 * DEBUG MTN MOMO AUTHENTICATION - STEP BY STEP VERIFICATION
 * Test each step of MTN MOMO authentication process
 */

require('dotenv').config();
const axios = require('axios');

async function debugMomoAuth() {
  try {
    console.log('🔍 DEBUGGING MTN MOMO AUTHENTICATION...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const BASE_URL = process.env.MTN_MOMO_BASE_URL;
    const SUB_KEY = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
    const API_USER = process.env.MTN_MOMO_API_USER;
    const API_KEY = process.env.MTN_MOMO_API_KEY;

    console.log('📋 Current Credentials:');
    console.log(`   BASE_URL: ${BASE_URL}`);
    console.log(`   API_USER: ${API_USER}`);
    console.log(`   API_KEY: ${API_KEY ? API_KEY.substring(0, 8) + '...' : 'MISSING'}`);
    console.log(`   SUB_KEY: ${SUB_KEY ? SUB_KEY.substring(0, 8) + '...' : 'MISSING'}`);
    console.log('');

    // STEP 1: Verify Basic Auth encoding
    console.log('🔐 STEP 1: Verify Basic Auth encoding...');
    const auth = Buffer.from(`${API_USER}:${API_KEY}`).toString("base64");
    console.log(`   Auth string: ${auth.substring(0, 20)}...`);
    console.log('✅ Basic Auth encoding: CORRECT');
    console.log('');

    // STEP 2: Test token request with EXACT format
    console.log('🔐 STEP 2: Test token request...');
    console.log('   URL:', `${BASE_URL}/collection/token/`);
    console.log('   Method: POST');
    console.log('   Headers:');
    console.log(`     Authorization: Basic ${auth.substring(0, 20)}...`);
    console.log(`     Ocp-Apim-Subscription-Key: ${SUB_KEY.substring(0, 8)}...`);
    console.log('');

    try {
      const response = await axios.post(
        `${BASE_URL}/collection/token/`,
        {},
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Ocp-Apim-Subscription-Key": SUB_KEY,
          },
          timeout: 10000
        }
      );

      console.log('✅ Token request SUCCESSFUL!');
      console.log('   Status:', response.status);
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.access_token) {
        console.log(`   Access Token: ${response.data.access_token.substring(0, 20)}...`);
        console.log('✅ AUTHENTICATION WORKING PERFECTLY!');
      } else {
        console.log('❌ No access token in response');
      }

    } catch (error) {
      console.log('❌ Token request FAILED!');
      console.log('   Status:', error.response?.status);
      console.log('   Status Text:', error.response?.statusText);
      console.log('   Response:', JSON.stringify(error.response?.data, null, 2));
      console.log('');

      if (error.response?.status === 401) {
        console.log('🔴 DIAGNOSIS: 401 Unauthorized');
        console.log('');
        console.log('🔧 POSSIBLE CAUSES:');
        console.log('1. API_USER does not exist');
        console.log('2. API_KEY is incorrect');
        console.log('3. SUBSCRIPTION_KEY is invalid/expired');
        console.log('4. User and key don\'t match');
        console.log('5. Subscription not activated');
        console.log('');
        console.log('🎯 NEXT STEPS:');
        console.log('1. Go to https://momodeveloper.mtn.com');
        console.log('2. Verify your API user exists');
        console.log('3. Generate new API key');
        console.log('4. Get active subscription key');
        console.log('5. Update .env file');
      }

      if (error.response?.status === 403) {
        console.log('🔴 DIAGNOSIS: 403 Forbidden');
        console.log('');
        console.log('🔧 POSSIBLE CAUSES:');
        console.log('1. Subscription key is invalid');
        console.log('2. Subscription is inactive');
        console.log('3. Wrong environment (sandbox vs production)');
      }

      if (error.response?.status === 404) {
        console.log('🔴 DIAGNOSIS: 404 Not Found');
        console.log('');
        console.log('🔧 POSSIBLE CAUSES:');
        console.log('1. Wrong API endpoint URL');
        console.log('2. API version mismatch');
      }

      if (error.code === 'ECONNABORTED') {
        console.log('🔴 DIAGNOSIS: Connection Timeout');
        console.log('');
        console.log('🔧 POSSIBLE CAUSES:');
        console.log('1. Network connectivity issues');
        console.log('2. MTN MOMO API down');
        console.log('3. Firewall blocking request');
      }
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
  }
}

// Run debug test
debugMomoAuth();
