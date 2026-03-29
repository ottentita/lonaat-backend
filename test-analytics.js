const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function testAnalyticsEndpoints() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTING ANALYTICS ENDPOINTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 1. Login as admin
    console.log('\n🔐 Step 1: Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'lonaat64@gmail.com',
      password: 'Far@el11'
    });
    
    const token = loginResponse.data.token;
    const userId = loginResponse.data.user.id;
    console.log(`✅ Logged in successfully - User ID: ${userId}`);

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Test /api/creator/stats
    console.log('\n📊 Step 2: Testing /api/creator/stats...');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/api/creator/stats`, { headers });
      console.log('✅ Creator stats endpoint working');
      console.log('   Response:', JSON.stringify(statsResponse.data, null, 2));
    } catch (error) {
      console.log(`❌ Creator stats failed: ${error.response?.status} - ${error.message}`);
    }

    // 3. Test /api/products (marketplace products)
    console.log('\n🛍️  Step 3: Testing /api/products...');
    try {
      const productsResponse = await axios.get(`${BASE_URL}/api/products`, { headers });
      console.log('✅ Products endpoint working');
      console.log(`   Total products: ${productsResponse.data.products?.length || 0}`);
      if (productsResponse.data.products?.length > 0) {
        const sample = productsResponse.data.products[0];
        console.log('   Sample product:', {
          id: sample.id,
          name: sample.name,
          network: sample.network,
          price: sample.price,
          hasAffiliateLink: !!sample.affiliateLink,
          hasExternalId: !!sample.externalId
        });
      }
    } catch (error) {
      console.log(`❌ Products failed: ${error.response?.status} - ${error.message}`);
    }

    // 4. Test /api/wallet
    console.log('\n💰 Step 4: Testing /api/wallet...');
    try {
      const walletResponse = await axios.get(`${BASE_URL}/api/wallet`, { headers });
      console.log('✅ Wallet endpoint working');
      console.log('   Wallet data:', JSON.stringify(walletResponse.data, null, 2));
    } catch (error) {
      console.log(`❌ Wallet failed: ${error.response?.status} - ${error.message}`);
    }

    // 5. Test product click tracking
    console.log('\n🖱️  Step 5: Testing product click tracking...');
    try {
      const productsResponse = await axios.get(`${BASE_URL}/api/products`, { headers });
      if (productsResponse.data.products?.length > 0) {
        const testProduct = productsResponse.data.products[0];
        
        const clickResponse = await axios.post(
          `${BASE_URL}/api/products/${testProduct.id}/click`,
          {},
          { headers }
        );
        console.log('✅ Click tracking endpoint working');
        console.log('   Click recorded:', clickResponse.data);
      } else {
        console.log('⚠️  No products available to test click tracking');
      }
    } catch (error) {
      console.log(`❌ Click tracking failed: ${error.response?.status} - ${error.message}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ANALYTICS TESTING COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testAnalyticsEndpoints();
