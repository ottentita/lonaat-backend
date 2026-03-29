const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestOffers() {
  try {
    console.log('🔧 Creating test offers for products...\n');
    
    // Get first 10 products
    const products = await prisma.$queryRaw`
      SELECT id, name, network, affiliate_link 
      FROM products 
      LIMIT 10
    `;
    
    console.log(`Found ${products.length} products\n`);
    
    // Check if category exists
    let category = await prisma.categories.findFirst();
    if (!category) {
      console.log('Creating default category...');
      category = await prisma.categories.create({
        data: {
          name: 'General',
          slug: 'general'
        }
      });
    }
    
    console.log(`Using category: ${category.name} (ID: ${category.id})\n`);
    
    // Create offers for each product
    for (const product of products) {
      // Check if offer already exists
      const existing = await prisma.offers.findFirst({
        where: { externalId: String(product.id) }
      });
      
      if (existing) {
        console.log(`✓ Offer already exists for product ${product.id}: ${product.name}`);
        continue;
      }
      
      const offer = await prisma.offers.create({
        data: {
          title: product.name,
          description: `Affiliate product from ${product.network}`,
          network: product.network || 'unknown',
          externalId: String(product.id),
          trackingUrl: product.affiliate_link || '',
          categoryId: category.id,
        }
      });
      
      console.log(`✅ Created offer ${offer.id} for product ${product.id}: ${product.name}`);
    }
    
    console.log('\n✅ Test offers created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestOffers();
