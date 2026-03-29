import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateProducts() {
  try {
    console.log('🔧 Updating product approval status...');
    
    const result = await prisma.products.updateMany({
      where: { isApproved: false },
      data: { isApproved: true }
    });
    console.log('✅ Updated products:', result.count);
    
    const total = await prisma.products.count();
    const active = await prisma.products.count({ where: { isActive: true } });
    const approved = await prisma.products.count({ where: { isApproved: true } });
    
    console.log('📊 Product stats:');
    console.log('  Total:', total);
    console.log('  Active:', active);
    console.log('  Approved:', approved);
    
    // Show sample products
    const sampleProducts = await prisma.products.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        isActive: true,
        isApproved: true,
        affiliateLink: true,
        network: true
      }
    });
    
    console.log('📋 Sample products:');
    sampleProducts.forEach(p => {
      console.log(`  ${p.id}: ${p.name} (Active: ${p.isActive}, Approved: ${p.isApproved})`);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateProducts();
