const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAIIndexes() {
  console.log('🔍 Checking existing indexes on AI tables...\n');
  
  try {
    const aiTables = ['ai_memory', 'ai_logs', 'ai_rules', 'ai_pipeline_runs'];
    
    for (const tableName of aiTables) {
      console.log(`📊 Indexes on ${tableName}:`);
      console.log('─────────────────────────────────────');
      
      const indexes = await prisma.$queryRaw`
        SELECT 
          indexname,
          indexdef
        FROM 
          pg_indexes
        WHERE 
          schemaname = 'public'
          AND tablename = ${tableName}
        ORDER BY 
          indexname
      `;
      
      if (indexes.length === 0) {
        console.log('  ⚠️  No indexes found\n');
      } else {
        for (const idx of indexes) {
          console.log(`  ✓ ${idx.indexname}`);
          console.log(`    ${idx.indexdef}\n`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking indexes:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAIIndexes();
