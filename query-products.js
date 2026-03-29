const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function queryProducts() {
  try {
    console.log('🔍 Querying products table...\n');
    
    // Get total count
    const count = await prisma.product.count();
    console.log(`📊 Total products in database: ${count}\n`);
    
    if (count > 0) {
      // Get sample data (first 5 products)
      const products = await prisma.product.findMany({
        take: 5,
        orderBy: { created_at: 'desc' }
      });
      
      console.log('📦 Sample products:\n');
      products.forEach((product, index) => {
        console.log(`--- Product ${index + 1} ---`);
        console.log(`ID: ${product.id}`);
        console.log(`Name: ${product.name}`);
        console.log(`Price: ${product.price}`);
        console.log(`Network: ${product.network}`);
        console.log(`Category: ${product.category}`);
        console.log(`User ID: ${product.user_id}`);
        console.log(`Active: ${product.is_active}`);
        console.log(`Created: ${product.created_at}`);
        console.log(`Affiliate Link: ${product.affiliate_link?.substring(0, 50)}...`);
        console.log('');
      });
    } else {
      console.log('❌ Database is EMPTY - no products found');
    }
    
  } catch (error) {
    console.error('❌ Database query error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

queryProducts();
