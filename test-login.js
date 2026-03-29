// Test login endpoint with real HTTP request
const fetch = require('node-fetch');

async function testLogin() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTING LOGIN ENDPOINT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Test 1: Database test endpoint
    console.log('1️⃣ Testing /api/test endpoint...');
    const testRes = await fetch('http://localhost:4000/api/test');
    const testData = await testRes.json();
    console.log('✅ /api/test response:', testData);
    console.log('');

    // Test 2: Login
    console.log('2️⃣ Testing /api/auth/login endpoint...');
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'lonaat64@gmail.com',
        password: 'Far@el11'
      })
    });

    const loginData = await loginRes.json();
    console.log('Status:', loginRes.status);
    console.log('Response:', JSON.stringify(loginData, null, 2));

    if (loginData.token) {
      console.log('✅ Login successful! Token received.');
      console.log('');

      // Test 3: /auth/me
      console.log('3️⃣ Testing /api/auth/me endpoint...');
      const meRes = await fetch('http://localhost:4000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });

      const meData = await meRes.json();
      console.log('Status:', meRes.status);
      console.log('Response:', JSON.stringify(meData, null, 2));

      if (meRes.status === 200) {
        console.log('✅ /auth/me successful!');
      } else {
        console.log('❌ /auth/me failed!');
      }
    } else {
      console.log('❌ Login failed! No token received.');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TEST COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ TEST ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

testLogin();
