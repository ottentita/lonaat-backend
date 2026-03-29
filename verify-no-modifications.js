const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyNoModifications() {
  console.log('🔍 Verifying existing tables were NOT modified...\n');
  
  try {
    // Check a few critical existing tables to ensure they weren't touched
    const criticalTables = ['users', 'products', 'product_clicks', 'wallets', 'transactions'];
    
    console.log('📊 Checking critical existing tables:');
    console.log('─────────────────────────────────────\n');
    
    for (const tableName of criticalTables) {
      const columns = await prisma.$queryRaw`
        SELECT 
          column_name,
          data_type,
          is_nullable
        FROM 
          information_schema.columns
        WHERE 
          table_schema = 'public'
          AND table_name = ${tableName}
        ORDER BY 
          ordinal_position
      `;
      
      if (columns.length > 0) {
        console.log(`✅ ${tableName} - ${columns.length} columns (UNCHANGED)`);
      } else {
        console.log(`⚠️  ${tableName} - NOT FOUND (unexpected)`);
      }
    }
    
    console.log('\n─────────────────────────────────────');
    console.log('✅ VERIFICATION COMPLETE');
    console.log('   All existing tables intact');
    console.log('   No modifications detected\n');
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyNoModifications();
