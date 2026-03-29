import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function adminConsolidation() {
  console.log('🔐 ADMIN AUTHORITY CONSOLIDATION\n');
  console.log('═'.repeat(70));
  
  try {
    // PHASE 1: REMOVE OLD ADMINS
    console.log('\n📋 PHASE 1: REMOVE OLD ADMINS\n');
    
    const oldAdminEmails = ['system@lonaat.com', 'admin@lonaat.com'];
    
    for (const email of oldAdminEmails) {
      const oldAdmin = await prisma.user.findUnique({
        where: { email }
      });
      
      if (oldAdmin) {
        console.log(`Found old admin: ${oldAdmin.email}`);
        console.log(`Current role: ${oldAdmin.role}`);
        
        if (oldAdmin.role === 'admin') {
          await prisma.user.update({
            where: { email },
            data: { role: 'user' }
          });
          console.log(`✅ Demoted ${email} to user role\n`);
        } else {
          console.log(`✅ Already demoted (role is not admin)\n`);
        }
      } else {
        console.log(`ℹ️  ${email} not found in database\n`);
      }
    }
    
    // PHASE 2: CREATE OR UPDATE MAIN ADMIN
    console.log('═'.repeat(70));
    console.log('\n📋 PHASE 2: CREATE OR UPDATE MAIN ADMIN\n');
    
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'titasembi@gmail.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Far@el11';
    const ADMIN_NAME = process.env.ADMIN_NAME || 'OTTEN TITA';
    
    console.log(`Target admin: ${ADMIN_EMAIL}`);
    
    const existingAdmin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL }
    });
    
    if (existingAdmin) {
      console.log(`User exists: ${existingAdmin.email}`);
      console.log(`Current role: ${existingAdmin.role}`);
      
      if (existingAdmin.role !== 'admin') {
        // Update password and promote to admin
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        
        await prisma.user.update({
          where: { email: ADMIN_EMAIL },
          data: {
            role: 'admin',
            password: hashedPassword,
            name: ADMIN_NAME
          }
        });
        console.log('✅ Updated user to admin role with new password\n');
      } else {
        // Just update password to ensure it matches .env
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        
        await prisma.user.update({
          where: { email: ADMIN_EMAIL },
          data: {
            password: hashedPassword,
            name: ADMIN_NAME
          }
        });
        console.log('✅ Already admin - updated password to match .env\n');
      }
    } else {
      console.log(`User does not exist - creating new admin`);
      
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          password: hashedPassword,
          role: 'admin',
          name: ADMIN_NAME,
          tokenBalance: 1000,
          plan: 'premium'
        }
      });
      console.log('✅ Created new admin user\n');
    }
    
    // PHASE 6: VERIFY SINGLE ADMIN
    console.log('═'.repeat(70));
    console.log('\n📋 PHASE 6: VERIFY SINGLE ADMIN\n');
    
    const adminCount = await prisma.user.count({
      where: { role: 'admin' }
    });
    
    console.log(`Admin count: ${adminCount}`);
    
    if (adminCount === 1) {
      console.log('✅ Single admin verified\n');
    } else {
      console.log(`⚠️  WARNING: ${adminCount} admins found (expected 1)\n`);
    }
    
    // List all admins
    const allAdmins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true, email: true, role: true, name: true }
    });
    
    console.log('Current admin users:');
    allAdmins.forEach(admin => {
      console.log(`  - ${admin.email} (${admin.name || 'no name'})`);
    });
    
    // FINAL OUTPUT
    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 FINAL STATUS\n');
    
    console.log('ADMIN_FINAL:');
    console.log(`  email: ${ADMIN_EMAIL}`);
    console.log(`  role: admin`);
    console.log(`  status: ACTIVE ✅\n`);
    
    console.log('OLD_ADMINS:');
    for (const email of oldAdminEmails) {
      const updatedOldAdmin = await prisma.user.findUnique({
        where: { email },
        select: { email: true, role: true }
      });
      if (updatedOldAdmin) {
        console.log(`  ${updatedOldAdmin.email} → role: ${updatedOldAdmin.role} ✅`);
      } else {
        console.log(`  ${email} → NOT FOUND`);
      }
    }
    console.log('');
    
    console.log(`ADMIN_COUNT: ${adminCount}`);
    
    if (adminCount === 1) {
      console.log('\n✅ ADMIN CONSOLIDATION COMPLETE');
    } else {
      console.log('\n⚠️  ADMIN CONSOLIDATION INCOMPLETE - Multiple admins detected');
    }
    
    console.log('\n' + '═'.repeat(70));
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

adminConsolidation()
  .then(() => {
    console.log('\n✅ Script complete\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
