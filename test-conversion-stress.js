/**
 * CONVERSION WEBHOOK STRESS TEST
 * Tests all failure scenarios and race conditions
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';
const WEBHOOK_SECRET = 'your-secure-webhook-secret-here';

// Test results storage
const results = {
  passed: [],
  failed: []
};

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function logResult(testName, passed, details) {
  if (passed) {
    results.passed.push(testName);
    log('✅', `PASS: ${testName}`);
  } else {
    results.failed.push({ test: testName, details });
    log('❌', `FAIL: ${testName} - ${details}`);
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// TEST 1: Normal Conversion
async function testNormalConversion() {
  log('🧪', 'TEST 1: Normal Conversion');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/conversion/webhook-v2`, {
      reference: `test_normal_${Date.now()}`,
      amount: 1000,
      userId: 1,
      productId: 1
    }, {
      headers: {
        'x-webhook-secret': WEBHOOK_SECRET,
        'Content-Type': 'application/json'
      }
    });

    console.log('🔍 Normal conversion response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.conversion && response.data.walletBalance) {
      logResult('Normal Conversion', true);
      log('💰', `Wallet Balance: ${response.data.walletBalance}`);
      log('📊', `Conversion ID: ${response.data.conversion.id}`);
      return true;
    } else {
      console.log('❌ Missing fields:', {
        success: response.data.success,
        hasConversion: !!response.data.conversion,
        hasWalletBalance: !!response.data.walletBalance,
        actualKeys: Object.keys(response.data)
      });
      logResult('Normal Conversion', false, 'Invalid response structure');
      return false;
    }
  } catch (error) {
    console.log('❌ Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    logResult('Normal Conversion', false, error.response?.data?.error || error.message);
    return false;
  }
}

// TEST 2: Duplicate Prevention
async function testDuplicatePrevention() {
  log('🧪', 'TEST 2: Duplicate Prevention');
  
  const uniqueRef = `test_duplicate_${Date.now()}`;
  
  try {
    // Send first request
    const response1 = await axios.post(`${BASE_URL}/api/conversion/webhook-v2`, {
      reference: uniqueRef,
      amount: 2000,
      userId: 1,
      productId: 1
    }, {
      headers: { 'x-webhook-secret': WEBHOOK_SECRET }
    });

    // Send duplicate request
    const response2 = await axios.post(`${BASE_URL}/api/conversion/webhook-v2`, {
      reference: uniqueRef,
      amount: 2000,
      userId: 1,
      productId: 1
    }, {
      headers: { 'x-webhook-secret': WEBHOOK_SECRET }
    });

    if (response2.data.message === 'Already processed') {
      logResult('Duplicate Prevention', true);
      return true;
    } else {
      logResult('Duplicate Prevention', false, 'Duplicate was not rejected');
      return false;
    }
  } catch (error) {
    logResult('Duplicate Prevention', false, error.response?.data?.error || error.message);
    return false;
  }
}

// TEST 3: Parallel Race Condition
async function testRaceCondition() {
  log('🧪', 'TEST 3: Parallel Race Condition (5 simultaneous requests)');
  
  const reference = `test_race_${Date.now()}`;
  
  try {
    // Send 5 requests simultaneously
    const promises = Array(5).fill(null).map(() => 
      axios.post(`${BASE_URL}/api/conversion/webhook-v2`, {
        reference: reference,
        amount: 3000,
        userId: 1,
        productId: 1
      }, {
        headers: { 'x-webhook-secret': WEBHOOK_SECRET },
        validateStatus: () => true // Accept all status codes
      })
    );

    const responses = await Promise.all(promises);
    
    // Debug: Log all responses
    console.log('🔍 All responses:', responses.map((r, i) => ({
      index: i,
      status: r.status,
      success: r.data.success,
      hasConversion: !!r.data.conversion,
      message: r.data.message,
      error: r.data.error
    })));
    
    // Count successes
    const successes = responses.filter(r => r.data.success && r.data.conversion && !r.data.message).length;
    const alreadyProcessed = responses.filter(r => r.data.success && r.data.message === 'Already processed').length;
    
    log('📊', `Successes: ${successes}, Already Processed: ${alreadyProcessed}`);
    
    if (successes === 1 && alreadyProcessed === 4) {
      logResult('Race Condition Protection', true);
      return true;
    } else {
      logResult('Race Condition Protection', false, `Expected 1 success and 4 duplicates, got ${successes} successes`);
      return false;
    }
  } catch (error) {
    logResult('Race Condition Protection', false, error.message);
    return false;
  }
}

// TEST 4: Invalid User
async function testInvalidUser() {
  log('🧪', 'TEST 4: Invalid User (userId: 999999)');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/conversion/webhook-v2`, {
      reference: 'test_invalid_user_001',
      amount: 1000,
      userId: 999999,
      productId: 1
    }, {
      headers: { 'x-webhook-secret': WEBHOOK_SECRET },
      validateStatus: () => true
    });

    if (response.status === 404 && response.data.error === 'User not found') {
      logResult('Invalid User Rejection', true);
      return true;
    } else {
      logResult('Invalid User Rejection', false, 'Should return 404 User not found');
      return false;
    }
  } catch (error) {
    logResult('Invalid User Rejection', false, error.message);
    return false;
  }
}

// TEST 5: Negative Amount
async function testNegativeAmount() {
  log('🧪', 'TEST 5: Negative Amount');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/conversion/webhook-v2`, {
      reference: 'test_negative_001',
      amount: -1000,
      userId: 1,
      productId: 1
    }, {
      headers: { 'x-webhook-secret': WEBHOOK_SECRET },
      validateStatus: () => true
    });

    if (response.status === 400 && response.data.error === 'Invalid amount') {
      logResult('Negative Amount Rejection', true);
      return true;
    } else {
      logResult('Negative Amount Rejection', false, 'Should return 400 Invalid amount');
      return false;
    }
  } catch (error) {
    logResult('Negative Amount Rejection', false, error.message);
    return false;
  }
}

// TEST 6: Missing Product
async function testMissingProduct() {
  log('🧪', 'TEST 6: Missing Product (productId: 999999)');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/conversion/webhook-v2`, {
      reference: 'test_missing_product_001',
      amount: 1000,
      userId: 1,
      productId: 999999
    }, {
      headers: { 'x-webhook-secret': WEBHOOK_SECRET },
      validateStatus: () => true
    });

    if (response.status === 404 && response.data.error === 'Product not found') {
      logResult('Missing Product Rejection', true);
      return true;
    } else {
      logResult('Missing Product Rejection', false, 'Should return 404 Product not found');
      return false;
    }
  } catch (error) {
    logResult('Missing Product Rejection', false, error.message);
    return false;
  }
}

// TEST 7: Missing Webhook Secret
async function testMissingWebhookSecret() {
  log('🧪', 'TEST 7: Missing Webhook Secret (Security)');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/conversion/webhook-v2`, {
      reference: 'test_no_secret_001',
      amount: 1000,
      userId: 1,
      productId: 1
    }, {
      validateStatus: () => true
    });

    if (response.status === 403 && response.data.error === 'Unauthorized') {
      logResult('Webhook Secret Validation', true);
      return true;
    } else {
      logResult('Webhook Secret Validation', false, 'Should return 403 Unauthorized');
      return false;
    }
  } catch (error) {
    logResult('Webhook Secret Validation', false, error.message);
    return false;
  }
}

// TEST 8: Invalid Webhook Secret
async function testInvalidWebhookSecret() {
  log('🧪', 'TEST 8: Invalid Webhook Secret');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/conversion/webhook-v2`, {
      reference: 'test_bad_secret_001',
      amount: 1000,
      userId: 1,
      productId: 1
    }, {
      headers: { 'x-webhook-secret': 'wrong-secret' },
      validateStatus: () => true
    });

    if (response.status === 403 && response.data.error === 'Unauthorized') {
      logResult('Invalid Secret Rejection', true);
      return true;
    } else {
      logResult('Invalid Secret Rejection', false, 'Should return 403 Unauthorized');
      return false;
    }
  } catch (error) {
    logResult('Invalid Secret Rejection', false, error.message);
    return false;
  }
}

// RUN ALL TESTS
async function runAllTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 CONVERSION WEBHOOK STRESS TEST SUITE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await testNormalConversion();
  await sleep(500);
  
  await testDuplicatePrevention();
  await sleep(500);
  
  await testRaceCondition();
  await sleep(500);
  
  await testInvalidUser();
  await sleep(500);
  
  await testNegativeAmount();
  await sleep(500);
  
  await testMissingProduct();
  await sleep(500);
  
  await testMissingWebhookSecret();
  await sleep(500);
  
  await testInvalidWebhookSecret();

  // Print summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ PASSED: ${results.passed.length}/${results.passed.length + results.failed.length}`);
  console.log(`❌ FAILED: ${results.failed.length}/${results.passed.length + results.failed.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.failed.forEach(f => {
      console.log(`   - ${f.test}: ${f.details}`);
    });
  }
  
  console.log('\n✅ PASSED TESTS:');
  results.passed.forEach(t => {
    console.log(`   - ${t}`);
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (results.failed.length === 0) {
    console.log('🎉 ALL TESTS PASSED - SYSTEM IS PRODUCTION READY!');
  } else {
    console.log('⚠️ SOME TESTS FAILED - FIX REQUIRED BEFORE PRODUCTION');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test suite error:', error);
  process.exit(1);
});
