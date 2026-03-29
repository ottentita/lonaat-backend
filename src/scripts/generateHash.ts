const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'Far@el11';
  const hash = await bcrypt.hash(password, 10);
  console.log('Complete hash:');
  console.log(hash);
  
  // Verify it works
  const isValid = await bcrypt.compare(password, hash);
  console.log('Verification:', isValid);
}

generateHash().catch(console.error);
