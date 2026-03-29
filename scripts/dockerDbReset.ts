import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'lonaat64@gmail.com';
const ADMIN_PASSWORD = 'Far@el11';

async function dockerDbReset() {
  console.log('🔧 DOCKER DB RESET - STARTING\n');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Docker DB connected\n');

    // STEP 1: Truncate users
    console.log('STEP 1: TRUNCATE USERS TABLE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" RESTART IDENTITY CASCADE');
    console.log('✅ Users table wiped\n');

    // Verify empty
    const count: any = await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM "User"`;
    console.log('User count after truncate:', count[0]?.cnt?.toString() || '0');

    // STEP 2: Generate bcrypt hash
    console.log('\nSTEP 2: GENERATE BCRYPT HASH');
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    console.log('Hash generated:', hash);

    // STEP 3: Create admin
    console.log('\nSTEP 3: CREATE ADMIN USER');
    const admin = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        password: hash,
        name: 'Administrator',
        role: 'admin',
        verified: true,
        isActive: true,
        balance: 0
      }
    });
    console.log('✅ Admin created! ID:', admin.id);

    // STEP 4: Verify
    console.log('\nSTEP 4: VERIFY ADMIN');
    const verify = await bcrypt.compare(ADMIN_PASSWORD, admin.password);
    console.log('Password verify:', verify ? '✅ PASS' : '❌ FAIL');

    const finalCount: any = await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM "User"`;
    console.log('Total users in DB:', finalCount[0]?.cnt?.toString());

    console.log('\n═══════════════════════════════════════════════');
    console.log('✔ Docker DB connected');
    console.log('✔ Users reset');
    console.log('✔ Admin created');
    console.log('✔ Email:', ADMIN_EMAIL);
    console.log('✔ Password:', ADMIN_PASSWORD);
    console.log('✔ Hash:', hash);
    console.log('═══════════════════════════════════════════════');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

dockerDbReset();
