const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateUserRole() {
  try {
    console.log('🔍 Checking current user role...');
    const user = await prisma.user.findUnique({
      where: { email: 'lonaat64@gmail.com' },
      select: { id: true, email: true, role: true }
    });
    
    console.log('Current user:', JSON.stringify(user, null, 2));
    
    if (user.role === 'admin') {
      console.log('✅ User already has admin role');
    } else {
      console.log('🔄 Updating user role to admin...');
      const updated = await prisma.user.update({
        where: { email: 'lonaat64@gmail.com' },
        data: { role: 'admin' },
        select: { id: true, email: true, role: true }
      });
      console.log('✅ Updated user:', JSON.stringify(updated, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole();
