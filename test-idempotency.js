/**
 * IDEMPOTENCY HARD CHECK TEST
 * Tests duplicate request handling with same idempotency key
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:4000';
const ADMIN_EMAIL = 'lonaat64@gmail.com';
const ADMIN_PASSWORD = 'Far@el11';

let adminToken = null;
let userToken = null;

async function login(email, password) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email,
      password
    });
    return response.data.token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testIdempotencyKey() {
  console.log('🔒 TESTING IDEMPOTENCY KEY HANDLING...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const sameIdempotencyKey = 'test_idempotency_' + Date.now();
  const tokensToBuy = 25;

  console.log(`🔑 Using same idempotency key for both requests:`);
  console.log(`   Key: ${sameIdempotencyKey}`);
  console.log(`   Tokens: ${tokensToBuy}`);
  console.log('');

  // First request
  console.log('📤 SENDING FIRST REQUEST...');
  try {
    const response1 = await axios.post(
      `${BASE_URL}/api/tokens/buy`,
      {
        tokens: tokensToBuy,
        idempotencyKey: sameIdempotencyKey
      },
      {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ FIRST REQUEST SUCCESSFUL:');
    console.log(`   Tokens: ${response1.data.purchase.tokens}`);
    console.log(`   Cost: ${response1.data.purchase.cost}`);
    console.log(`   New Balance: ${response1.data.wallet.balance}`);
    console.log(`   New Tokens: ${response1.data.wallet.tokens}`);
    console.log(`   Transaction ID: ${response1.data.transactionId || 'N/A'}`);
    console.log('');

  } catch (error) {
    console.log('❌ FIRST REQUEST FAILED:');
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    console.log(`   Status: ${error.response?.status}`);
    console.log('');
    return false;
  }

  // Wait a moment to ensure first request is processed
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Second request with same idempotency key
  console.log('📤 SENDING SECOND REQUEST (SAME KEY)...');
  try {
    const response2 = await axios.post(
      `${BASE_URL}/api/tokens/buy`,
      {
        tokens: tokensToBuy,
        idempotencyKey: sameIdempotencyKey
      },
      {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('❌ SECOND REQUEST UNEXPECTEDLY SUCCEEDED:');
    console.log(`   Tokens: ${response2.data.purchase.tokens}`);
    console.log(`   Cost: ${response2.data.purchase.cost}`);
    console.log(`   New Balance: ${response2.data.wallet.balance}`);
    console.log(`   New Tokens: ${response2.data.wallet.tokens}`);
    console.log('');
    console.log('🚨 IDEMPOTENCY CHECK FAILED!');
    console.log('   Second request should have been blocked or returned same result');
    return false;

  } catch (error) {
    console.log('✅ SECOND REQUEST CORRECTLY BLOCKED:');
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    console.log(`   Status: ${error.response?.status}`);
    console.log('');

    // Check if it's the expected 409 Conflict response
    if (error.response?.status === 409) {
      console.log('✅ IDEMPOTENCY CHECK PASSED!');
      console.log('   Second request correctly returned 409 Conflict');
      console.log('   Duplicate purchase was properly prevented');
      
      // Check if it returns the same transaction ID
      if (error.response?.data?.transactionId) {
        console.log(`   Original Transaction ID: ${error.response.data.transactionId}`);
        console.log('   System correctly referenced original transaction');
      }
      
      return true;
    } else {
      console.log('❌ IDEMPOTENCY CHECK FAILED!');
      console.log('   Expected 409 Conflict, but got different status');
      console.log(`   Got status: ${error.response?.status}`);
      return false;
    }
  }
}

async function testIdempotencyWithDifferentKeys() {
  console.log('🔑 TESTING IDEMPOTENCY WITH DIFFERENT KEYS...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const key1 = 'test_different_1_' + Date.now();
  const key2 = 'test_different_2_' + Date.now();
  const tokensToBuy = 15;

  console.log(`📤 SENDING REQUEST WITH KEY 1: ${key1}`);
  const response1 = await axios.post(
    `${BASE_URL}/api/tokens/buy`,
    {
      tokens: tokensToBuy,
      idempotencyKey: key1
    },
    {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('✅ REQUEST 1 SUCCESSFUL');
  console.log(`   Tokens: ${response1.data.purchase.tokens}`);
  console.log(`   New Balance: ${response1.data.wallet.balance}`);
  console.log('');

  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`📤 SENDING REQUEST WITH KEY 2: ${key2}`);
  const response2 = await axios.post(
    `${BASE_URL}/api/tokens/buy`,
    {
      tokens: tokensToBuy,
      idempotencyKey: key2
    },
    {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('✅ REQUEST 2 SUCCESSFUL');
  console.log(`   Tokens: ${response2.data.purchase.tokens}`);
  console.log(`   New Balance: ${response2.data.wallet.balance}`);
  console.log('');

  // Both should succeed with different keys
  const bothSucceeded = response1.data.success && response2.data.success;
  const differentTransactions = response1.data.transactionId !== response2.data.transactionId;
  
  if (bothSucceeded && differentTransactions) {
    console.log('✅ DIFFERENT KEYS TEST PASSED!');
    console.log('   Both requests succeeded with different keys');
    console.log('   Different transaction IDs created');
    return true;
  } else {
    console.log('❌ DIFFERENT KEYS TEST FAILED!');
    console.log('   Expected both requests to succeed with different keys');
    return false;
  }
}

async function runIdempotencyTest() {
  try {
    console.log('🚀 IDEMPOTENCY TEST STARTING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Login as admin
    console.log('🔐 Admin Login...');
    adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Admin login successful');
    console.log('');

    // Login as user
    console.log('🔐 User Login...');
    userToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ User login successful');
    console.log('');

    // Test same idempotency key
    const sameKeyTest = await testIdempotencyKey();
    console.log('');

    // Test different idempotency keys
    const differentKeyTest = await testIdempotencyWithDifferentKeys();
    console.log('');

    console.log('🏁 IDEMPOTENCY TEST COMPLETED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (sameKeyTest && differentKeyTest) {
      console.log('🎉 ALL IDEMPOTENCY TESTS PASSED!');
      console.log('✅ Duplicate requests are properly blocked');
      console.log('✅ Different requests are properly handled');
      console.log('✅ System is safe against double-spending');
      process.exit(0);
    } else {
      console.log('❌ IDEMPOTENCY TESTS FAILED!');
      console.log('🚨 SYSTEM IS VULNERABLE TO DOUBLE-SPENDING!');
      process.exit(1);
    }

  } catch (error) {
    console.error('');
    console.error('❌ IDEMPOTENCY TEST CRASHED:', error.message);
    console.error('🔍 Troubleshooting:');
    console.error('1. Check if backend server is running on port 4000');
    console.error('2. Check if database is accessible');
    console.error('3. Check if user exists and has sufficient balance');
    console.error('4. Check if idempotency key logic is implemented');
    console.error('5. Check network connectivity');
    
    process.exit(1);
  }
}

// Run the test
runIdempotencyTest();
