// Script to ensure admin user exists with proper password hashing
import { prisma } from '../prisma';
const bcrypt = require('bcrypt');

const ADMIN_EMAIL = 'titasembi@gmail.com';
const ADMIN_PASSWORD = 'Far@el11';

async function ensureAdmin() {
  try {
    console.log('🔍 Checking if admin user exists...');
    
    // Check if admin user exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      console.log('📊 Admin role:', existingAdmin.role);
      
      // Update role to admin if not already set
      if (existingAdmin.role !== 'admin') {
        console.log('🔄 Updating user role to admin...');
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { role: 'admin' }
        });
        console.log('✅ Role updated to admin');
      }
      
      // Verify password hash exists
      if (!existingAdmin.password) {
        console.log('⚠️ Admin user has no password hash, updating...');
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { password: hashedPassword }
        });
        console.log('✅ Password hash updated');
      }
      
      return existingAdmin;
    }

    // Create admin user if it doesn't exist
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    
    const adminUser = await prisma.user.create({
      data: {
        name: 'Administrator',
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin'
      }
    });

    console.log('✅ Admin user created successfully');
    console.log('📧 Email:', adminUser.email);
    console.log('👤 Name:', adminUser.name);
    console.log('🔑 Role:', adminUser.role);
    
    return adminUser;
    
  } catch (error) {
    console.error('❌ Error ensuring admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
ensureAdmin()
  .then(() => {
    console.log('🎉 Admin user setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Admin user setup failed:', error);
    process.exit(1);
  });
