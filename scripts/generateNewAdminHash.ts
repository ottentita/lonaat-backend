import bcrypt from 'bcryptjs';

async function generateNewAdminHash() {
  const email = 'lonaat64@gmail.com';
  const password = 'Far@el11';
  
  console.log('🔐 GENERATING ADMIN HASH FOR NEW CREDENTIALS\n');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}\n`);
  
  const hash = await bcrypt.hash(password, 10);
  console.log(`Bcrypt Hash:\n${hash}\n`);
  
  // Verify hash works
  const verify = await bcrypt.compare(password, hash);
  console.log(`Verification: ${verify ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  if (verify) {
    console.log('✅ Hash is valid and ready to use');
    console.log('\nUse this hash in the fallback admin user:');
    console.log(`const correctHash = '${hash}';`);
  }
}

generateNewAdminHash();
