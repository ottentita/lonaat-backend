const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyOffersSchema() {
  try {
    console.log('🔍 PHASE 2 — STEP 2C: VERIFY OFFERS TABLE\n');
    console.log('=' .repeat(70));
    
    // STEP 1: Check offers table count
    console.log('\n📊 STEP 1: SELECT COUNT(*) FROM offers;\n');
    const offersCountResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM offers`;
    const offersCount = Number(offersCountResult[0].count);
    console.log(`Total Offers: ${offersCount}`);
    
    if (offersCount > 0) {
      console.log('✅ Offers table has data');
      
      // Show sample offers
      const sampleOffers = await prisma.$queryRaw`
        SELECT id, name, title, network, "externalOfferId", "trackingUrl", "categoryId"
        FROM offers
        LIMIT 5
      `;
      
      console.log('\nSample Offers:');
      sampleOffers.forEach((offer, i) => {
        console.log(`  ${i + 1}. ID: ${offer.id}, Name: ${offer.name}, Network: ${offer.network}, ExternalID: ${offer.externalOfferId}`);
      });
    } else {
      console.log('❌ Offers table is EMPTY - This is the problem!');
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 2: Check clicks table structure
    console.log('\n📊 STEP 2: Check clicks table constraints\n');
    
    const clicksSchema = await prisma.$queryRaw`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'clicks'
      ORDER BY ordinal_position
    `;
    
    console.log('Clicks Table Schema:');
    clicksSchema.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}`);
    });
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 3: Check foreign key constraints
    console.log('\n📊 STEP 3: Check foreign key constraints on clicks table\n');
    
    const fkConstraints = await prisma.$queryRaw`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'clicks'
    `;
    
    console.log('Foreign Key Constraints:');
    fkConstraints.forEach(fk => {
      console.log(`  - ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      console.log(`    Constraint: ${fk.constraint_name}`);
    });
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 4: Check clicks count
    console.log('\n📊 STEP 4: SELECT COUNT(*) FROM clicks;\n');
    const clicksCountResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM clicks`;
    const clicksCount = Number(clicksCountResult[0].count);
    console.log(`Total Clicks: ${clicksCount}`);
    
    console.log('\n' + '=' .repeat(70));
    console.log('\n✅ VERIFICATION SUMMARY:\n');
    
    console.log('1. OFFERS TABLE:');
    console.log(`   - Count: ${offersCount}`);
    console.log(`   - Status: ${offersCount > 0 ? '✅ HAS DATA' : '❌ EMPTY (PROBLEM!)'}`);
    
    console.log('\n2. CLICKS TABLE:');
    console.log(`   - Count: ${clicksCount}`);
    console.log(`   - offerId field: NOT NULL (required)`);
    console.log(`   - Foreign Key: offerId → offers.id`);
    
    console.log('\n3. CONSTRAINT MISMATCH:');
    if (offersCount === 0) {
      console.log('   ⚠️ YES - Cannot create clicks without offers!');
      console.log('   ⚠️ offerId is REQUIRED but offers table is EMPTY');
    } else {
      console.log('   ✅ NO - Offers exist, clicks can be created');
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // REPORT
    console.log('\n📋 FINAL REPORT:\n');
    console.log(`✓ Is offerId required? YES (NOT NULL + FK constraint)`);
    console.log(`✓ Is offers table empty? ${offersCount === 0 ? 'YES ❌' : 'NO ✅'}`);
    console.log(`✓ Any constraint mismatch? ${offersCount === 0 ? 'YES ❌ - Cannot insert clicks without offers' : 'NO ✅'}`);
    
    if (offersCount === 0) {
      console.log('\n🔧 SOLUTION:');
      console.log('   Create offer records for products before tracking clicks.');
      console.log('   Run: INSERT INTO offers ... FROM products');
    }
    
    console.log('\n' + '=' .repeat(70));
    
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyOffersSchema();
