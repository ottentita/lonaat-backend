/**
 * TEST MTN MOMO DEPOSIT - LIVE VALIDATION
 * Step 1: Trigger deposit request
 */

const axios = require('axios');

async function testMomoDeposit() {
  try {
    console.log('🧪 TESTING MTN MOMO DEPOSIT...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // First, login to get token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:4000/api/auth/login', {
      email: 'lonaat64@gmail.com',
      password: 'Far@el11'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Step 1: Trigger deposit
    console.log('📱 Triggering MTN MOMO deposit...');
    const depositResponse = await axios.post('http://localhost:4000/api/momo/deposit', {
      amount: 500,
      phone: '237612345678'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Deposit request sent:', depositResponse.data);
    console.log('📱 Check your phone for MTN MOMO prompt...');
    console.log('💰 Amount: 500 XAF (including fees)');
    console.log('📞 Phone: 237612345678');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Open MTN MOMO app on your phone');
    console.log('2. Enter PIN to confirm payment');
    console.log('3. Accept the payment request');
    console.log('4. Wait for webhook confirmation');
    console.log('');
    console.log('🔍 After payment, check:');
    console.log('- Database: SELECT * FROM Transaction WHERE source=\'momo\' ORDER BY createdAt DESC;');
    console.log('- Wallet balance should increase by 500 XAF');
    console.log('- Server logs should show webhook processing');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('💡 This might be:');
      console.log('   - Invalid phone format (use: 2376XXXXXXXX)');
      console.log('   - Amount outside range (100-500000 XAF)');
      console.log('   - Server configuration issue');
    }
    
    if (error.response?.status === 500) {
      console.log('💡 This might be:');
      console.log('   - MTN MOMO API connection issue');
      console.log('   - Environment variables missing');
      console.log('   - Server error - check logs');
    }
  }
}

// Run the test
testMomoDeposit();
