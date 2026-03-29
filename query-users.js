const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function queryUsers() {
  try {
    console.log('🔍 Querying users table...\n');
    
    // Get all users with id, email, and role
    const users = await prisma.$queryRaw`
      SELECT id, email, role 
      FROM users 
      ORDER BY id
    `;
    
    console.log(`📊 Total users in database: ${users.length}\n`);
    
    console.log('👥 All users:\n');
    users.forEach((user, index) => {
      const isAdmin = user.role === 'admin';
      console.log(`${isAdmin ? '👑' : '👤'} User ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}${isAdmin ? ' ⭐ ADMIN' : ''}`);
      console.log('');
    });
    
    // Find admin user
    const admin = users.find(u => u.role === 'admin');
    
    if (admin) {
      console.log('=' .repeat(50));
      console.log('🎯 ADMIN USER IDENTIFIED:');
      console.log('=' .repeat(50));
      console.log(`Admin Email: ${admin.email}`);
      console.log(`Admin ID: ${admin.id}`);
      console.log('=' .repeat(50));
    } else {
      console.log('❌ No admin user found in database');
    }
    
  } catch (error) {
    console.error('❌ Database query error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

queryUsers();
