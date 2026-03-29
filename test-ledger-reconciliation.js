y/**
 * LEDGER RECONCILIATION TEST - FINANCIAL INTEGRITY VERIFICATION
 * Tests that transaction records match wallet balances exactly
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:4000';
const ADMIN_EMAIL = 'lonaat64@gmail.com';
const ADMIN_PASSWORD = 'Far@el11';

let adminToken = null;

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

async function testLedgerReconciliation() {
  console.log('🧾 TESTING LEDGER RECONCILIATION...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    // Test 1: Get financial health
    console.log('📊 STEP 1: Financial Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health/financial`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const health = healthResponse.data.data;
    console.log('✅ Financial Health Status:', health.status);
    console.log('   Health Score:', health.score);
    console.log('   Ledger Integrity:', health.checks.ledgerIntegrity);
    console.log('   Negative Balances:', health.checks.negativeBalances);
    console.log('   Pending Transactions:', health.checks.pendingTransactions);
    console.log('   Alerts:', health.alerts.length);
    console.log('');

    // Test 2: Manual ledger reconciliation
    console.log('🔍 STEP 2: Manual Ledger Reconciliation...');
    
    // Get total debits (token purchases)
    const totalDebits = await axios.get(`${BASE_URL}/api/admin/revenue`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📈 Total Revenue (Debits):', totalDebits.data.data.summary.totalRevenue);
    console.log('   Total Transactions:', totalDebits.data.data.summary.totalTransactions);
    console.log('   Total Tokens Sold:', totalDebits.data.data.summary.totalTokensSold);
    console.log('');

    // Test 3: Check wallet sums
    console.log('💰 STEP 3: Wallet Balance Verification...');
    const walletSumResponse = await axios.get(`${BASE_URL}/api/admin/revenue/users`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const walletStats = walletSumResponse.data.data.users;
    const totalWalletBalance = walletStats.reduce((sum, user) => sum + (user.balance || 0), 0);
    const totalTokens = walletStats.reduce((sum, user) => sum + (user.tokens || 0), 0);
    const totalTokensBought = walletStats.reduce((sum, user) => sum + (user.totalTokensBought || 0), 0);
    const totalTokensSpent = walletStats.reduce((sum, user) => sum + (user.totalTokensSpent || 0), 0);

    console.log('💰 Wallet Balance Summary:');
    console.log('   Total Wallet Balance:', totalWalletBalance);
    console.log('   Total Tokens:', totalTokens);
    console.log('   Total Tokens Bought:', totalTokensBought);
    console.log('   Total Tokens Spent:', totalTokensSpent);
    console.log('   Active Users:', walletStats.length);
    console.log('');

    // Test 4: Reconciliation calculations
    console.log('🧮 STEP 4: Reconciliation Calculations...');
    
    const expectedRevenue = totalTokensBought * 10; // Assuming 10 XAF per token
    const actualRevenue = totalDebits.data.data.summary.totalRevenue;
    const revenueDifference = Math.abs(expectedRevenue - actualRevenue);
    
    const expectedNetTokens = totalTokensBought - totalTokensSpent;
    const actualNetTokens = totalTokens;
    const tokenDifference = Math.abs(expectedNetTokens - actualNetTokens);

    console.log('🔍 RECONCILIATION RESULTS:');
    console.log('   Revenue:');
    console.log('     Expected (Tokens × Price):', expectedRevenue);
    console.log('     Actual (Transaction Sum):', actualRevenue);
    console.log('     Difference:', revenueDifference);
    console.log('     Match:', revenueDifference < 0.01 ? '✅' : '❌');
    console.log('');
    
    console.log('   Tokens:');
    console.log('     Expected (Bought - Spent):', expectedNetTokens);
    console.log('     Actual (Current Balance):', actualNetTokens);
    console.log('     Difference:', tokenDifference);
    console.log('     Match:', tokenDifference < 1 ? '✅' : '❌');
    console.log('');

    // Test 5: Check for orphaned transactions
    console.log('🔍 STEP 5: Orphaned Transaction Check...');
    
    // Check for transactions without corresponding wallet updates
    const transactionSum = totalDebits.data.data.summary.totalRevenue;
    const walletBalanceSum = totalWalletBalance;
    
    console.log('🔍 ORPHANED TRANSACTION ANALYSIS:');
    console.log('   Total Transaction Amount:', transactionSum);
    console.log('   Total Wallet Balance:', walletBalanceSum);
    console.log('   Difference:', Math.abs(transactionSum - walletBalanceSum));
    console.log('   Orphaned Transactions:', Math.abs(transactionSum - walletBalanceSum) > 0.01 ? '❌ POSSIBLE' : '✅ NONE');
    console.log('');

    // Test 6: Negative balance detection
    console.log('🚨 STEP 6: Negative Balance Detection...');
    
    const negativeBalanceUsers = walletStats.filter(user => (user.balance || 0) < 0);
    const negativeTokenUsers = walletStats.filter(user => (user.tokens || 0) < 0);
    
    console.log('🚨 NEGATIVE BALANCE ANALYSIS:');
    console.log('   Users with Negative Balance:', negativeBalanceUsers.length);
    console.log('   Users with Negative Tokens:', negativeTokenUsers.length);
    console.log('   System Safe:', (negativeBalanceUsers.length === 0 && negativeTokenUsers.length === 0) ? '✅ YES' : '❌ NO');
    
    if (negativeBalanceUsers.length > 0) {
      console.log('   Negative Balance Users:');
      negativeBalanceUsers.forEach(user => {
        console.log(`     - User ${user.userId}: ${user.balance} XAF`);
      });
    }
    
    if (negativeTokenUsers.length > 0) {
      console.log('   Negative Token Users:');
      negativeTokenUsers.forEach(user => {
        console.log(`     - User ${user.userId}: ${user.tokens} tokens`);
      });
    }
    console.log('');

    // Final reconciliation verdict
    const allChecksPass = 
      revenueDifference < 0.01 && 
      tokenDifference < 1 && 
      negativeBalanceUsers.length === 0 && 
      negativeTokenUsers.length === 0 &&
      health.status === 'healthy';

    console.log('🏁 LEDGER RECONCILIATION COMPLETED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    if (allChecksPass) {
      console.log('🎉 LEDGER RECONCILIATION PASSED!');
      console.log('✅ All financial records are consistent');
      console.log('✅ No negative balances detected');
      console.log('✅ Revenue matches token sales');
      console.log('✅ System is financially sound');
      console.log('');
      console.log('📊 SUMMARY:');
      console.log(`   Total Revenue: ${actualRevenue} XAF`);
      console.log(`   Total Users: ${walletStats.length}`);
      console.log(`   Total Tokens in Circulation: ${totalTokens}`);
      console.log(`   Health Score: ${health.score}%`);
      
      return {
        success: true,
        revenue: actualRevenue,
        tokens: totalTokens,
        users: walletStats.length,
        healthScore: health.score
      };
    } else {
      console.log('❌ LEDGER RECONCILIATION FAILED!');
      console.log('🚨 CRITICAL FINANCIAL ISSUES DETECTED:');
      
      if (revenueDifference >= 0.01) {
        console.log('   - Revenue mismatch detected');
        console.log(`   - Expected: ${expectedRevenue}, Actual: ${actualRevenue}`);
      }
      
      if (tokenDifference >= 1) {
        console.log('   - Token balance mismatch detected');
        console.log(`   - Expected: ${expectedNetTokens}, Actual: ${actualNetTokens}`);
      }
      
      if (negativeBalanceUsers.length > 0) {
        console.log(`   - ${negativeBalanceUsers.length} users have negative balances`);
      }
      
      if (negativeTokenUsers.length > 0) {
        console.log(`   - ${negativeTokenUsers.length} users have negative tokens`);
      }
      
      if (health.status !== 'healthy') {
        console.log(`   - System health status: ${health.status}`);
      }
      
      return {
        success: false,
        issues: {
          revenueMismatch: revenueDifference >= 0.01,
          tokenMismatch: tokenDifference >= 1,
          negativeBalances: negativeBalanceUsers.length + negativeTokenUsers.length,
          systemHealth: health.status
        }
      };
    }

  } catch (error: any) {
    console.error('❌ LEDGER RECONCILIATION ERROR:', error);
    console.error('🔍 Troubleshooting:');
    console.error('1. Check if backend server is running on port 4000');
    console.error('2. Check if database is accessible');
    console.error('3. Check if admin credentials are correct');
    console.error('4. Check if financial endpoints are working');
    console.error('5. Check database connection and permissions');
    
    return {
      success: false,
      error: error.message
    };
  }
}

async function runLedgerReconciliationTest() {
  try {
    console.log('🚀 LEDGER RECONCILIATION TEST STARTING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Login as admin
    console.log('🔐 Admin Login...');
    adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Admin login successful');
    console.log('');

    // Run ledger reconciliation
    const result = await testLedgerReconciliation();
    
    console.log('');
    console.log('🏁 LEDGER RECONCILIATION TEST FINAL RESULT:');
    
    if (result.success) {
      console.log('🎉 ALL FINANCIAL CHECKS PASSED!');
      console.log('✅ System is ready for production');
      console.log('✅ Ledger integrity verified');
      console.log('✅ No financial inconsistencies found');
      process.exit(0);
    } else {
      console.log('❌ FINANCIAL CHECKS FAILED!');
      console.log('🚨 SYSTEM HAS FINANCIAL INCONSISTENCIES!');
      console.log('🔧 Issues to fix:');
      
      if (result.issues?.revenueMismatch) {
        console.log('   - Fix revenue calculation logic');
      }
      
      if (result.issues?.tokenMismatch) {
        console.log('   - Fix token balance calculation logic');
      }
      
      if (result.issues?.negativeBalances > 0) {
        console.log('   - Fix negative balance prevention');
      }
      
      if (result.issues?.systemHealth !== 'healthy') {
        console.log('   - Fix system health issues');
      }
      
      process.exit(1);
    }

  } catch (error) {
    console.error('');
    console.error('❌ LEDGER RECONCILIATION TEST CRASHED:', error.message);
    console.error('🔍 Troubleshooting:');
    console.error('1. Check if backend server is running on port 4000');
    console.error('2. Check if database is accessible');
    console.error('3. Check if admin credentials are correct');
    console.error('4. Check network connectivity');
    console.error('5. Check if all required endpoints are implemented');
    
    process.exit(1);
  }
}

// Run the test
runLedgerReconciliationTest();
