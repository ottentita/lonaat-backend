import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    console.log('🔧 RESETTING ADMIN PASSWORD');
    console.log('═══════════════════════════════════════════════\n');

    const ADMIN_EMAIL = 'titasembi@gmail.com';
    const NEW_PASSWORD = 'admin123';
    
    console.log(`📧 Admin Email: ${ADMIN_EMAIL}`);
    console.log(`🔑 New Password: ${NEW_PASSWORD}`);

    // Check if user exists
    console.log('\n🔍 Checking if admin user exists...');
    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL }
    });

    if (!existingUser) {
      console.log('❌ Admin user not found in database!');
      console.log('Creating new admin user...\n');
      
      // Hash password
      const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);
      console.log('✅ Password hashed');
      
      // Create admin user
      const newUser = await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          password: hashedPassword,
          name: 'Administrator',
          role: 'admin',
          is_admin: true,
          verified: true,
          isActive: true,
          balance: 0
        }
      });
      
      console.log('✅ Admin user created successfully!');
      console.log(`📊 User ID: ${newUser.id}`);
      console.log(`📊 Email: ${newUser.email}`);
      console.log(`📊 Role: ${newUser.role}`);
      console.log(`📊 is_admin: ${(newUser as any).is_admin}`);
    } else {
      console.log('✅ Admin user found in database');
      console.log(`📊 Current User ID: ${existingUser.id}`);
      console.log(`📊 Current Email: ${existingUser.email}`);
      console.log(`📊 Current Role: ${existingUser.role}`);
      console.log(`📊 Current is_admin: ${(existingUser as any).is_admin}`);
      
      // Hash new password
      console.log('\n🔐 Hashing new password...');
      const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);
      console.log('✅ Password hashed successfully');
      console.log(`📊 Hash preview: ${hashedPassword.substring(0, 20)}...`);
      
      // Update user
      console.log('\n📝 Updating admin user...');
      const updatedUser = await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: {
          password: hashedPassword,
          role: 'admin',
          is_admin: true,
          verified: true,
          isActive: true
        }
      });
      
      console.log('✅ Admin user updated successfully!');
      console.log(`📊 Updated Role: ${updatedUser.role}`);
      console.log(`📊 Updated is_admin: ${(updatedUser as any).is_admin}`);
      console.log(`📊 Verified: ${updatedUser.verified}`);
      console.log(`📊 Active: ${updatedUser.isActive}`);
    }

    // Verify password works
    console.log('\n🔍 VERIFYING PASSWORD...');
    const verifyUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL }
    });
    
    if (verifyUser) {
      const isMatch = await bcrypt.compare(NEW_PASSWORD, verifyUser.password);
      console.log(`✅ Password verification: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
      
      if (!isMatch) {
        console.log('❌ WARNING: Password verification failed!');
        console.log('This should not happen. Check bcrypt implementation.');
      }
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ ADMIN PASSWORD RESET COMPLETE');
    console.log('═══════════════════════════════════════════════\n');
    console.log('LOGIN CREDENTIALS:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${NEW_PASSWORD}`);
    console.log('\nLogin at: http://localhost:3000/login\n');

  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
