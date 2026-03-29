/**
 * CRASH SIMULATION TEST - TRANSACTION ROLLBACK VERIFICATION
 * Tests that partial updates don't occur during transaction failures
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

async function testCrashDuringPurchase() {
  console.log('💥 TESTING CRASH DURING PURCHASE...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Get initial balances
  console.log('📊 GETTING INITIAL BALANCES...');
  const initialWallet = await getWalletBalance();
  const initialTokens = await getTokenBalance();
  
  console.log('Initial Wallet Balance:', initialWallet.balance);
  console.log('Initial Token Balance:', initialTokens.tokens);
  console.log('');

  // Attempt purchase with trigger for crash
  console.log('📤 ATTEMPTING PURCHASE WITH CRASH TRIGGER...');
  console.log('   This should cause a transaction rollback');
  console.log('');

  try {
    const response = await axios.post(
      `${BASE_URL}/api/tokens/buy`,
      {
        tokens: 50,
        idempotencyKey: `crash_test_${Date.now()}`,
        triggerCrash: true  // This should trigger a simulated crash
      },
      {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('❌ UNEXPECTED: Purchase succeeded instead of crashing');
    console.log('   This means the crash trigger is not working');
    console.log('   Response:', response.data);
    return false;

  } catch (error) {
    console.log('✅ EXPECTED: Purchase failed due to crash');
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    console.log(`   Status: ${error.response?.status}`);
    console.log('');

    // Check if balances are unchanged
    console.log('📊 CHECKING BALANCES AFTER CRASH...');
    const finalWallet = await getWalletBalance();
    const finalTokens = await getTokenBalance();
    
    console.log('Final Wallet Balance:', finalWallet.balance);
    console.log('Final Token Balance:', finalTokens.tokens);
    console.log('');

    // Verify no partial updates occurred
    const walletUnchanged = finalWallet.balance === initialWallet.balance;
    const tokensUnchanged = finalTokens.tokens === initialTokens.tokens;
    
    console.log('🔍 CRASH RECOVERY VERIFICATION:');
    console.log(`   Wallet Balance Unchanged: ${walletUnchanged ? '✅' : '❌'}`);
    console.log(`   Token Balance Unchanged: ${tokensUnchanged ? '✅' : '❌'}`);
    console.log('');

    if (walletUnchanged && tokensUnchanged) {
      console.log('✅ CRASH TEST PASSED!');
      console.log('   No partial updates occurred');
      console.log('   Transaction rollback worked correctly');
      console.log('   System is safe');
      return true;
    } else {
      console.log('❌ CRASH TEST FAILED!');
      console.log('   Partial updates detected');
      console.log('   Transaction rollback failed');
      console.log('   System is unsafe');
      
      console.log('🔍 DETAILED ANALYSIS:');
      console.log(`   Initial Wallet: ${initialWallet.balance}`);
      console.log(`   Final Wallet: ${finalWallet.balance}`);
      console.log(`   Wallet Difference: ${finalWallet.balance - initialWallet.balance}`);
      console.log(`   Initial Tokens: ${initialTokens.tokens}`);
      console.log(`   Final Tokens: ${finalTokens.tokens}`);
      console.log(`   Token Difference: ${finalTokens.tokens - initialTokens.tokens}`);
      
      return false;
    }
  }
}

async function testCrashDuringSpend() {
  console.log('💥 TESTING CRASH DURING TOKEN SPEND...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Get initial balances
  const initialWallet = await getWalletBalance();
  const initialTokens = await getTokenBalance();
  
  console.log('Initial Wallet Balance:', initialWallet.balance);
  console.log('Initial Token Balance:', initialTokens.tokens);
  console.log('');

  // Attempt token spend with crash trigger
  console.log('📤 ATTEMPTING TOKEN SPEND WITH CRASH TRIGGER...');
  console.log('   This should cause a transaction rollback');
  console.log('');

  try {
    const response = await axios.post(
      `${BASE_URL}/api/tokens/spend`,
      {
        tokens: 20,
        purpose: 'Crash simulation test',
        triggerCrash: true  // This should trigger a simulated crash
      },
      {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('❌ UNEXPECTED: Token spend succeeded instead of crashing');
    console.log('   This means the crash trigger is not working');
    console.log('   Response:', response.data);
    return false;

  } catch (error) {
    console.log('✅ EXPECTED: Token spend failed due to crash');
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    console.log(`   Status: ${error.response?.status}`);
    console.log('');

    // Check if balances are unchanged
    console.log('📊 CHECKING BALANCES AFTER CRASH...');
    const finalWallet = await getWalletBalance();
    const finalTokens = await getTokenBalance();
    
    console.log('Final Wallet Balance:', finalWallet.balance);
    console.log('Final Token Balance:', finalTokens.tokens);
    console.log('');

    // Verify no partial updates occurred
    const walletUnchanged = finalWallet.balance === initialWallet.balance;
    const tokensUnchanged = finalTokens.tokens === initialTokens.tokens;
    
    console.log('🔍 CRASH RECOVERY VERIFICATION:');
    console.log(`   Wallet Balance Unchanged: ${walletUnchanged ? '✅' : '❌'}`);
    console.log(`   Token Balance Unchanged: ${tokensUnchanged ? '✅' : '❌'}`);
    console.log('');

    if (walletUnchanged && tokensUnchanged) {
      console.log('✅ CRASH SPEND TEST PASSED!');
      console.log('   No partial updates occurred');
      console.log('   Transaction rollback worked correctly');
      return true;
    } else {
      console.log('❌ CRASH SPEND TEST FAILED!');
      console.log('   Partial updates detected');
      console.log('   Transaction rollback failed');
      return false;
    }
  }
}

async function runCrashSimulationTest() {
  try {
    console.log('🚀 CRASH SIMULATION TEST STARTING');
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

    // Test crash during purchase
    const purchaseCrashTest = await testCrashDuringPurchase();
    console.log('');

    // Test crash during spend
    const spendCrashTest = await testCrashDuringSpend();
    console.log('');

    console.log('🏁 CRASH SIMULATION TEST COMPLETED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (purchaseCrashTest && spendCrashTest) {
      console.log('🎉 ALL CRASH TESTS PASSED!');
      console.log('✅ Transaction rollbacks work correctly');
      console.log('✅ No partial updates occur during failures');
      console.log('✅ System is safe against crashes');
      process.exit(0);
    } else {
      console.log('❌ CRASH TESTS FAILED!');
      console.log('🚨 SYSTEM IS VULNERABLE TO PARTIAL UPDATES!');
      process.exit(1);
    }

  } catch (error) {
    console.error('');
    console.error('❌ CRASH SIMULATION TEST CRASHED:', error.message);
    console.error('🔍 Troubleshooting:');
    console.error('1. Check if backend server is running on port 4000');
    console.error('2. Check if database is accessible');
    console.error('3. Check if user exists and has sufficient balance');
    console.error('4. Check if crash trigger logic is implemented');
    console.error('5. Check if transactions are properly wrapped');
    console.error('6. Check network connectivity');
    
    process.exit(1);
  }
}

// Run the test
runCrashSimulationTest();
