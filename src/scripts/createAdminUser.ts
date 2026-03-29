const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const email = 'titasembi@gmail.com';
    const password = 'Far@el11';
    
    console.log('🔐 Creating admin user...');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    
    // Generate fresh hash
    const hash = await bcrypt.hash(password, 10);
    console.log('🔒 Generated hash:', hash);
    
    // Delete existing user if any
    await prisma.user.deleteMany({
      where: { email }
    });
    console.log('🗑️ Deleted existing user (if any)');
    
    // Create new admin user
    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        name: 'Administrator',
        role: 'admin'
      }
    });
    
    console.log('✅ Admin user created successfully:');
    console.log('  - ID:', user.id);
    console.log('  - Email:', user.email);
    console.log('  - Role:', user.role);
    console.log('  - Created:', user.createdAt);
    
    // Test password verification
    const isValid = await bcrypt.compare(password, hash);
    console.log('🔍 Password verification test:', isValid);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
