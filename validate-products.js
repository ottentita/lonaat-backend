const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function validateProducts() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 POST-IMPORT VALIDATION PHASE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 1. Check total products
    const totalProducts = await prisma.products.count({
      where: { isActive: true }
    });
    console.log(`\n📊 Total active products: ${totalProducts}`);

    // 2. Verify required fields
    console.log('\n🔍 VALIDATION 1: Required Fields');
    
    const missingAffiliateLink = await prisma.products.count({
      where: {
        isActive: true,
        OR: [
          { affiliateLink: null },
          { affiliateLink: '' }
        ]
      }
    });
    
    const missingNetwork = await prisma.products.count({
      where: {
        isActive: true,
        OR: [
          { network: null },
          { network: '' }
        ]
      }
    });

    console.log(`   ✅ Products with affiliate_link: ${totalProducts - missingAffiliateLink}/${totalProducts}`);
    console.log(`   ✅ Products with network: ${totalProducts - missingNetwork}/${totalProducts}`);
    
    if (missingAffiliateLink > 0) {
      console.log(`   ⚠️  WARNING: ${missingAffiliateLink} products missing affiliate_link`);
    }
    if (missingNetwork > 0) {
      console.log(`   ⚠️  WARNING: ${missingNetwork} products missing network`);
    }

    // 3. Check for duplicates by affiliateLink
    console.log('\n🔍 VALIDATION 2: Duplicate Detection');
    
    const duplicates = await prisma.$queryRaw`
      SELECT affiliate_link, COUNT(*) as count
      FROM products
      WHERE is_active = true AND affiliate_link IS NOT NULL
      GROUP BY affiliate_link
      HAVING COUNT(*) > 1
      LIMIT 10
    `;
    
    if (duplicates.length > 0) {
      console.log(`   ⚠️  WARNING: Found ${duplicates.length} duplicate affiliate links`);
      duplicates.forEach(d => {
        console.log(`      - ${d.affiliate_link.substring(0, 50)}... (${d.count} times)`);
      });
    } else {
      console.log(`   ✅ No duplicates found`);
    }

    // 4. Network distribution
    console.log('\n🔍 VALIDATION 3: Network Distribution');
    
    const networkStats = await prisma.$queryRaw`
      SELECT network, COUNT(*) as count
      FROM products
      WHERE is_active = true
      GROUP BY network
      ORDER BY count DESC
    `;
    
    networkStats.forEach(stat => {
      console.log(`   - ${stat.network || 'NULL'}: ${stat.count} products`);
    });

    // 5. Check click tracking table
    console.log('\n🔍 VALIDATION 4: Click Tracking');
    
    const clicksCount = await prisma.affiliate_clicks.count();
    console.log(`   📊 Total affiliate clicks: ${clicksCount}`);
    
    if (clicksCount > 0) {
      const recentClicks = await prisma.affiliate_clicks.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          product_id: true,
          user_id: true,
          created_at: true
        }
      });
      console.log(`   ✅ Recent clicks (last 5):`);
      recentClicks.forEach(click => {
        console.log(`      - Click ID: ${click.id}, Product: ${click.product_id}, User: ${click.user_id || 'anonymous'}`);
      });
    } else {
      console.log(`   ⚠️  No clicks tracked yet`);
    }

    // 6. Sample products for manual review
    console.log('\n🔍 VALIDATION 5: Sample Products');
    
    const sampleProducts = await prisma.products.findMany({
      where: { isActive: true },
      take: 3,
      select: {
        id: true,
        name: true,
        affiliateLink: true,
        network: true,
        price: true,
        category: true
      }
    });
    
    sampleProducts.forEach((product, index) => {
      console.log(`\n   Product ${index + 1}:`);
      console.log(`   - ID: ${product.id}`);
      console.log(`   - Name: ${product.name}`);
      console.log(`   - Network: ${product.network}`);
      console.log(`   - Price: $${product.price}`);
      console.log(`   - Category: ${product.category || 'N/A'}`);
      console.log(`   - Link: ${product.affiliateLink?.substring(0, 60)}...`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ VALIDATION COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Validation error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

validateProducts();
