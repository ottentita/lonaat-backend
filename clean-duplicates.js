/**
 * CLEAN DUPLICATE PRODUCT_CONVERSIONS
 * Removes duplicate reference values before migration
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDuplicates() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 CLEANING DUPLICATE PRODUCT_CONVERSIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Find duplicates
    console.log('📊 Step 1: Finding duplicates...');
    const duplicates = await prisma.$queryRaw`
      SELECT reference, COUNT(*) as count
      FROM product_conversions
      GROUP BY reference
      HAVING COUNT(*) > 1
    `;

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found - database is clean!');
      return;
    }

    console.log(`⚠️  Found ${duplicates.length} duplicate references:`);
    duplicates.forEach(d => {
      console.log(`   - ${d.reference}: ${d.count} records`);
    });

    // Step 2: Delete duplicates (keep MIN id)
    console.log('\n🗑️  Step 2: Deleting duplicates (keeping oldest record)...');
    
    const result = await prisma.$executeRaw`
      DELETE FROM product_conversions
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM product_conversions
        GROUP BY reference
      )
    `;

    console.log(`✅ Deleted ${result} duplicate records`);

    // Step 3: Verify cleanup
    console.log('\n🔍 Step 3: Verifying cleanup...');
    const remaining = await prisma.$queryRaw`
      SELECT reference, COUNT(*) as count
      FROM product_conversions
      GROUP BY reference
      HAVING COUNT(*) > 1
    `;

    if (remaining.length === 0) {
      console.log('✅ All duplicates removed successfully!');
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 DATABASE IS CLEAN - READY FOR MIGRATION');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\nNext step: Run "npx prisma db push"');
    } else {
      console.log('⚠️  Some duplicates still remain:');
      remaining.forEach(d => {
        console.log(`   - ${d.reference}: ${d.count} records`);
      });
    }

  } catch (error) {
    console.error('❌ Error cleaning duplicates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanDuplicates()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
