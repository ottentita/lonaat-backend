/**
 * DOUBLE-SPEND TEST - CONCURRENT REQUEST SIMULATION
 * Tests concurrent token purchases to ensure no double-spending or negative balances
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

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

async function concurrentTokenPurchase(purchaseId, tokens = 10) {
  try {
    const idempotencyKey = `concurrent_test_${purchaseId}_${Date.now()}`;
    
    console.log(`🪙 CONCURRENT PURCHASE ${purchaseId}: Starting...`);
    console.log(`   Idempotency Key: ${idempotencyKey}`);
    
    const response = await axios.post(
      `${BASE_URL}/api/tokens/buy`,
      {
        tokens,
        idempotencyKey
      },
      {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log(`✅ CONCURRENT PURCHASE ${purchaseId}: SUCCESS`);
    console.log(`   Tokens: ${response.data.purchase.tokens}`);
    console.log(`   Cost: ${response.data.purchase.cost}`);
    console.log(`   New Balance: ${response.data.wallet.balance}`);
    console.log(`   New Tokens: ${response.data.wallet.tokens}`);
    
    return {
      success: true,
      purchaseId,
      idempotencyKey,
      data: response.data
    };

  } catch (error) {
    console.log(`❌ CONCURRENT PURCHASE ${purchaseId}: FAILED`);
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    console.log(`   Status: ${error.response?.status}`);
    
    return {
      success: false,
      purchaseId,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

async function testConcurrentPurchases() {
  console.log('🔥 TESTING CONCURRENT TOKEN PURCHASES...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Get initial balances
  console.log('📊 GETTING INITIAL BALANCES...');
  const initialWallet = await getWalletBalance();
  const initialTokens = await getTokenBalance();
  
  console.log('Initial Wallet Balance:', initialWallet.balance);
  console.log('Initial Token Balance:', initialTokens.tokens);
  console.log('');

  // Start concurrent purchases
  console.log('🚀 STARTING CONCURRENT PURCHASES...');
  console.log('Sending 3 requests simultaneously...');
  console.log('');

  const purchasePromises = [
    concurrentTokenPurchase('A', 20),  // 20 tokens = 200 XAF
    concurrentTokenPurchase('B', 15),  // 15 tokens = 150 XAF  
    concurrentTokenPurchase('C', 25)   // 25 tokens = 250 XAF
  ];

  const results = await Promise.all(purchasePromises);
  
  console.log('');
  console.log('📊 CONCURRENT PURCHASE RESULTS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  let successCount = 0;
  let failureCount = 0;
  let totalTokensBought = 0;
  let totalCost = 0;

  results.forEach(result => {
    if (result.success) {
      successCount++;
      totalTokensBought += result.data.purchase.tokens;
      totalCost += result.data.purchase.cost;
    } else {
      failureCount++;
    }
  });

  console.log(`✅ Successful Purchases: ${successCount}`);
  console.log(`❌ Failed Purchases: ${failureCount}`);
  console.log(`🪙 Total Tokens Bought: ${totalTokensBought}`);
  console.log(`💰 Total Cost: ${totalCost} XAF`);
  console.log('');

  // Check final balances
  console.log('📊 CHECKING FINAL BALANCES...');
  const finalWallet = await getWalletBalance();
  const finalTokens = await getTokenBalance();
  
  console.log('Final Wallet Balance:', finalWallet.balance);
  console.log('Final Token Balance:', finalTokens.tokens);
  console.log('');

  // Verify ledger consistency
  console.log('🔍 VERIFYING LEDGER CONSISTENCY...');
  const expectedWalletBalance = initialWallet.balance - totalCost;
  const expectedTokenBalance = initialTokens.tokens + totalTokensBought;
  
  console.log('Expected Wallet Balance:', expectedWalletBalance);
  console.log('Actual Wallet Balance:', finalWallet.balance);
  console.log('Expected Token Balance:', expectedTokenBalance);
  console.log('Actual Token Balance:', finalTokens.tokens);
  console.log('');

  // Check for inconsistencies
  const walletConsistent = finalWallet.balance === expectedWalletBalance;
  const tokenConsistent = finalTokens.tokens === expectedTokenBalance;
  const noNegativeBalance = finalWallet.balance >= 0;
  const noNegativeTokens = finalTokens.tokens >= 0;

  console.log('🔍 CONSISTENCY CHECKS:');
  console.log(`   Wallet Balance Consistent: ${walletConsistent ? '✅' : '❌'}`);
  console.log(`   Token Balance Consistent: ${tokenConsistent ? '✅' : '❌'}`);
  console.log(`   No Negative Wallet Balance: ${noNegativeBalance ? '✅' : '❌'}`);
  console.log(`   No Negative Token Balance: ${noNegativeTokens ? '✅' : '❌'}`);
  console.log('');

  // Check for double-spending
  const totalRequestedTokens = 20 + 15 + 25; // 60 tokens
  const totalRequestedCost = totalRequestedTokens * 10; // 600 XAF
  
  console.log('🔍 DOUBLE-SPENDING CHECK:');
  console.log(`   Total Tokens Requested: ${totalRequestedTokens}`);
  console.log(`   Total Cost Requested: ${totalRequestedCost} XAF`);
  console.log(`   Actual Tokens Bought: ${totalTokensBought}`);
  console.log(`   Actual Cost: ${totalCost} XAF`);
  console.log(`   Double-Spending Detected: ${totalTokensBought > totalRequestedTokens ? '❌ YES' : '✅ NO'}`);
  console.log('');

  // Final verdict
  const allChecksPass = walletConsistent && tokenConsistent && noNegativeBalance && noNegativeTokens && totalTokensBought <= totalRequestedTokens;
  
  if (allChecksPass) {
    console.log('🎉 CONCURRENT PURCHASE TEST PASSED!');
    console.log('✅ No double-spending detected');
    console.log('✅ Ledger is consistent');
    console.log('✅ No negative balances');
    console.log('✅ System is safe');
  } else {
    console.log('❌ CONCURRENT PURCHASE TEST FAILED!');
    console.log('🚨 CRITICAL ISSUES DETECTED:');
    
    if (!walletConsistent) console.log('   - Wallet balance is inconsistent');
    if (!tokenConsistent) console.log('   - Token balance is inconsistent');
    if (!noNegativeBalance) console.log('   - Negative wallet balance detected');
    if (!noNegativeTokens) console.log('   - Negative token balance detected');
    if (totalTokensBought > totalRequestedTokens) console.log('   - Double-spending detected');
  }

  return {
    success: allChecksPass,
    results,
    initialWallet,
    initialTokens,
    finalWallet,
    finalTokens,
    totalTokensBought,
    totalCost,
    consistency: {
      walletConsistent,
      tokenConsistent,
      noNegativeBalance,
      noNegativeTokens,
      noDoubleSpending: totalTokensBought <= totalRequestedTokens
    }
  };
}

async function runDoubleSpendTest() {
  try {
    console.log('🚀 DOUBLE-SPEND TEST STARTING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Login as admin
    console.log('🔐 Admin Login...');
    adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Admin login successful');
    console.log('');

    // Login as user
    console.log('🔐 User Login...');
    userToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD); // Same user for testing
    console.log('✅ User login successful');
    console.log('');

    // Run concurrent purchase test
    const result = await testConcurrentPurchases();
    
    console.log('');
    console.log('🏁 DOUBLE-SPEND TEST COMPLETED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (result.success) {
      console.log('🎉 ALL TESTS PASSED - SYSTEM IS SAFE!');
      process.exit(0);
    } else {
      console.log('❌ TESTS FAILED - SYSTEM HAS ISSUES!');
      process.exit(1);
    }

  } catch (error) {
    console.error('');
    console.error('❌ DOUBLE-SPEND TEST CRASHED:', error.message);
    console.error('🔍 Troubleshooting:');
    console.error('1. Check if backend server is running on port 4000');
    console.error('2. Check if database is accessible');
    console.error('3. Check if user exists and has sufficient balance');
    console.error('4. Check if endpoints are properly mounted');
    console.error('5. Check network connectivity');
    
    process.exit(1);
  }
}

// Run the test
runDoubleSpendTest();
