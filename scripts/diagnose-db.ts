import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function diagnoseDatabaseAndAdmin() {
  try {
    console.log('🔍 DATABASE DIAGNOSIS\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. IDENTIFY ACTIVE DATABASE
    const DATABASE_URL = process.env.DATABASE_URL || 'NOT_SET';
    console.log('ACTIVE_DB=' + DATABASE_URL);
    console.log('');

    // Parse database info for debugging
    if (DATABASE_URL !== 'NOT_SET') {
      try {
        const url = new URL(DATABASE_URL);
        console.log('📊 Database Details:');
        console.log('   Host:', url.hostname);
        console.log('   Port:', url.port);
        console.log('   Database:', url.pathname.substring(1));
        console.log('   User:', url.username);
        console.log('');
      } catch (e) {
        console.log('⚠️  Could not parse DATABASE_URL\n');
      }
    }

    // 2. VERIFY CONNECTION & COUNT USERS
    console.log('🔌 Testing database connection...');
    const userCount = await prisma.user.count();
    console.log('USER_COUNT=' + userCount);
    console.log('✅ Database connection successful\n');

    // 3. CHECK FOR ADMIN USER
    console.log('👤 Checking for admin user...');
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'admin'
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        createdAt: true
      }
    });

    if (adminUser) {
      // ADMIN EXISTS
      console.log('ADMIN_STATUS=FOUND');
      console.log('ADMIN_EMAIL=' + adminUser.email);
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ ADMIN USER EXISTS\n');
      console.log('📧 Email:', adminUser.email);
      console.log('👤 Role:', adminUser.role);
      console.log('🆔 ID:', adminUser.id);
      console.log('📅 Created:', adminUser.createdAt);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('ℹ️  Use this email to login with your existing password\n');
    } else {
      // NO ADMIN - CREATE ONE
      console.log('ADMIN_STATUS=NOT_FOUND');
      console.log('');
      console.log('⚠️  NO ADMIN USER FOUND - Creating default admin...\n');

      // 4. CREATE ADMIN USER
      const defaultEmail = 'admin@lonaat.com';
      const defaultPassword = 'Admin@123';

      // Check if email already exists (different role)
      const existingUser = await prisma.user.findUnique({
        where: { email: defaultEmail }
      });

      if (existingUser) {
        console.log('⚠️  User with email exists but role is not admin');
        console.log('   Updating role to admin...\n');
        
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        const updatedAdmin = await prisma.user.update({
          where: { email: defaultEmail },
          data: {
            role: 'admin',
            password: hashedPassword
          },
          select: {
            id: true,
            email: true,
            role: true,
            name: true
          }
        });

        console.log('ADMIN_STATUS=UPDATED');
        console.log('ADMIN_EMAIL=' + updatedAdmin.email);
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ ADMIN USER UPDATED\n');
        console.log('📧 Email: admin@lonaat.com');
        console.log('🔑 Password: Admin@123');
        console.log('👤 Role:', updatedAdmin.role);
        console.log('🆔 ID:', updatedAdmin.id);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      } else {
        // Create new admin user
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const newAdmin = await prisma.user.create({
          data: {
            email: defaultEmail,
            password: hashedPassword,
            role: 'admin',
            name: 'Admin',
            isActive: true
          },
          select: {
            id: true,
            email: true,
            role: true,
            name: true,
            createdAt: true
          }
        });

        console.log('ADMIN_STATUS=CREATED');
        console.log('ADMIN_EMAIL=' + newAdmin.email);
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ ADMIN USER CREATED\n');
        console.log('📧 Email: admin@lonaat.com');
        console.log('🔑 Password: Admin@123');
        console.log('👤 Role:', newAdmin.role);
        console.log('🆔 ID:', newAdmin.id);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }

      console.log('⚠️  IMPORTANT: Change this password after first login!\n');
    }

    // 5. FINAL CONFIRMATION
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ADMIN_READY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Summary
    console.log('📊 SUMMARY:');
    console.log('   Database: Connected ✅');
    console.log('   Total Users:', userCount);
    console.log('   Admin User: Ready ✅');
    console.log('   Login Email: admin@lonaat.com');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ ERROR OCCURRED:\n');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('\nStack:', error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseDatabaseAndAdmin()
  .then(() => {
    console.log('✅ Diagnosis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Diagnosis failed:', error.message);
    process.exit(1);
  });
