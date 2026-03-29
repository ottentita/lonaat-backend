const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyProducts() {
  try {
    console.log('🔍 PHASE 1 - STEP 1: VERIFY REAL PRODUCTS IN DATABASE\n');
    console.log('=' .repeat(70));
    
    // QUERY 1: Count total products
    console.log('\n📊 QUERY 1: SELECT COUNT(*) FROM products;\n');
    const countResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM products`;
    const totalCount = Number(countResult[0].count);
    console.log(`Total Products: ${totalCount}`);
    
    console.log('\n' + '=' .repeat(70));
    
    // QUERY 2: Get sample products with specific fields
    console.log('\n📋 QUERY 2: SELECT id, name, affiliate_link, user_id FROM products LIMIT 10;\n');
    const products = await prisma.$queryRaw`
      SELECT id, name, affiliate_link, user_id as "ownerId", network, category, is_active, created_at
      FROM products 
      ORDER BY id 
      LIMIT 10
    `;
    
    console.log('Sample Products:\n');
    products.forEach((product, index) => {
      console.log(`--- Product ${index + 1} ---`);
      console.log(`ID: ${product.id}`);
      console.log(`Name: ${product.name}`);
      console.log(`Network: ${product.network}`);
      console.log(`Category: ${product.category}`);
      console.log(`Owner ID (user_id): ${product.ownerId === null ? 'NULL (no owner)' : product.ownerId}`);
      console.log(`Active: ${product.is_active}`);
      console.log(`Affiliate Link: ${product.affiliate_link?.substring(0, 80)}...`);
      console.log(`Created: ${product.created_at}`);
      console.log('');
    });
    
    console.log('=' .repeat(70));
    
    // QUERY 3: Count AWIN products specifically
    console.log('\n📊 QUERY 3: Count AWIN products\n');
    const awinCountResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE network = 'AWIN'
    `;
    const awinCount = Number(awinCountResult[0].count);
    console.log(`AWIN Products: ${awinCount}`);
    
    // QUERY 4: Check ownership distribution
    console.log('\n📊 QUERY 4: Ownership distribution\n');
    const ownershipResult = await prisma.$queryRaw`
      SELECT 
        user_id,
        COUNT(*) as product_count
      FROM products
      GROUP BY user_id
      ORDER BY product_count DESC
    `;
    
    console.log('Products by Owner:');
    ownershipResult.forEach(row => {
      const ownerId = row.user_id === null ? 'NULL (System/No Owner)' : `User ID: ${row.user_id}`;
      console.log(`  ${ownerId} → ${row.product_count} products`);
    });
    
    console.log('\n' + '=' .repeat(70));
    console.log('\n✅ VERIFICATION SUMMARY:\n');
    console.log(`1. Total Products in Database: ${totalCount}`);
    console.log(`2. AWIN Products: ${awinCount}`);
    console.log(`3. Products with Owner ID: ${ownershipResult.find(r => r.user_id !== null)?.product_count || 0}`);
    console.log(`4. Products without Owner (NULL): ${ownershipResult.find(r => r.user_id === null)?.product_count || 0}`);
    console.log(`5. Confirmation: ${awinCount === 60 ? '✅ YES' : '❌ NO'} - There are ~60 AWIN products`);
    console.log(`6. Owner Status: ${ownershipResult.find(r => r.user_id === null) ? '⚠️ Most products have NULL owner (system-imported)' : '✅ Products have owners'}`);
    
    console.log('\n' + '=' .repeat(70));
    
  } catch (error) {
    console.error('❌ Database query error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyProducts();
