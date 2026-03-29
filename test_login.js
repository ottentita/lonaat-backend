const bcrypt = require('bcrypt');

async function testPasswordVerification() {
  try {
    const password = 'Far@el11';
    const hash = '$2b$10$KCrzE7eAKZDOQnpzkTxEMu45hUm4Xj9woBxvix3qqgNi3sScjqWYS';
    
    console.log('🔐 Testing password verification...');
    console.log('📧 Password:', password);
    console.log('🔒 Hash:', hash);
    
    const isValid = await bcrypt.compare(password, hash);
    console.log('✅ Password match:', isValid);
    
    if (isValid) {
      console.log('🎉 Login should work with this hash!');
    } else {
      console.log('❌ Hash verification failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPasswordVerification();
