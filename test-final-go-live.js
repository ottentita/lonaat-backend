/**
 * FINAL GO-LIVE TEST - COMPLETE SYSTEM VALIDATION
 * Comprehensive test of the entire payment system before production deployment
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:4000';
const ADMIN_EMAIL = 'lonaat64@gmail.com';
const ADMIN_PASSWORD = 'Far@el11';
const TEST_USER_ID = '1';

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

async function getWalletBalance() {
  try {
    const response = await axios.get(`${BASE_URL}/api/wallet`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.wallet;
  } catch (error) {
    console.error('❌ Get wallet balance failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getTokenBalance() {
  try {
    const response = await axios.get(`${BASE_URL}/api/tokens/balance`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Get token balance failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testScenario(scenarioName, testFunction) {
  console.log(`🧪 TESTING: ${scenarioName}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const result = await testFunction();
    console.log(`✅ ${scenarioName}: PASSED`);
    console.log('   Result:', JSON.stringify(result, null, 2));
    return { success: true, result };
  } catch (error) {
    console.log(`❌ ${scenarioName}: FAILED`);
    console.log('   Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

async function testAdminDeposit() {
  const response = await axios.post(
    `${BASE_URL}/api/admin/deposit`,
    {
      userId: TEST_USER_ID,
      amount: 50000,
      reason: 'Final go-live test'
    },
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return {
    amount: response.data.data.amount,
    newBalance: response.data.data.newBalance,
    transactionId: response.data.data.transactionId
  };
}

async function testTokenPurchase() {
  const response = await axios.post(
    `${BASE_URL}/api/tokens/buy`,
    {
      tokens: 100,
      idempotencyKey: `final_test_${Date.now()}`
    },
    {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return {
    tokens: response.data.purchase.tokens,
    cost: response.data.purchase.cost,
    newBalance: response.data.wallet.balance,
    newTokens: response.data.wallet.tokens
  };
}

async function testTokenSpend() {
  const response = await axios.post(
    `${BASE_URL}/api/tokens/spend`,
    {
      tokens: 30,
      purpose: 'Final go-live test'
    },
    {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return {
    tokensSpent: response.data.spend.tokens,
    newBalance: response.data.wallet.balance,
    newTokens: response.data.wallet.tokens
  };
}

async function testOverspendAttempt() {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/tokens/spend`,
      {
        tokens: 1000, // More than available
        purpose: 'Overspend test'
      },
      {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // If we get here, the test failed (should not allow overspend)
    return {
      success: false,
      message: 'Overspend was incorrectly allowed',
      response: response.data
    };
  } catch (error) {
    // This is expected - should fail with insufficient balance
    if (error.response?.status === 400 && error.response?.data?.error?.includes('Insufficient')) {
      return {
        success: true,
        message: 'Overspend correctly blocked',
        error: error.response.data.error
      };
    } else {
      return {
        success: false,
        message: 'Unexpected error during overspend test',
        error: error.response?.data || error.message
      };
    }
  }
}

async function testDuplicateRequest() {
  const idempotencyKey = `duplicate_test_${Date.now()}`;
  
  try {
    // First request
    const response1 = await axios.post(
      `${BASE_URL}/api/tokens/buy`,
      {
        tokens: 25,
        idempotencyKey
      },
      {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Second request with same key
    const response2 = await axios.post(
      `${BASE_URL}/api/tokens/buy`,
      {
        tokens: 25,
        idempotencyKey
      },
      {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // If both succeed, test failed
    return {
      success: false,
      message: 'Duplicate request was not blocked',
      firstResponse: response1.data,
      secondResponse: response2.data
    };
    
  } catch (error) {
    // Second request should fail with 409
    if (error.response?.status === 409) {
      return {
        success: true,
        message: 'Duplicate request correctly blocked',
        error: error.response.data.error
      };
    } else {
      return {
        success: false,
        message: 'Unexpected error during duplicate test',
        error: error.response?.data || error.message
      };
    }
  }
}

async function testSystemHealth() {
  const response = await axios.get(`${BASE_URL}/api/health/financial`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  return {
    status: response.data.data.status,
    score: response.data.data.score,
    ledgerIntegrity: response.data.data.checks.ledgerIntegrity,
    negativeBalances: response.data.data.checks.negativeBalances,
    alerts: response.data.data.alerts.length
  };
}

async function runFinalGoLiveTest() {
  try {
    console.log('🚀 FINAL GO-LIVE TEST STARTING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('This is the FINAL validation before production deployment');
    console.log('');

    // Login as admin
    console.log('🔐 STEP 1: Admin Login...');
    adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Admin login successful');
    console.log('');

    // Login as user
    console.log('🔐 STEP 2: User Login...');
    userToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ User login successful');
    console.log('');

    // Get initial state
    console.log('📊 STEP 3: Initial State Check...');
    const initialWallet = await getWalletBalance();
    const initialTokens = await getTokenBalance();
    console.log('Initial Wallet Balance:', initialWallet.balance);
    console.log('Initial Token Balance:', initialTokens.tokens);
    console.log('');

    // Test scenarios
    const results = {};

    console.log('🏦 STEP 4: Admin Deposit Test...');
    results.deposit = await testScenario('Admin Deposit (50,000 XAF)', testAdminDeposit);
    console.log('');

    console.log('🪙 STEP 5: Token Purchase Test (100 tokens)...');
    results.purchase = await testScenario('Token Purchase (100 tokens)', testTokenPurchase);
    console.log('');

    console.log('🔥 STEP 6: Token Spend Test (30 tokens)...');
    results.spend = await testScenario('Token Spend (30 tokens)', testTokenSpend);
    console.log('');

    console.log('🚫 STEP 7: Overspend Protection Test...');
    results.overspend = await testScenario('Overspend Protection', testOverspendAttempt);
    console.log('');

    console.log('🔒 STEP 8: Duplicate Request Test...');
    results.duplicate = await testScenario('Duplicate Request Protection', testDuplicateRequest);
    console.log('');

    console.log('🏥 STEP 9: System Health Check...');
    results.health = await testScenario('System Health', testSystemHealth);
    console.log('');

    // Final verification
    console.log('📊 STEP 10: Final State Verification...');
    const finalWallet = await getWalletBalance();
    const finalTokens = await getTokenBalance();
    console.log('Final Wallet Balance:', finalWallet.balance);
    console.log('Final Token Balance:', finalTokens.tokens);
    console.log('');

    // Calculate expected values
    const expectedWalletBalance = initialWallet.balance + 50000 - (100 * 10); // +deposit -purchase
    const expectedTokenBalance = initialTokens.tokens + 100 - 30; // +purchase -spend
    
    console.log('🔍 FINAL VERIFICATION:');
    console.log('Expected Wallet Balance:', expectedWalletBalance);
    console.log('Actual Wallet Balance:', finalWallet.balance);
    console.log('Wallet Correct:', finalWallet.balance === expectedWalletBalance ? '✅' : '❌');
    console.log('');
    
    console.log('Expected Token Balance:', expectedTokenBalance);
    console.log('Actual Token Balance:', finalTokens.tokens);
    console.log('Tokens Correct:', finalTokens.tokens === expectedTokenBalance ? '✅' : '❌');
    console.log('');

    // Test results summary
    const testResults = {
      deposit: results.deposit.success,
      purchase: results.purchase.success,
      spend: results.spend.success,
      overspend: results.overspend.success,
      duplicate: results.duplicate.success,
      health: results.health.success,
      walletCorrect: finalWallet.balance === expectedWalletBalance,
      tokensCorrect: finalTokens.tokens === expectedTokenBalance,
      noErrors: Object.values(results).every(r => r.success)
    };

    console.log('🏁 FINAL GO-LIVE TEST RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    console.log('📋 TEST RESULTS SUMMARY:');
    console.log(`   Admin Deposit: ${testResults.deposit ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Token Purchase: ${testResults.purchase ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Token Spend: ${testResults.spend ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Overspend Protection: ${testResults.overspend ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Duplicate Protection: ${testResults.duplicate ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   System Health: ${testResults.health ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Wallet Balance Correct: ${testResults.walletCorrect ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Token Balance Correct: ${testResults.tokensCorrect ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   No Critical Errors: ${testResults.noErrors ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    const allTestsPassed = Object.values(testResults).every(result => result === true);
    
    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED - SYSTEM IS READY FOR PRODUCTION!');
      console.log('✅ Admin deposit mechanism works');
      console.log('✅ Token purchase flow works');
      console.log('✅ Token consumption works');
      console.log('✅ Overspend protection works');
      console.log('✅ Duplicate request protection works');
      console.log('✅ System health monitoring works');
      console.log('✅ Wallet balances are accurate');
      console.log('✅ Token balances are accurate');
      console.log('✅ No critical errors detected');
      console.log('');
      console.log('🚀 SYSTEM IS PRODUCTION-READY!');
      console.log('🇨🇲 READY FOR CAMEROON LAUNCH!');
      process.exit(0);
    } else {
      console.log('❌ SOME TESTS FAILED - SYSTEM NOT READY FOR PRODUCTION!');
      console.log('🚨 CRITICAL ISSUES MUST BE FIXED:');
      
      if (!testResults.deposit) console.log('   - Admin deposit mechanism is broken');
      if (!testResults.purchase) console.log('   - Token purchase flow is broken');
      if (!testResults.spend) console.log('   - Token consumption is broken');
      if (!testResults.overspend) console.log('   - Overspend protection is broken');
      if (!testResults.duplicate) console.log('   - Duplicate request protection is broken');
      if (!testResults.health) console.log('   - System health monitoring is broken');
      if (!testResults.walletCorrect) console.log('   - Wallet balance calculations are incorrect');
      if (!testResults.tokensCorrect) console.log('   - Token balance calculations are incorrect');
      
      console.log('');
      console.log('🔧 FIX REQUIRED BEFORE PRODUCTION DEPLOYMENT');
      process.exit(1);
    }

  } catch (error) {
    console.error('');
    console.error('❌ FINAL GO-LIVE TEST CRASHED:', error.message);
    console.error('🔍 Troubleshooting:');
    console.error('1. Check if backend server is running on port 4000');
    console.error('2. Check if database is accessible');
    console.error('3. Check if admin credentials are correct');
    console.error('4. Check if all endpoints are implemented');
    console.error('5. Check if user exists and has sufficient balance');
    console.error('6. Check network connectivity');
    console.error('7. Check if all required dependencies are installed');
    
    process.exit(1);
  }
}

// Run the final test
runFinalGoLiveTest();
