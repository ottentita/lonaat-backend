const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyAuthenticatedClicks() {
  try {
    console.log('🔍 VERIFY AUTHENTICATED CLICK TRACKING\n');
    console.log('=' .repeat(70));
    
    // STEP 1: Check latest clicks
    console.log('\n📊 STEP 1: Check Latest Clicks\n');
    console.log('SQL: SELECT id, "userId", user_id, "offerId", network FROM clicks ORDER BY id DESC LIMIT 5;\n');
    
    const latestClicks = await prisma.$queryRaw`
      SELECT id, "userId", user_id, "offerId", network, "createdAt"
      FROM clicks
      ORDER BY id DESC
      LIMIT 5
    `;
    
    console.log('Latest Clicks:');
    console.log('ID | userId | user_id | offerId | Network | Created At');
    console.log('-'.repeat(70));
    
    if (latestClicks.length === 0) {
      console.log('(No clicks found - click a product first!)');
    } else {
      latestClicks.forEach((click) => {
        const userId = click.user_id === null ? 'NULL ❌' : `${click.user_id} ✅`;
        const timestamp = click.createdAt.toISOString().split('T')[1].split('.')[0];
        console.log(`${click.id} | ${click.userId} | ${userId} | ${click.offerId} | ${click.network} | ${timestamp}`);
      });
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 2: Check if latest click has userId set
    console.log('\n📊 STEP 2: Verify Latest Click Has userId\n');
    
    if (latestClicks.length > 0) {
      const latestClick = latestClicks[0];
      
      console.log(`Latest Click ID: ${latestClick.id}`);
      console.log(`userId field: ${latestClick.userId}`);
      console.log(`user_id field: ${latestClick.user_id === null ? 'NULL' : latestClick.user_id}`);
      
      if (latestClick.user_id !== null && latestClick.user_id > 0) {
        console.log('\n✅ SUCCESS: Click has user_id set!');
        console.log(`   User ID: ${latestClick.user_id}`);
        console.log('   This click will show in dashboard ✅');
      } else {
        console.log('\n❌ ISSUE: Click has user_id = NULL');
        console.log('   This means:');
        console.log('   - User was not authenticated when clicking');
        console.log('   - OR backend server not restarted with new code');
        console.log('   - OR frontend not sending JWT token');
      }
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 3: Check dashboard query simulation
    console.log('\n📊 STEP 3: Dashboard Query Simulation\n');
    
    // Check for different user IDs
    for (const userId of [1, 2]) {
      const userClicks = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM clicks WHERE user_id = ${userId}
      `;
      
      const count = Number(userClicks[0].count);
      console.log(`Clicks for user_id = ${userId}: ${count} ${count > 0 ? '✅' : ''}`);
    }
    
    const nullClicks = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM clicks WHERE user_id IS NULL
    `;
    console.log(`Clicks with user_id = NULL: ${Number(nullClicks[0].count)}`);
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 4: Dashboard expectation
    console.log('\n📊 STEP 4: Dashboard Expectation\n');
    
    const totalClicks = await prisma.$queryRaw`SELECT COUNT(*) as count FROM clicks`;
    const totalCount = Number(totalClicks[0].count);
    
    console.log(`Total Clicks in Database: ${totalCount}`);
    
    if (latestClicks.length > 0 && latestClicks[0].user_id !== null) {
      const userId = latestClicks[0].user_id;
      const userClicksResult = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM clicks WHERE user_id = ${userId}
      `;
      const userCount = Number(userClicksResult[0].count);
      
      console.log(`\nDashboard for user_id = ${userId}:`);
      console.log(`  Total Clicks: ${userCount} ${userCount > 0 ? '✅' : '❌'}`);
      
      if (userCount > 0) {
        console.log('\n✅ EXPECTED RESULT:');
        console.log(`   Dashboard will show: Total Clicks = ${userCount}`);
        console.log('   Reload dashboard to see updated count!');
      }
    } else {
      console.log('\n⚠️ No authenticated clicks found yet.');
      console.log('   Dashboard will show: Total Clicks = 0');
      console.log('\n   To fix:');
      console.log('   1. Make sure backend server is restarted');
      console.log('   2. Login to frontend (get JWT token)');
      console.log('   3. Click a product');
      console.log('   4. Run this script again');
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // FINAL SUMMARY
    console.log('\n📋 VERIFICATION SUMMARY:\n');
    
    const authenticatedClicks = latestClicks.filter(c => c.user_id !== null && c.user_id > 0);
    const unauthenticatedClicks = latestClicks.filter(c => c.user_id === null || c.user_id === 0);
    
    console.log(`Total clicks checked: ${latestClicks.length}`);
    console.log(`Authenticated clicks (user_id set): ${authenticatedClicks.length} ${authenticatedClicks.length > 0 ? '✅' : '❌'}`);
    console.log(`Unauthenticated clicks (user_id NULL): ${unauthenticatedClicks.length}`);
    
    if (authenticatedClicks.length > 0) {
      console.log('\n🎯 FIX VERIFIED: Authenticated click tracking is working! ✅');
      console.log('   - Clicks have user_id set');
      console.log('   - Dashboard will show real data');
      console.log('   - Reload dashboard to see updated metrics');
    } else if (latestClicks.length > 0) {
      console.log('\n⚠️ FIX NOT YET WORKING:');
      console.log('   - Clicks still have user_id = NULL');
      console.log('   - Check if backend server was restarted');
      console.log('   - Check if user is logged in (JWT token present)');
    } else {
      console.log('\n⚠️ NO CLICKS YET:');
      console.log('   - Click a product to test');
    }
    
    console.log('\n' + '=' .repeat(70));
    
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAuthenticatedClicks();
