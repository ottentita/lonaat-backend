const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('Testing database connection...');
  
  try {
    const prisma = new PrismaClient();
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query successful:', result);
    
    // Check if users table exists
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'`;
    console.log('✅ Users table exists:', tables.length > 0);
    
    // Count users
    const userCount = await prisma.user.count();
    console.log('✅ User count:', userCount);
    
    await prisma.$disconnect();
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

testConnection();
