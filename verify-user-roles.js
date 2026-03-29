const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyUserRoles() {
  try {
    console.log('🔐 PHASE AUTH — ADMIN TRANSFER (SAFE MODE)\n');
    console.log('=' .repeat(70));
    
    // STEP 1: VERIFY CURRENT ROLES
    console.log('\n📊 STEP 1: VERIFY CURRENT ROLES\n');
    console.log('SQL: SELECT id, email, role FROM users;\n');
    
    const users = await prisma.$queryRaw`
      SELECT id, email, role, name, "createdAt"
      FROM users
      ORDER BY id
    `;
    
    console.log('Current User Roles:');
    console.log('ID | Email | Role | Name | Created At');
    console.log('-'.repeat(70));
    
    if (users.length === 0) {
      console.log('(No users found)');
    } else {
      users.forEach((user) => {
        const role = user.role || 'user';
        const name = user.name || '(no name)';
        const createdAt = user.createdAt.toISOString().split('T')[0];
        console.log(`${user.id} | ${user.email} | ${role} | ${name} | ${createdAt}`);
      });
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 2: CHECK SPECIFIC USERS
    console.log('\n📊 STEP 2: CHECK SPECIFIC USERS\n');
    
    const targetEmails = [
      'lonaat64@gmail.com',
      'titasembi@gmail.com',
      'admin@lonaat.com'
    ];
    
    console.log('Checking target users:\n');
    
    for (const email of targetEmails) {
      const user = users.find(u => u.email === email);
      
      if (user) {
        const role = user.role || 'user';
        const isAdmin = role.toLowerCase() === 'admin';
        const status = isAdmin ? '✅ ADMIN' : '⚠️ USER';
        console.log(`${email}:`);
        console.log(`  - ID: ${user.id}`);
        console.log(`  - Role: ${role}`);
        console.log(`  - Status: ${status}`);
        console.log('');
      } else {
        console.log(`${email}:`);
        console.log(`  - Status: ❌ NOT FOUND`);
        console.log('');
      }
    }
    
    console.log('=' .repeat(70));
    
    // STEP 3: ADMIN COUNT
    console.log('\n📊 STEP 3: ADMIN COUNT\n');
    
    const adminUsers = users.filter(u => (u.role || '').toLowerCase() === 'admin');
    const regularUsers = users.filter(u => (u.role || '').toLowerCase() !== 'admin');
    
    console.log(`Total Users: ${users.length}`);
    console.log(`Admin Users: ${adminUsers.length}`);
    console.log(`Regular Users: ${regularUsers.length}`);
    
    if (adminUsers.length > 0) {
      console.log('\nAdmin Users:');
      adminUsers.forEach(u => {
        console.log(`  - ${u.email} (ID: ${u.id})`);
      });
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // FINAL REPORT
    console.log('\n📋 VERIFICATION REPORT:\n');
    
    const lonaat64 = users.find(u => u.email === 'lonaat64@gmail.com');
    const titasembi = users.find(u => u.email === 'titasembi@gmail.com');
    const adminLonaat = users.find(u => u.email === 'admin@lonaat.com');
    
    console.log('Target Users Status:');
    console.log('');
    
    console.log('1. lonaat64@gmail.com:');
    if (lonaat64) {
      const isAdmin = (lonaat64.role || '').toLowerCase() === 'admin';
      console.log(`   - Found: ✅`);
      console.log(`   - Role: ${lonaat64.role || 'user'}`);
      console.log(`   - Admin: ${isAdmin ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log(`   - Found: ❌ NOT FOUND`);
    }
    
    console.log('');
    console.log('2. titasembi@gmail.com:');
    if (titasembi) {
      const isAdmin = (titasembi.role || '').toLowerCase() === 'admin';
      console.log(`   - Found: ✅`);
      console.log(`   - Role: ${titasembi.role || 'user'}`);
      console.log(`   - Admin: ${isAdmin ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log(`   - Found: ❌ NOT FOUND`);
    }
    
    console.log('');
    console.log('3. admin@lonaat.com:');
    if (adminLonaat) {
      const isAdmin = (adminLonaat.role || '').toLowerCase() === 'admin';
      console.log(`   - Found: ✅`);
      console.log(`   - Role: ${adminLonaat.role || 'user'}`);
      console.log(`   - Admin: ${isAdmin ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log(`   - Found: ❌ NOT FOUND`);
    }
    
    console.log('\n' + '=' .repeat(70));
    
    console.log('\n⚠️ SAFE MODE: NO MODIFICATIONS MADE');
    console.log('   - This script only reads data');
    console.log('   - No user roles have been changed');
    console.log('   - Verification complete');
    
    console.log('\n' + '=' .repeat(70));
    
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyUserRoles();
