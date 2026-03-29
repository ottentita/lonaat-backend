// Script to fix admin login by creating proper database user
const bcrypt = require('bcrypt');

// Database connection
const { PrismaClient: PrismaClientType } = require('@prisma/client');
const prisma = new PrismaClientType();

const ADMIN_EMAIL = 'titasembi@gmail.com';
const ADMIN_PASSWORD = 'Far@el11';

async function fixAdminLogin() {
  try {
    console.log('🗑️ STEP 1: Deleting existing admin user...');
    
    // Delete existing admin user
    try {
      const deleteResult = await prisma.user.deleteMany({
        where: { email: ADMIN_EMAIL }
      });
      console.log(`✅ Deleted ${deleteResult.count} existing admin user(s)`);
    } catch (deleteError: any) {
      console.log('⚠️ No existing admin user found:', deleteError.message);
    }

    console.log('🔐 STEP 2: Creating new admin with correct hash...');
    
    // Generate correct hash
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    console.log('🔑 Generated hash:', hashedPassword.substring(0, 30) + '...');
    
    // Create new admin user
    try {
      const newAdmin = await prisma.user.create({
        data: {
          name: 'Admin',
          email: ADMIN_EMAIL,
          password: hashedPassword,
          role: 'admin'
        }
      });
      
      console.log('✅ New admin user created successfully:');
      console.log('📧 Email:', newAdmin.email);
      console.log('👤 Name:', newAdmin.name);
      console.log('🔑 Role:', newAdmin.role);
      console.log('🆔 ID:', newAdmin.id);
      
      // Verify the hash works
      const testVerify = await bcrypt.compare(ADMIN_PASSWORD, hashedPassword);
      console.log('✅ Password verification test:', testVerify ? 'PASSED' : 'FAILED');
      
      return newAdmin;
      
    } catch (createError: any) {
      console.log('❌ Failed to create admin user:', createError.message);
      throw createError;
    }

  } catch (error) {
    console.error('💥 Fix admin login error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
fixAdminLogin()
  .then(() => {
    console.log('🎉 Admin login fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Admin login fix failed:', error);
    process.exit(1);
  });
