const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// New admin credentials
const NEW_ADMIN_EMAIL = 'titasembi@gmail.com';
const NEW_ADMIN_PASSWORD = 'Far@el11';
const NEW_ADMIN_NAME = 'Titas Embi';

// Old admin to demote
const OLD_ADMIN_EMAIL = 'lonaat64@gmail.com';

async function adminTransfer() {
  try {
    console.log('🔄 PHASE: ADMIN TRANSFER (FINAL STEP)\n');
    console.log('OBJECTIVE: Create new admin and make it the ONLY admin');
    console.log('=' .repeat(70));
    
    // STEP 1: CREATE NEW ADMIN USER
    console.log('\n📊 STEP 1: CREATE NEW ADMIN USER\n');
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: NEW_ADMIN_EMAIL }
    });
    
    if (existingUser) {
      console.log(`⚠️ User ${NEW_ADMIN_EMAIL} already exists`);
      console.log(`  - ID: ${existingUser.id}`);
      console.log(`  - Current Role: ${existingUser.role || 'user'}`);
      console.log('  - Will upgrade to admin...');
      
      // Hash password
      const hashedPassword = await bcrypt.hash(NEW_ADMIN_PASSWORD, 10);
      
      // Upgrade to admin
      const updatedUser = await prisma.user.update({
        where: { email: NEW_ADMIN_EMAIL },
        data: {
          role: 'admin',
          password: hashedPassword,
          name: NEW_ADMIN_NAME
        }
      });
      
      console.log('\n✅ User upgraded to admin:');
      console.log(`  - ID: ${updatedUser.id}`);
      console.log(`  - Email: ${updatedUser.email}`);
      console.log(`  - Role: ${updatedUser.role}`);
      console.log(`  - Name: ${updatedUser.name}`);
      
    } else {
      console.log(`Creating new admin user: ${NEW_ADMIN_EMAIL}`);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(NEW_ADMIN_PASSWORD, 10);
      
      console.log('Hashing password...');
      console.log('✅ Password hashed');
      
      // Create new admin user
      const newUser = await prisma.user.create({
        data: {
          email: NEW_ADMIN_EMAIL,
          password: hashedPassword,
          role: 'admin',
          name: NEW_ADMIN_NAME,
          tokenBalance: 1000,
          plan: 'premium'
        }
      });
      
      console.log('\n✅ New admin user created:');
      console.log(`  - ID: ${newUser.id}`);
      console.log(`  - Email: ${newUser.email}`);
      console.log(`  - Role: ${newUser.role}`);
      console.log(`  - Name: ${newUser.name}`);
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 2: VERIFY NEW ADMIN
    console.log('\n📊 STEP 2: VERIFY NEW ADMIN LOGIN\n');
    
    const newAdmin = await prisma.user.findUnique({
      where: { email: NEW_ADMIN_EMAIL },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        password: true
      }
    });
    
    if (!newAdmin) {
      console.log('❌ New admin user not found!');
      return;
    }
    
    console.log('New Admin User:');
    console.log(`  - Email: ${newAdmin.email}`);
    console.log(`  - Role: ${newAdmin.role}`);
    console.log(`  - Name: ${newAdmin.name}`);
    
    // Verify password
    const passwordValid = await bcrypt.compare(NEW_ADMIN_PASSWORD, newAdmin.password);
    console.log(`\nPassword Verification: ${passwordValid ? '✅ VALID' : '❌ INVALID'}`);
    
    const isAdmin = newAdmin.role === 'admin';
    console.log(`Admin Role Check: ${isAdmin ? '✅ YES' : '❌ NO'}`);
    
    if (passwordValid && isAdmin) {
      console.log('\n✅ New admin can login with:');
      console.log(`   Email: ${NEW_ADMIN_EMAIL}`);
      console.log(`   Password: ${NEW_ADMIN_PASSWORD}`);
      console.log('   Expected: req.user.role === "admin" ✅');
    } else {
      console.log('\n❌ Login verification failed!');
      if (!passwordValid) console.log('   - Password does not match');
      if (!isAdmin) console.log('   - Role is not admin');
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 3: DEMOTE OLD ADMIN
    console.log('\n📊 STEP 3: DEMOTE OLD ADMIN\n');
    
    const oldAdmin = await prisma.user.findUnique({
      where: { email: OLD_ADMIN_EMAIL }
    });
    
    if (!oldAdmin) {
      console.log(`⚠️ Old admin ${OLD_ADMIN_EMAIL} not found - nothing to demote`);
    } else {
      console.log(`Found old admin: ${OLD_ADMIN_EMAIL}`);
      console.log(`  - Current Role: ${oldAdmin.role || 'user'}`);
      
      if (oldAdmin.role === 'admin') {
        console.log('  - Demoting to user...');
        
        const demotedUser = await prisma.user.update({
          where: { email: OLD_ADMIN_EMAIL },
          data: { role: 'user' }
        });
        
        console.log('\n✅ Old admin demoted:');
        console.log(`  - Email: ${demotedUser.email}`);
        console.log(`  - New Role: ${demotedUser.role}`);
        console.log('  - No longer has admin access ❌');
      } else {
        console.log('  - Already demoted (not admin)');
      }
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 4: FINAL VERIFICATION
    console.log('\n📊 STEP 4: FINAL VERIFICATION\n');
    console.log('SQL: SELECT email, role FROM users;\n');
    
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        name: true
      },
      orderBy: { id: 'asc' }
    });
    
    console.log('All Users:');
    console.log('ID | Email | Role | Name');
    console.log('-'.repeat(70));
    
    allUsers.forEach(user => {
      const role = user.role || 'user';
      const name = user.name || '(no name)';
      const marker = role === 'admin' ? ' ✅ ADMIN' : '';
      console.log(`${user.id} | ${user.email} | ${role}${marker} | ${name}`);
    });
    
    console.log('\n' + '-'.repeat(70));
    
    // Count admins
    const adminUsers = allUsers.filter(u => u.role === 'admin');
    console.log(`\nTotal Users: ${allUsers.length}`);
    console.log(`Admin Users: ${adminUsers.length}`);
    
    console.log('\n' + '=' .repeat(70));
    
    // VERIFICATION CHECKS
    console.log('\n📋 VERIFICATION CHECKS:\n');
    
    const titasIsAdmin = allUsers.find(u => u.email === NEW_ADMIN_EMAIL)?.role === 'admin';
    const lonaatIsUser = allUsers.find(u => u.email === OLD_ADMIN_EMAIL)?.role !== 'admin';
    const onlyOneAdmin = adminUsers.length === 1;
    
    console.log(`✔ ${NEW_ADMIN_EMAIL} → admin: ${titasIsAdmin ? '✅ YES' : '❌ NO'}`);
    console.log(`✔ ${OLD_ADMIN_EMAIL} → user: ${lonaatIsUser ? '✅ YES' : '❌ NO'}`);
    console.log(`✔ Only ONE admin exists: ${onlyOneAdmin ? '✅ YES' : '❌ NO'}`);
    
    if (onlyOneAdmin) {
      console.log(`\n✅ ONLY ADMIN: ${adminUsers[0].email}`);
    } else if (adminUsers.length > 1) {
      console.log(`\n⚠️ WARNING: ${adminUsers.length} admin accounts exist:`);
      adminUsers.forEach(u => console.log(`   - ${u.email}`));
    } else {
      console.log('\n❌ ERROR: No admin accounts exist!');
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // FINAL STATUS
    if (titasIsAdmin && lonaatIsUser && onlyOneAdmin) {
      console.log('\n🎯 ADMIN TRANSFER COMPLETE ✅\n');
      console.log('✅ New admin created: titasembi@gmail.com');
      console.log('✅ Old admin demoted: lonaat64@gmail.com');
      console.log('✅ System has ONLY ONE admin account');
      console.log('\n🔐 Login with:');
      console.log(`   Email: ${NEW_ADMIN_EMAIL}`);
      console.log(`   Password: ${NEW_ADMIN_PASSWORD}`);
      console.log('   Role: admin ✅');
    } else {
      console.log('\n⚠️ ADMIN TRANSFER INCOMPLETE\n');
      if (!titasIsAdmin) console.log('❌ titasembi@gmail.com is not admin');
      if (!lonaatIsUser) console.log('❌ lonaat64@gmail.com is still admin');
      if (!onlyOneAdmin) console.log(`❌ ${adminUsers.length} admin accounts exist (should be 1)`);
    }
    
    console.log('\n' + '=' .repeat(70));
    
  } catch (error) {
    console.error('❌ Admin transfer error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

adminTransfer();
