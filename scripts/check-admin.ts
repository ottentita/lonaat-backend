import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkOrCreateAdmin() {
  try {
    console.log('🔍 Checking for admin user...\n');

    // Check if admin user exists
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
      console.log('✅ ADMIN USER EXISTS\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Email:', adminUser.email);
      console.log('👤 Role:', adminUser.role);
      console.log('🆔 ID:', adminUser.id);
      console.log('📅 Created:', adminUser.createdAt);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('ℹ️  Use this email to login with your existing password\n');
    } else {
      console.log('⚠️  NO ADMIN USER FOUND\n');
      console.log('Creating default admin user...\n');

      // Hash the default password
      const hashedPassword = await bcrypt.hash('Admin@123', 10);

      // Create admin user
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@lonaat.com',
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

      console.log('✅ ADMIN USER CREATED\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Email: admin@lonaat.com');
      console.log('🔑 Password: Admin@123');
      console.log('👤 Role:', newAdmin.role);
      console.log('🆔 ID:', newAdmin.id);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('⚠️  IMPORTANT: Change this password after first login!\n');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkOrCreateAdmin()
  .then(() => {
    console.log('✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
