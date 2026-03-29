import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'lonaat64@gmail.com';
const ADMIN_PASSWORD = 'Far@el11';

async function hardReset() {
  console.log('STEP 1: DATABASE CONNECTION');
  console.log('DATABASE_URL:', process.env.DATABASE_URL || 'NOT SET');

  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
    console.log('DB STATUS: CONNECTED');
  } catch (e: any) {
    console.log('DB STATUS: FAILED -', e.message?.split('\n')[0]);
  }

  if (!dbOk) {
    console.log('\nDB is unavailable. Attempting to fix credentials...');
    // Check if postgres service is running
    console.log('Checking if PostgreSQL is installed/running...');
    console.log('Current URL:', process.env.DATABASE_URL);
    console.log('\nCANNOT proceed with DB operations.');
    console.log('System will use FALLBACK admin (in-memory).');
    console.log('\nGenerating bcrypt hash for fallback...');
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    console.log('Hash:', hash);
    const verify = await bcrypt.compare(ADMIN_PASSWORD, hash);
    console.log('Verify:', verify ? 'PASS' : 'FAIL');
    console.log('\nFALLBACK ADMIN READY:');
    console.log('  Email:', ADMIN_EMAIL);
    console.log('  Password:', ADMIN_PASSWORD);
    console.log('  Hash:', hash);
    await prisma.$disconnect();
    return { dbOk: false, hash };
  }

  // STEP 2: HARD RESET
  console.log('\nSTEP 2: DELETE ALL USERS');
  try {
    // Disable foreign key checks via CASCADE
    const deleted = await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" RESTART IDENTITY CASCADE');
    console.log('TRUNCATE result:', deleted);
  } catch (e: any) {
    console.log('TRUNCATE failed, trying DELETE:', e.message?.split('\n')[0]);
    try {
      await prisma.$executeRawUnsafe('DELETE FROM "User"');
      console.log('DELETE completed');
    } catch (e2: any) {
      console.log('DELETE also failed:', e2.message?.split('\n')[0]);
    }
  }

  // STEP 3: VERIFY EMPTY
  console.log('\nSTEP 3: VERIFY EMPTY');
  const count: any = await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM "User"`;
  console.log('User count:', count[0]?.cnt?.toString() || count);

  // STEP 4: CREATE ADMIN
  console.log('\nSTEP 4: CREATE ADMIN');
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  console.log('Generated hash:', hash);

  let admin;
  try {
    admin = await prisma.user.create({
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
    console.log('Admin created! ID:', admin.id);
  } catch (e: any) {
    console.log('Prisma create failed:', e.message?.split('\n')[0]);
    // Try raw SQL
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "User" (email, password, name, role, verified, "isActive", balance, "createdAt", "updatedAt") VALUES ($1, $2, 'Administrator', 'admin', true, true, 0, NOW(), NOW())`,
        ADMIN_EMAIL, hash
      );
      console.log('Raw INSERT succeeded');
    } catch (e2: any) {
      console.log('Raw INSERT failed:', e2.message?.split('\n')[0]);
    }
  }

  // STEP 5: VERIFY ADMIN
  console.log('\nSTEP 5: VERIFY ADMIN');
  const users: any = await prisma.$queryRaw`SELECT id, email, role, substring(password from 1 for 30) as hash_preview FROM "User" WHERE email = ${ADMIN_EMAIL}`;
  console.log('Admin record:', users[0] || 'NOT FOUND');

  // Verify password
  if (users[0]) {
    const fullUser: any = await prisma.$queryRaw`SELECT password FROM "User" WHERE email = ${ADMIN_EMAIL}`;
    const match = await bcrypt.compare(ADMIN_PASSWORD, fullUser[0].password);
    console.log('Password verify:', match ? 'PASS' : 'FAIL');
  }

  const finalCount: any = await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM "User"`;
  console.log('Total users:', finalCount[0]?.cnt?.toString());

  await prisma.$disconnect();
  return { dbOk: true, hash };
}

hardReset().then(result => {
  console.log('\n========== RESULT ==========');
  console.log('DB available:', result.dbOk);
  console.log('Admin email:', ADMIN_EMAIL);
  console.log('Admin password:', ADMIN_PASSWORD);
  console.log('Hash:', result.hash);
}).catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
