const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyDashboardDB() {
  try {
    console.log('🔍 PHASE 2 — DASHBOARD DATABASE AUDIT\n');
    console.log('=' .repeat(70));
    
    // CHECK 1: Active Products
    console.log('\n📊 CHECK 1: SELECT COUNT(*) FROM products WHERE is_active = true;\n');
    const activeProductsResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM products WHERE is_active = true
    `;
    const activeProducts = Number(activeProductsResult[0].count);
    console.log(`Active Products: ${activeProducts}`);
    
    console.log('\n' + '=' .repeat(70));
    
    // CHECK 2: Clicks table
    console.log('\n📊 CHECK 2: SELECT COUNT(*) FROM clicks; (if exists)\n');
    try {
      const clicksResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM clicks`;
      const totalClicks = Number(clicksResult[0].count);
      console.log(`✅ Clicks table EXISTS`);
      console.log(`Total Clicks: ${totalClicks}`);
      
      // Sample clicks
      if (totalClicks > 0) {
        const sampleClicks = await prisma.$queryRaw`
          SELECT id, user_id, product_id, created_at 
          FROM clicks 
          ORDER BY created_at DESC 
          LIMIT 3
        `;
        console.log('\nSample Clicks:');
        sampleClicks.forEach((click, i) => {
          console.log(`  ${i + 1}. ID: ${click.id}, User: ${click.user_id}, Product: ${click.product_id}, Date: ${click.created_at}`);
        });
      }
    } catch (err) {
      console.log(`❌ Clicks table DOES NOT EXIST`);
      console.log(`   Error: ${err.message}`);
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // CHECK 3: Affiliate Clicks table
    console.log('\n📊 CHECK 3: SELECT COUNT(*) FROM affiliate_clicks; (alternative)\n');
    try {
      const affiliateClicksResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM affiliate_clicks`;
      const totalAffiliateClicks = Number(affiliateClicksResult[0].count);
      console.log(`✅ affiliate_clicks table EXISTS`);
      console.log(`Total Affiliate Clicks: ${totalAffiliateClicks}`);
      
      if (totalAffiliateClicks > 0) {
        const sampleClicks = await prisma.$queryRaw`
          SELECT id, user_id, product_id, network, created_at 
          FROM affiliate_clicks 
          ORDER BY created_at DESC 
          LIMIT 3
        `;
        console.log('\nSample Affiliate Clicks:');
        sampleClicks.forEach((click, i) => {
          console.log(`  ${i + 1}. ID: ${click.id}, User: ${click.user_id}, Product: ${click.product_id}, Network: ${click.network}`);
        });
      }
    } catch (err) {
      console.log(`❌ affiliate_clicks table DOES NOT EXIST`);
      console.log(`   Error: ${err.message}`);
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // CHECK 4: Commissions/Earnings table
    console.log('\n📊 CHECK 4: SELECT COUNT(*) FROM commissions; (if exists)\n');
    try {
      const commissionsResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM commissions`;
      const totalCommissions = Number(commissionsResult[0].count);
      console.log(`✅ commissions table EXISTS`);
      console.log(`Total Commissions: ${totalCommissions}`);
      
      if (totalCommissions > 0) {
        const sampleCommissions = await prisma.$queryRaw`
          SELECT id, user_id, amount, status, created_at 
          FROM commissions 
          ORDER BY created_at DESC 
          LIMIT 3
        `;
        console.log('\nSample Commissions:');
        sampleCommissions.forEach((comm, i) => {
          console.log(`  ${i + 1}. ID: ${comm.id}, User: ${comm.user_id}, Amount: $${comm.amount}, Status: ${comm.status}`);
        });
        
        // Calculate total earnings
        const earningsResult = await prisma.$queryRaw`
          SELECT SUM(amount) as total FROM commissions WHERE status = 'approved'
        `;
        const totalEarnings = Number(earningsResult[0].total || 0);
        console.log(`\nTotal Approved Earnings: $${totalEarnings.toFixed(2)}`);
      }
    } catch (err) {
      console.log(`❌ commissions table DOES NOT EXIST`);
      console.log(`   Error: ${err.message}`);
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // CHECK 5: Product Clicks table
    console.log('\n📊 CHECK 5: SELECT COUNT(*) FROM product_clicks; (alternative)\n');
    try {
      const productClicksResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM product_clicks`;
      const totalProductClicks = Number(productClicksResult[0].count);
      console.log(`✅ product_clicks table EXISTS`);
      console.log(`Total Product Clicks: ${totalProductClicks}`);
    } catch (err) {
      console.log(`❌ product_clicks table DOES NOT EXIST`);
      console.log(`   Error: ${err.message}`);
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // CHECK 6: List all tables
    console.log('\n📊 CHECK 6: List all tables in database\n');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('Available Tables:');
    tables.forEach((table, i) => {
      console.log(`  ${i + 1}. ${table.table_name}`);
    });
    
    console.log('\n' + '=' .repeat(70));
    console.log('\n✅ DATABASE AUDIT COMPLETE\n');
    
  } catch (error) {
    console.error('❌ Database audit error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDashboardDB();
