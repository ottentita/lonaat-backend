const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function queryProducts() {
  try {
    console.log('🔍 Querying products table with raw SQL...\n');
    
    // Get total count using raw SQL
    const countResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM products`;
    const count = Number(countResult[0].count);
    console.log(`📊 Total products in database: ${count}\n`);
    
    if (count > 0) {
      // Get sample data (first 5 products)
      const products = await prisma.$queryRaw`
        SELECT id, name, price, network, category, user_id, is_active, created_at, 
               LEFT(affiliate_link, 80) as affiliate_link_preview
        FROM products 
        ORDER BY created_at DESC 
        LIMIT 5
      `;
      
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
        console.log(`Affiliate Link: ${product.affiliate_link_preview}`);
        console.log('');
      });
    } else {
      console.log('❌ Database is EMPTY - no products found');
    }
    
  } catch (error) {
    console.error('❌ Database query error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

queryProducts();
