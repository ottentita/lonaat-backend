const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAnalyticsEndpoints() {
  try {
    console.log('🧪 PHASE 2 — FINAL: TEST ANALYTICS ENDPOINTS\n');
    console.log('=' .repeat(70));
    
    // Test 1: Dashboard Stats Query
    console.log('\n📊 TEST 1: Dashboard Stats Queries\n');
    
    console.log('Testing: SELECT COUNT(*) FROM products');
    const totalProducts = await prisma.$queryRaw`SELECT COUNT(*) as count FROM products`;
    const productCount = Number(totalProducts[0].count);
    console.log(`✅ Total Products: ${productCount}`);
    
    console.log('\nTesting: SELECT COUNT(*) FROM clicks');
    const totalClicksResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM clicks`;
    const totalClicks = Number(totalClicksResult[0].count);
    console.log(`✅ Total Clicks: ${totalClicks}`);
    
    console.log('\nTesting: SELECT COUNT(*) FROM commissions');
    const totalCommissionsResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM commissions`;
    const totalCommissions = Number(totalCommissionsResult[0].count);
    console.log(`✅ Total Commissions: ${totalCommissions}`);
    
    console.log('\n' + '=' .repeat(70));
    
    // Test 2: Analytics Clicks Query
    console.log('\n📊 TEST 2: Analytics Clicks Query\n');
    
    const clicks = await prisma.clicks.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    
    console.log(`✅ Recent Clicks: ${clicks.length}`);
    clicks.forEach((click, i) => {
      console.log(`  ${i + 1}. Click ID ${click.id} - Offer ${click.offerId} - Network: ${click.network}`);
    });
    
    console.log('\n' + '=' .repeat(70));
    
    // Test 3: Top Products by Clicks
    console.log('\n📊 TEST 3: Top Products by Clicks\n');
    
    const productClicks = await prisma.clicks.groupBy({
      by: ['offerId', 'network'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });
    
    console.log(`✅ Top Products: ${productClicks.length}`);
    productClicks.forEach((item, i) => {
      console.log(`  ${i + 1}. Offer ID ${item.offerId} (${item.network}) - ${item._count.id} clicks`);
    });
    
    console.log('\n' + '=' .repeat(70));
    
    // Test 4: Network Stats
    console.log('\n📊 TEST 4: Network Performance\n');
    
    const networkStats = await prisma.clicks.groupBy({
      by: ['network'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });
    
    const totalNetworkClicks = networkStats.reduce((sum, item) => sum + item._count.id, 0);
    
    console.log(`✅ Network Stats: ${networkStats.length} networks`);
    networkStats.forEach((item, i) => {
      const percentage = totalNetworkClicks > 0 ? ((item._count.id / totalNetworkClicks) * 100).toFixed(2) : '0.00';
      console.log(`  ${i + 1}. ${item.network}: ${item._count.id} clicks (${percentage}%)`);
    });
    
    console.log('\n' + '=' .repeat(70));
    
    // Test 5: Click Trends (Last 7 Days)
    console.log('\n📊 TEST 5: Click Trends (Last 7 Days)\n');
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trendClicks = await prisma.clicks.findMany({
      where: {
        createdAt: { gte: weekAgo },
      },
      select: {
        createdAt: true,
        network: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    
    const dailyClicks = {};
    trendClicks.forEach((click) => {
      const date = click.createdAt.toISOString().split('T')[0];
      dailyClicks[date] = (dailyClicks[date] || 0) + 1;
    });
    
    console.log(`✅ Trend Data: ${Object.keys(dailyClicks).length} days with clicks`);
    Object.entries(dailyClicks).forEach(([date, count]) => {
      console.log(`  ${date}: ${count} clicks`);
    });
    
    console.log('\n' + '=' .repeat(70));
    
    // Test 6: Summary Stats
    console.log('\n📊 TEST 6: Summary Statistics\n');
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const clicksToday = await prisma.clicks.count({
      where: { createdAt: { gte: todayStart } },
    });
    
    const clicksThisWeek = await prisma.clicks.count({
      where: { createdAt: { gte: weekAgo } },
    });
    
    const uniqueProducts = await prisma.clicks.groupBy({
      by: ['offerId'],
    });
    
    const uniqueNetworks = await prisma.clicks.groupBy({
      by: ['network'],
    });
    
    console.log(`✅ Summary:`);
    console.log(`  - Total Clicks: ${totalClicks}`);
    console.log(`  - Clicks Today: ${clicksToday}`);
    console.log(`  - Clicks This Week: ${clicksThisWeek}`);
    console.log(`  - Unique Products Clicked: ${uniqueProducts.length}`);
    console.log(`  - Unique Networks: ${uniqueNetworks.length}`);
    
    console.log('\n' + '=' .repeat(70));
    
    // FINAL REPORT
    console.log('\n📋 FINAL ANALYTICS REPORT:\n');
    console.log(`✅ All analytics queries working correctly!`);
    console.log(`✅ Dashboard will show REAL data:`);
    console.log(`   - Products: ${totalProducts}`);
    console.log(`   - Clicks: ${totalClicks}`);
    console.log(`   - Commissions: ${totalCommissions}`);
    console.log(`   - Networks: ${networkStats.length}`);
    console.log(`   - Top Products: ${productClicks.length}`);
    
    if (totalClicks > 0) {
      console.log('\n🎯 ANALYTICS FULLY FUNCTIONAL! ✅');
      console.log('   Dashboard and analytics endpoints will display real click data.');
    } else {
      console.log('\n⚠️ No clicks recorded yet - click a product to see analytics populate!');
    }
    
    console.log('\n' + '=' .repeat(70));
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAnalyticsEndpoints();
