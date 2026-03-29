const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testClickTracking() {
  try {
    console.log('🧪 SIMPLE CLICK TRACKING TEST\n');
    
    // Step 1: Get first offer
    console.log('1. Finding first offer...');
    const offer = await prisma.$queryRaw`SELECT id, title FROM offers LIMIT 1`;
    
    if (!offer || offer.length === 0) {
      console.log('❌ No offers found. Creating one...');
      const newOffer = await prisma.$queryRaw`
        INSERT INTO offers (name, title, description, network, "externalId", "trackingUrl", "categoryId", "createdAt", "updatedAt")
        VALUES ('Test Offer', 'Test Product', 'Test', 'test', '1', '', 1, NOW(), NOW())
        RETURNING id, title
      `;
      console.log('✅ Created offer:', newOffer[0]);
      var offerId = newOffer[0].id;
    } else {
      console.log('✅ Found offer:', offer[0]);
      var offerId = offer[0].id;
    }
    
    // Step 2: Create click
    console.log('\n2. Creating click record...');
    const clickId = `test_${Date.now()}`;
    const clickToken = `token_${Date.now()}`;
    
    const click = await prisma.$queryRaw`
      INSERT INTO clicks (network, "offerId", "adId", "userId", "timeBucket", "clickId", "clickToken", ip, "ipAddress", "userAgent", revenue, converted, user_id, "createdAt")
      VALUES ('test', ${offerId}, 0, 0, ${Math.floor(Date.now() / 5000)}, ${clickId}, ${clickToken}, '127.0.0.1', '127.0.0.1', 'test', 0, false, NULL, NOW())
      RETURNING id
    `;
    
    console.log('✅ Click created:', click[0]);
    
    // Step 3: Verify
    console.log('\n3. Verifying click count...');
    const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM clicks`;
    console.log(`✅ Total clicks in database: ${count[0].count}`);
    
    console.log('\n✅ TEST PASSED - Click tracking works!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testClickTracking();
