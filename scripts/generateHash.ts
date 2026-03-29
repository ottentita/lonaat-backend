import bcrypt from 'bcryptjs';

async function generateHash() {
  const password1 = 'Far@el11';
  const password2 = 'admin123';
  
  console.log('🔐 GENERATING PASSWORD HASHES\n');
  
  const hash1 = await bcrypt.hash(password1, 10);
  console.log(`Password: ${password1}`);
  console.log(`Hash: ${hash1}\n`);
  
  const hash2 = await bcrypt.hash(password2, 10);
  console.log(`Password: ${password2}`);
  console.log(`Hash: ${hash2}\n`);
  
  // Verify hashes work
  const verify1 = await bcrypt.compare(password1, hash1);
  const verify2 = await bcrypt.compare(password2, hash2);
  
  console.log(`Verify ${password1}: ${verify1 ? '✅' : '❌'}`);
  console.log(`Verify ${password2}: ${verify2 ? '✅' : '❌'}`);
}

generateHash();
