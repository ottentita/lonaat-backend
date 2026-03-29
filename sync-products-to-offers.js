const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function syncProductsToOffers() {
  try {
    console.log('🔄 PHASE 2 — STEP 2D: SYNC PRODUCTS → OFFERS\n');
    console.log('=' .repeat(70));
    
    // STEP 1: Count products
    console.log('\n📊 Counting products...\n');
    const productsCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM products WHERE is_active = true`;
    const totalProducts = Number(productsCount[0].count);
    console.log(`Total Active Products: ${totalProducts}`);
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 2: Insert products into offers
    console.log('\n📊 STEP 1: Inserting products into offers table...\n');
    
    const insertResult = await prisma.$executeRaw`
      INSERT INTO offers (
        name,
        title,
        slug,
        description,
        url,
        network,
        "externalOfferId",
        "trackingUrl",
        "categoryId",
        "isActive",
        "createdAt"
      )
      SELECT 
        name,
        name as title,
        LOWER(REPLACE(REPLACE(name, ' ', '-'), '/', '-')) || '-' || id as slug,
        COALESCE(description, 'Affiliate product') as description,
        COALESCE(affiliate_link, '') as url,
        COALESCE(network, 'unknown') as network,
        CAST(id AS TEXT) as "externalOfferId",
        COALESCE(affiliate_link, '') as "trackingUrl",
        1 as "categoryId",
        is_active as "isActive",
        created_at as "createdAt"
      FROM products
      WHERE is_active = true
        AND CAST(id AS TEXT) NOT IN (
          SELECT "externalOfferId" FROM offers WHERE "externalOfferId" IS NOT NULL
        )
    `;
    
    console.log(`✅ Inserted ${insertResult} offers from products`);
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 3: Verify count
    console.log('\n📊 STEP 2: Verifying offers count...\n');
    
    const offersCountResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM offers`;
    const totalOffers = Number(offersCountResult[0].count);
    console.log(`Total Offers: ${totalOffers}`);
    console.log(`Total Products: ${totalProducts}`);
    
    if (totalOffers >= totalProducts) {
      console.log('✅ Offers count matches or exceeds products count');
    } else {
      console.log(`⚠️ Offers count (${totalOffers}) is less than products count (${totalProducts})`);
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 4: Check mapping
    console.log('\n📊 STEP 3: Checking externalId mapping...\n');
    
    const sampleOffers = await prisma.$queryRaw`
      SELECT id, "externalOfferId", name, network
      FROM offers
      ORDER BY id
      LIMIT 5
    `;
    
    console.log('Sample Offers (externalId → id mapping):');
    sampleOffers.forEach((offer, i) => {
      console.log(`  ${i + 1}. Product ID ${offer.externalOfferId} → Offer ID ${offer.id}`);
      console.log(`     Name: ${offer.name}, Network: ${offer.network}`);
    });
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 5: Confirm all products mapped
    console.log('\n📊 STEP 4: Confirming all products are mapped...\n');
    
    const unmappedProducts = await prisma.$queryRaw`
      SELECT p.id, p.name
      FROM products p
      WHERE p.is_active = true
        AND CAST(p.id AS TEXT) NOT IN (
          SELECT "externalOfferId" FROM offers WHERE "externalOfferId" IS NOT NULL
        )
      LIMIT 5
    `;
    
    if (unmappedProducts.length === 0) {
      console.log('✅ All active products are mapped to offers!');
    } else {
      console.log(`⚠️ Found ${unmappedProducts.length} unmapped products:`);
      unmappedProducts.forEach((p, i) => {
        console.log(`  ${i + 1}. Product ID ${p.id}: ${p.name}`);
      });
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // FINAL SUMMARY
    console.log('\n✅ SYNC COMPLETE - SUMMARY:\n');
    console.log(`📦 Products (active): ${totalProducts}`);
    console.log(`📋 Offers (total): ${totalOffers}`);
    console.log(`🔗 Inserted: ${insertResult} new offers`);
    console.log(`✓ Mapping: product.id → offers.externalOfferId`);
    
    if (totalOffers > 0) {
      console.log('\n🎯 CLICK TRACKING NOW ENABLED!');
      console.log('   Users can now click products and clicks will be recorded.');
    }
    
    console.log('\n' + '=' .repeat(70));
    
  } catch (error) {
    console.error('❌ Sync error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncProductsToOffers();
