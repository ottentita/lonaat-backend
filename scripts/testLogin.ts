import bcrypt from 'bcryptjs';

async function testLogin() {
  console.log('🔍 AUTH SYSTEM DEBUG\n');
  
  const ADMIN_EMAIL = 'lonaat64@gmail.com';
  const ADMIN_PASSWORD = 'Far@el11';
  const STORED_HASH = '$2a$10$swPGD9dya/ZpsqlN/nl9s.FZPc9GOPS0rQpkHFlWA3pz5.9JEBN4O';
  
  console.log('Testing password verification...\n');
  console.log('Email:', ADMIN_EMAIL);
  console.log('Password:', ADMIN_PASSWORD);
  console.log('Hash:', STORED_HASH);
  console.log('');
  
  const isMatch = await bcrypt.compare(ADMIN_PASSWORD, STORED_HASH);
  console.log('bcrypt.compare() Result:', isMatch ? '✅ MATCH' : '❌ NO MATCH');
  
  if (isMatch) {
    console.log('\n✅ LOGIN SHOULD WORK');
  } else {
    console.log('\n❌ LOGIN WILL FAIL - Hash mismatch');
  }
}

testLogin();
