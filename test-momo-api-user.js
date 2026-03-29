/**
 * TEST MTN MOMO API USER VALIDATION
 * Step 1: Verify API User exists before proceeding
 */

require('dotenv').config();
const axios = require('axios');

async function testMomoApiUser() {
  try {
    console.log('🔍 TESTING MTN MOMO API USER...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const BASE_URL = process.env.MTN_MOMO_BASE_URL;
    const SUB_KEY = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
    const API_USER = process.env.MTN_MOMO_API_USER;
    const API_KEY = process.env.MTN_MOMO_API_KEY;

    console.log('📋 Configuration:');
    console.log(`   BASE_URL: ${BASE_URL}`);
    console.log(`   API_USER: ${API_USER}`);
    console.log(`   SUB_KEY: ${SUB_KEY ? '✅ Present' : '❌ Missing'}`);
    console.log(`   API_KEY: ${API_KEY ? '✅ Present' : '❌ Missing'}`);
    console.log('');

    // Step 1: Verify API User exists
    console.log('👤 Checking if API User exists...');
    try {
      const auth = Buffer.from(`${API_USER}:${API_KEY}`).toString("base64");

      const userResponse = await axios.get(
        `${BASE_URL}/v1_0/apiuser/${API_USER}`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Ocp-Apim-Subscription-Key": SUB_KEY,
          },
          timeout: 10000
        }
      );

      console.log('✅ API User exists and is accessible');
      console.log('   User data:', userResponse.data);
      console.log('');

      // Step 2: Test token request
      console.log('🔐 Testing token request...');
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

        const accessToken = tokenResponse.data.access_token;
        console.log('✅ Access token obtained successfully');
        console.log(`   Token: ${accessToken ? `${accessToken.substring(0, 20)}...` : 'NULL'}`);
        console.log('');

        // Step 3: Test token usage
        console.log('🎯 Testing token usage...');
        try {
          const testResponse = await axios.get(
            `${BASE_URL}/collection/v1_0/requesttopay/test-123`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Ocp-Apim-Subscription-Key": SUB_KEY,
                "X-Target-Environment": "sandbox",
              },
              timeout: 5000
            }
          );

          console.log('✅ Token usage successful');
        } catch (tokenTestError) {
          if (tokenTestError.response?.status === 404) {
            console.log('✅ Token usage works (404 expected for test ID)');
          } else {
            console.log('⚠️ Token usage failed:', tokenTestError.response?.status || tokenTestError.message);
          }
        }

      } catch (tokenError) {
        console.log('❌ Token request failed:', tokenError.response?.status || tokenError.message);
        console.log('   Response:', tokenError.response?.data || 'No response data');
        
        if (tokenError.response?.status === 401) {
          console.log('');
          console.log('🔧 TROUBLESHOOTING 401:');
          console.log('1. Check if API_KEY is correct');
          console.log('2. Verify subscription key is active');
          console.log('3. Ensure API user has collection permissions');
        }
      }

    } catch (userError) {
      console.log('❌ API User check failed:', userError.response?.status || userError.message);
      console.log('   Response:', userError.response?.data || 'No response data');
      
      if (userError.response?.status === 401) {
        console.log('');
        console.log('🔧 TROUBLESHOOTING 401:');
        console.log('1. API_USER may not exist or is incorrect');
        console.log('2. API_KEY may be wrong');
        console.log('3. Subscription key may be invalid');
        console.log('4. User may not have proper permissions');
      }
      
      if (userError.response?.status === 404) {
        console.log('');
        console.log('🔧 TROUBLESHOOTING 404:');
        console.log('1. API_USER does not exist in MTN MOMO system');
        console.log('2. Need to create new API user');
        console.log('3. Check if user ID format is correct');
      }
    }

    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('If API User check passes: ✅ Ready for deposit testing');
    console.log('If API User check fails: ❌ Need new MTN MOMO credentials');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testMomoApiUser();
