import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function fixAdminRole() {
  try {
    console.log('🔧 FIXING ADMIN ROLE AND PERMISSIONS');
    console.log('=====================================\n');

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'titasembi@gmail.com';
    
    console.log(`📧 Admin Email: ${ADMIN_EMAIL}`);

    // Find admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found!');
      console.log('Please run the ensureAdmin script first.');
      process.exit(1);
    }

    console.log(`\n✅ Admin user found: ${adminUser.email}`);
    console.log(`📊 Current role: ${adminUser.role}`);
    console.log(`📊 Current is_admin: ${(adminUser as any).is_admin}`);

    // Update admin user with correct role and is_admin flag
    const updatedUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        role: 'admin',
        is_admin: true,
        verified: true,
        isActive: true
      }
    });

    console.log('\n✅ Admin user updated successfully!');
    console.log(`📊 New role: ${updatedUser.role}`);
    console.log(`📊 New is_admin: ${(updatedUser as any).is_admin}`);
    console.log(`📊 Verified: ${updatedUser.verified}`);
    console.log(`📊 Active: ${updatedUser.isActive}`);

    // Verify the update
    const verifyUser = await prisma.user.findUnique({
      where: { id: adminUser.id }
    });

    console.log('\n🔍 VERIFICATION:');
    console.log(`✅ Role is 'admin': ${verifyUser?.role === 'admin'}`);
    console.log(`✅ is_admin is true: ${(verifyUser as any)?.is_admin === true}`);
    console.log(`✅ Verified: ${verifyUser?.verified === true}`);
    console.log(`✅ Active: ${verifyUser?.isActive === true}`);

    console.log('\n🎉 Admin role fix complete!');
    console.log('\n📋 ADMIN PERMISSIONS:');
    console.log('✅ Unlimited AI generation');
    console.log('✅ Unlimited tokens');
    console.log('✅ Bypass all subscription checks');
    console.log('✅ Access to all features');
    console.log('✅ No payment requirements');

  } catch (error) {
    console.error('❌ Error fixing admin role:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminRole();
