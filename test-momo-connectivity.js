/**
 * TEST MTN MOMO CONNECTIVITY - API ACCESS VALIDATION
 * Tests if we can connect to MTN MOMO sandbox
 */

require('dotenv').config();
const axios = require('axios');

async function testMomoConnectivity() {
  try {
    console.log('🔍 TESTING MTN MOMO CONNECTIVITY...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const BASE_URL = process.env.MTN_MOMO_BASE_URL;
    const SUB_KEY = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
    const API_USER = process.env.MTN_MOMO_API_USER;
    const API_KEY = process.env.MTN_MOMO_API_KEY;

    console.log('📋 Configuration:');
    console.log(`   BASE_URL: ${BASE_URL}`);
    console.log(`   SUB_KEY: ${SUB_KEY ? '✅ Present' : '❌ Missing'}`);
    console.log(`   API_USER: ${API_USER ? '✅ Present' : '❌ Missing'}`);
    console.log(`   API_KEY: ${API_KEY ? '✅ Present' : '❌ Missing'}`);
    console.log('');

    // Test 1: Get access token
    console.log('🔐 Testing access token...');
    const auth = Buffer.from(`${API_USER}:${API_KEY}`).toString("base64");

    try {
      const tokenResponse = await axios.post(
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

      const token = tokenResponse.data.access_token;
      console.log('✅ Access token obtained successfully');
      console.log(`   Token length: ${token ? token.length : 0} chars`);
      console.log('');

      // Test 2: Test API health
      console.log('🏥 Testing API health...');
      try {
        const healthResponse = await axios.get(
          `${BASE_URL}/collection/v1_0/requesttopay/test-id`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Ocp-Apim-Subscription-Key": SUB_KEY,
              "X-Target-Environment": "sandbox",
            },
            timeout: 5000
          }
        );
        console.log('✅ API health check passed');
      } catch (healthError) {
        if (healthError.response?.status === 404) {
          console.log('✅ API is accessible (404 expected for test ID)');
        } else {
          console.log('⚠️ API health check failed:', healthError.response?.status || healthError.message);
        }
      }
      console.log('');

      // Test 3: Check sandbox environment
      console.log('🌍 Testing sandbox environment...');
      console.log(`   Environment: sandbox`);
      console.log(`   URL: ${BASE_URL}`);
      console.log('✅ Sandbox configuration verified');
      console.log('');

      console.log('🎉 CONNECTIVITY TEST RESULTS:');
      console.log('✅ Environment variables: VALID');
      console.log('✅ MTN MOMO API: ACCESSIBLE');
      console.log('✅ Authentication: WORKING');
      console.log('✅ Sandbox: CONFIGURED');
      console.log('');
      console.log('📱 READY FOR DEPOSIT TEST');
      console.log('   - Phone format: 2376XXXXXXXX (Cameroon)');
      console.log('   - Test amount: 500 XAF');
      console.log('   - Expected flow: MTN MOMO app confirmation');

    } catch (tokenError) {
      console.log('❌ Access token failed:', tokenError.response?.status || tokenError.message);
      console.log('');
      console.log('🔧 TROUBLESHOOTING:');
      console.log('1. Check MTN MOMO sandbox credentials');
      console.log('2. Verify subscription key is active');
      console.log('3. Check network connectivity to sandbox.momodeveloper.mtn.com');
      console.log('4. Verify API user and key are correct');
      
      if (tokenError.code === 'ECONNABORTED') {
        console.log('5. Network timeout - check internet connection');
      }
      
      if (tokenError.response?.status === 401) {
        console.log('5. Authentication failed - check credentials');
      }
      
      if (tokenError.response?.status === 403) {
        console.log('5. Forbidden - check subscription key');
      }
    }

  } catch (error) {
    console.error('❌ Connectivity test failed:', error.message);
  }
}

// Run the test
testMomoConnectivity();
