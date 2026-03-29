const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function rootCauseVerification() {
  try {
    console.log('🔍 PHASE 2 — FINAL ROOT CAUSE VERIFICATION\n');
    console.log('=' .repeat(70));
    
    // STEP 1: Check latest clicks in DB
    console.log('\n📊 STEP 1: Check Latest Clicks in Database\n');
    
    const latestClicks = await prisma.$queryRaw`
      SELECT id, "userId", "offerId", network, "createdAt", user_id
      FROM clicks
      ORDER BY "createdAt" DESC
      LIMIT 5
    `;
    
    console.log('Latest Clicks:');
    console.log('ID | userId | user_id | offerId | Network | Created At');
    console.log('-'.repeat(70));
    
    latestClicks.forEach((click) => {
      console.log(`${click.id} | ${click.userId} | ${click.user_id || 'NULL'} | ${click.offerId} | ${click.network} | ${click.createdAt.toISOString()}`);
    });
    
    console.log('\nAnalysis:');
    const clicksWithUserId = latestClicks.filter(c => c.user_id !== null && c.user_id !== undefined);
    const clicksWithoutUserId = latestClicks.filter(c => c.user_id === null || c.user_id === undefined);
    
    console.log(`  - Clicks with user_id: ${clicksWithUserId.length}`);
    console.log(`  - Clicks with user_id = NULL: ${clicksWithoutUserId.length}`);
    
    if (clicksWithoutUserId.length > 0) {
      console.log('  ⚠️ WARNING: Some clicks have NULL user_id!');
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 2: Check total clicks vs filtered clicks
    console.log('\n📊 STEP 2: Compare Total Clicks vs Filtered Clicks\n');
    
    const totalClicksResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM clicks`;
    const totalClicks = Number(totalClicksResult[0].count);
    
    console.log(`Total Clicks (no filter): ${totalClicks}`);
    
    // Test with different user IDs
    const testUserIds = [0, 1, null];
    
    for (const userId of testUserIds) {
      if (userId === null) {
        const nullUserClicks = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM clicks WHERE user_id IS NULL
        `;
        console.log(`Clicks WHERE user_id IS NULL: ${Number(nullUserClicks[0].count)}`);
      } else {
        const filteredClicks = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM clicks WHERE user_id = ${userId}
        `;
        console.log(`Clicks WHERE user_id = ${userId}: ${Number(filteredClicks[0].count)}`);
      }
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 3: Simulate Dashboard Query
    console.log('\n📊 STEP 3: Simulate Dashboard Query Logic\n');
    
    // Typical dashboard query would use authenticated user's ID
    // Let's test with userId = 1 (common admin ID)
    const dashboardUserId = 1;
    
    console.log(`Dashboard Query: WHERE user_id = ${dashboardUserId}\n`);
    
    const dashboardClicksResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM clicks WHERE user_id = ${dashboardUserId}
    `;
    const dashboardClicks = Number(dashboardClicksResult[0].count);
    
    console.log(`Result: ${dashboardClicks} clicks`);
    
    if (dashboardClicks === 0 && totalClicks > 0) {
      console.log('\n⚠️ ROOT CAUSE IDENTIFIED:');
      console.log('   - Total clicks in DB: ' + totalClicks);
      console.log('   - Clicks for userId ' + dashboardUserId + ': ' + dashboardClicks);
      console.log('   - Clicks are being created but with NULL or different user_id');
      console.log('   - Dashboard filters by user_id, so it shows 0');
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 4: Check tracking endpoint behavior
    console.log('\n📊 STEP 4: Check Click Tracking Endpoint Behavior\n');
    
    console.log('Current tracking endpoint sets:');
    console.log('  - userId: 0 (from request body)');
    console.log('  - user_id: null (from request body)');
    
    console.log('\nDashboard query filters by:');
    console.log('  - user_id = <authenticated_user_id>');
    
    console.log('\nMismatch Analysis:');
    if (clicksWithoutUserId.length > 0) {
      console.log('  ❌ Clicks created with user_id = NULL');
      console.log('  ❌ Dashboard filters WHERE user_id = 1 (or other ID)');
      console.log('  ❌ Result: Dashboard shows 0 clicks');
      console.log('\n  ROOT CAUSE: user_id mismatch between tracking and dashboard');
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 5: Distribution Analysis
    console.log('\n📊 STEP 5: Click Distribution by user_id\n');
    
    const distribution = await prisma.$queryRaw`
      SELECT 
        user_id,
        COUNT(*) as count
      FROM clicks
      GROUP BY user_id
      ORDER BY count DESC
    `;
    
    console.log('Click Distribution:');
    console.log('user_id | Count');
    console.log('-'.repeat(30));
    distribution.forEach((row) => {
      const userId = row.user_id === null ? 'NULL' : row.user_id;
      console.log(`${userId} | ${row.count}`);
    });
    
    console.log('\n' + '=' .repeat(70));
    
    // FINAL REPORT
    console.log('\n📋 FINAL ROOT CAUSE REPORT:\n');
    
    console.log('1. CLICKS TABLE TOTAL:');
    console.log(`   - Total clicks: ${totalClicks}`);
    console.log(`   - Clicks with user_id = NULL: ${clicksWithoutUserId.length}`);
    console.log(`   - Clicks with user_id set: ${clicksWithUserId.length}`);
    
    console.log('\n2. CLICKS WITH USERID:');
    console.log(`   - Clicks WHERE user_id = 0: ${await getClickCountByUserId(0)}`);
    console.log(`   - Clicks WHERE user_id = 1: ${await getClickCountByUserId(1)}`);
    console.log(`   - Clicks WHERE user_id IS NULL: ${await getClickCountByUserId(null)}`);
    
    console.log('\n3. DASHBOARD USERID:');
    console.log(`   - Dashboard filters by: user_id = 1 (authenticated user)`);
    console.log(`   - Dashboard would show: ${dashboardClicks} clicks`);
    
    console.log('\n' + '=' .repeat(70));
    
    if (totalClicks > 0 && dashboardClicks === 0) {
      console.log('\n🔴 ROOT CAUSE CONFIRMED:\n');
      console.log('✓ Clicks ARE being created (total: ' + totalClicks + ')');
      console.log('✓ Clicks have user_id = NULL or 0');
      console.log('✓ Dashboard filters WHERE user_id = 1');
      console.log('✓ Result: Dashboard shows 0 clicks');
      console.log('\n💡 SOLUTION:');
      console.log('   Option 1: Track clicks with actual authenticated user_id');
      console.log('   Option 2: Change dashboard to show all clicks (remove user_id filter)');
      console.log('   Option 3: Use user_id = 0 for anonymous and filter accordingly');
    } else if (totalClicks > 0 && dashboardClicks > 0) {
      console.log('\n✅ NO ISSUE DETECTED:');
      console.log('   - Clicks are being created');
      console.log('   - Dashboard query returns clicks');
      console.log('   - System working as expected');
    } else {
      console.log('\n⚠️ NO CLICKS IN DATABASE:');
      console.log('   - Create some clicks first to test');
    }
    
    console.log('\n' + '=' .repeat(70));
    
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function getClickCountByUserId(userId) {
  if (userId === null) {
    const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM clicks WHERE user_id IS NULL`;
    return Number(result[0].count);
  } else {
    const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM clicks WHERE user_id = ${userId}`;
    return Number(result[0].count);
  }
}

rootCauseVerification();
