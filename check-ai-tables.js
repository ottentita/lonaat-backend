const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAITables() {
  console.log('🔍 Checking for AI system tables...\n');
  
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        table_name,
        table_schema
      FROM 
        information_schema.tables
      WHERE 
        table_schema = 'public'
        AND table_name IN ('ai_memory', 'ai_logs', 'ai_rules', 'ai_pipeline_runs')
      ORDER BY 
        table_name
    `;
    
    console.log('📊 Query Results:');
    console.log('─────────────────────────────────────');
    
    if (result.length === 0) {
      console.log('✅ NONE of the AI tables exist');
      console.log('\nTables to create:');
      console.log('  - ai_memory');
      console.log('  - ai_logs');
      console.log('  - ai_rules');
      console.log('  - ai_pipeline_runs');
      console.log('\n✅ SAFE TO PROCEED with Phase 1 (Database Creation)');
    } else {
      console.log(`⚠️  Found ${result.length} existing AI table(s):\n`);
      
      for (const table of result) {
        console.log(`  ✓ ${table.table_name} (schema: ${table.table_schema})`);
      }
      
      console.log('\n🚨 ACTION REQUIRED:');
      console.log('  → DO NOT recreate existing tables');
      console.log('  → Check current schema');
      console.log('  → Propose safe adjustment\n');
      
      // Get schema for existing tables
      for (const table of result) {
        console.log(`\n📋 Schema for ${table.table_name}:`);
        console.log('─────────────────────────────────────');
        
        const columns = await prisma.$queryRaw`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM 
            information_schema.columns
          WHERE 
            table_schema = 'public'
            AND table_name = ${table.table_name}
          ORDER BY 
            ordinal_position
        `;
        
        for (const col of columns) {
          console.log(`  ${col.column_name.padEnd(20)} ${col.data_type.padEnd(15)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'.padEnd(8)} ${col.column_default || ''}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAITables();
