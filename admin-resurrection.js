const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// STEP 1: ADMIN CREDENTIALS (from .env or defaults)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'lonaat64@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Far@el11';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Administrator';

async function adminResurrection() {
  try {
    console.log('🔐 PHASE: ADMIN ACCOUNT RESURRECTION\n');
    console.log('SOURCE OF TRUTH: .env file');
    console.log('=' .repeat(70));
    
    // STEP 1: READ ADMIN CREDENTIALS
    console.log('\n📊 STEP 1: READ ADMIN CREDENTIALS FROM .env\n');
    
    console.log('Admin Credentials:');
    console.log(`  ADMIN_EMAIL: ${ADMIN_EMAIL}`);
    console.log(`  ADMIN_PASSWORD: ${'*'.repeat(ADMIN_PASSWORD.length)}`);
    console.log(`  ADMIN_NAME: ${ADMIN_NAME}`);
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 2: CHECK IF USER EXISTS
    console.log('\n📊 STEP 2: CHECK IF USER EXISTS IN DATABASE\n');
    console.log(`SQL: SELECT * FROM users WHERE email = '${ADMIN_EMAIL}';\n`);
    
    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL }
    });
    
    if (existingUser) {
      console.log('✅ User found:');
      console.log(`  - ID: ${existingUser.id}`);
      console.log(`  - Email: ${existingUser.email}`);
      console.log(`  - Role: ${existingUser.role || 'user'}`);
      console.log(`  - Name: ${existingUser.name || '(no name)'}`);
    } else {
      console.log('❌ User NOT found - will create new admin user');
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 3 & 4: CREATE OR UPGRADE USER
    if (!existingUser) {
      console.log('\n📊 STEP 3: CREATE NEW ADMIN USER\n');
      
      // Hash password
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      console.log('Creating admin user...');
      console.log(`  Email: ${ADMIN_EMAIL}`);
      console.log(`  Role: admin`);
      console.log(`  Name: ${ADMIN_NAME}`);
      
      const newUser = await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          password: hashedPassword,
          role: 'admin',
          name: ADMIN_NAME,
          tokenBalance: 1000,
          plan: 'premium'
        }
      });
      
      console.log('\n✅ Admin user created successfully!');
      console.log(`  - ID: ${newUser.id}`);
      console.log(`  - Email: ${newUser.email}`);
      console.log(`  - Role: ${newUser.role}`);
      
    } else {
      console.log('\n📊 STEP 4: UPGRADE EXISTING USER TO ADMIN\n');
      
      const currentRole = existingUser.role || 'user';
      
      if (currentRole === 'admin') {
        console.log('✅ User already has admin role - no upgrade needed');
      } else {
        console.log(`Upgrading user from '${currentRole}' to 'admin'...`);
        
        const updatedUser = await prisma.user.update({
          where: { email: ADMIN_EMAIL },
          data: { role: 'admin' }
        });
        
        console.log('\n✅ User upgraded to admin successfully!');
        console.log(`  - ID: ${updatedUser.id}`);
        console.log(`  - Email: ${updatedUser.email}`);
        console.log(`  - Role: ${updatedUser.role}`);
      }
      
      // Update password if needed
      console.log('\nUpdating password to match .env...');
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: { password: hashedPassword }
      });
      
      console.log('✅ Password updated');
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 5: SEARCH FOR HARDCODED ADMIN LOGIC
    console.log('\n📊 STEP 5: HARDCODED ADMIN LOGIC DETECTION\n');
    
    console.log('⚠️ MANUAL ACTION REQUIRED:');
    console.log('   Search codebase for hardcoded admin emails:');
    console.log('');
    console.log('   grep -r "lonaat64@gmail.com" src/');
    console.log('');
    console.log('   Look for patterns like:');
    console.log('   - if (email === "lonaat64@gmail.com")');
    console.log('   - email === "admin@example.com"');
    console.log('   - hardcoded admin bypass logic');
    console.log('');
    console.log('   Replace with:');
    console.log('   - if (user.role === "admin")');
    console.log('   - req.user.isAdmin');
    console.log('   - Role-based access control ONLY');
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 6: VERIFY AUTH PIPELINE
    console.log('\n📊 STEP 6: VERIFY AUTH PIPELINE\n');
    
    console.log('Checking JWT and authMiddleware configuration...\n');
    
    console.log('✅ JWT Payload should include:');
    console.log('   - id (user ID)');
    console.log('   - email');
    console.log('   - role');
    console.log('');
    console.log('✅ authMiddleware should attach:');
    console.log('   - req.user.id');
    console.log('   - req.user.role');
    console.log('   - req.user.isAdmin (derived from role)');
    console.log('');
    console.log('✅ Admin check should be:');
    console.log('   - req.user.role === "admin"');
    console.log('   - OR req.user.isAdmin === true');
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 7: VERIFY ADMIN ACCESS
    console.log('\n📊 STEP 7: VERIFY ADMIN ACCESS\n');
    
    console.log('Test admin routes after login:');
    console.log('');
    console.log('1. Login:');
    console.log(`   POST /api/auth/login`);
    console.log(`   Body: { email: "${ADMIN_EMAIL}", password: "..." }`);
    console.log('   Expected: JWT token with role=admin');
    console.log('');
    console.log('2. Test protected routes:');
    console.log('   GET /api/dashboard/stats');
    console.log('   Expected: req.user.role === "admin"');
    console.log('');
    console.log('3. Test admin-only routes:');
    console.log('   GET /api/admin/*');
    console.log('   Expected: Access granted for admin role');
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 8: FINAL CHECK
    console.log('\n📊 STEP 8: FINAL CHECK - ADMIN USERS IN DATABASE\n');
    console.log('SQL: SELECT email, role FROM users WHERE role = \'admin\';\n');
    
    const adminUsers = await prisma.user.findMany({
      where: { role: 'admin' },
      select: {
        id: true,
        email: true,
        role: true,
        name: true
      }
    });
    
    console.log('Admin Users:');
    console.log('ID | Email | Role | Name');
    console.log('-'.repeat(70));
    
    if (adminUsers.length === 0) {
      console.log('(No admin users found)');
    } else {
      adminUsers.forEach(user => {
        console.log(`${user.id} | ${user.email} | ${user.role} | ${user.name || '(no name)'}`);
      });
    }
    
    console.log(`\nTotal Admin Users: ${adminUsers.length}`);
    
    if (adminUsers.length === 1 && adminUsers[0].email === ADMIN_EMAIL) {
      console.log('\n✅ PERFECT: Only .env admin account exists as admin');
    } else if (adminUsers.length > 1) {
      console.log('\n⚠️ WARNING: Multiple admin accounts exist');
      console.log('   Consider reviewing and removing unnecessary admin accounts');
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // SUCCESS CRITERIA
    console.log('\n📋 SUCCESS CRITERIA CHECKLIST:\n');
    
    const adminExists = adminUsers.some(u => u.email === ADMIN_EMAIL);
    
    console.log(`✔ Admin user exists in DB: ${adminExists ? '✅ YES' : '❌ NO'}`);
    console.log(`✔ Admin email from .env: ${ADMIN_EMAIL}`);
    console.log(`✔ Admin role set: ${adminExists ? '✅ YES' : '❌ NO'}`);
    console.log('✔ Login works: ⚠️ TEST REQUIRED');
    console.log('✔ JWT contains role=admin: ⚠️ TEST REQUIRED');
    console.log('✔ Admin routes accessible: ⚠️ TEST REQUIRED');
    console.log('✔ No hardcoded admin logic: ⚠️ MANUAL REVIEW REQUIRED');
    
    console.log('\n' + '=' .repeat(70));
    
    // NEXT STEPS
    console.log('\n🚀 NEXT STEPS:\n');
    console.log('1. ✅ Admin user created/upgraded');
    console.log('2. ⚠️ Search for hardcoded admin logic:');
    console.log('   grep -r "lonaat64@gmail.com" src/');
    console.log('3. ⚠️ Remove hardcoded email checks');
    console.log('4. ⚠️ Replace with role-based checks');
    console.log('5. ⚠️ Test login with admin credentials');
    console.log('6. ⚠️ Verify JWT includes role field');
    console.log('7. ⚠️ Test admin route access');
    
    console.log('\n' + '=' .repeat(70));
    
  } catch (error) {
    console.error('❌ Admin resurrection error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

adminResurrection();
