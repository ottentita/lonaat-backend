const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('Far@el11', 10);
    const admin = await prisma.user.create({
      data: {
        name: 'Administrator',
        email: 'lonaat64@gmail.com',
        password: hashedPassword,
        role: 'admin'
      }
    });
    console.log('Admin created:', admin);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
