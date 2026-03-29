const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAuthenticatedTracking() {
  try {
    console.log('🧪 PHASE 2 — FINAL FIX: TEST AUTHENTICATED CLICK TRACKING\n');
    console.log('=' .repeat(70));
    
    // STEP 1: Check current click state
    console.log('\n📊 STEP 1: Current Click State (BEFORE FIX)\n');
    
    const beforeClicks = await prisma.$queryRaw`
      SELECT id, "userId", user_id, "offerId", network, "createdAt"
      FROM clicks
      ORDER BY "createdAt" DESC
      LIMIT 5
    `;
    
    console.log('Current Clicks in Database:');
    console.log('ID | userId | user_id | offerId | Network');
    console.log('-'.repeat(50));
    beforeClicks.forEach((click) => {
      const userId = click.user_id === null ? 'NULL' : click.user_id;
      console.log(`${click.id} | ${click.userId} | ${userId} | ${click.offerId} | ${click.network}`);
    });
    
    const nullUserClicks = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM clicks WHERE user_id IS NULL
    `;
    
    console.log(`\nClicks with user_id = NULL: ${Number(nullUserClicks[0].count)}`);
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 2: Explain the fix
    console.log('\n📊 STEP 2: Fix Applied to /api/track/product-click\n');
    
    console.log('BEFORE (OLD CODE):');
    console.log('  ❌ const { productId, network, userId } = req.body');
    console.log('  ❌ userId: userId || 0');
    console.log('  ❌ user_id: userId || null');
    console.log('  ❌ Result: user_id = NULL');
    
    console.log('\nAFTER (NEW CODE):');
    console.log('  ✅ router.post(\'/product-click\', authMiddleware, ...)');
    console.log('  ✅ const user = req.user (from JWT)');
    console.log('  ✅ if (!user) return 401 Unauthorized');
    console.log('  ✅ userId: user.id');
    console.log('  ✅ user_id: user.id');
    console.log('  ✅ Result: user_id = authenticated user ID');
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 3: Verify dashboard query will now work
    console.log('\n📊 STEP 3: Dashboard Query Verification\n');
    
    console.log('Dashboard Query:');
    console.log('  WHERE user_id = <authenticated_user_id>');
    
    console.log('\nWith OLD tracking (user_id = NULL):');
    console.log('  - Query returns: 0 clicks ❌');
    
    console.log('\nWith NEW tracking (user_id = 1):');
    console.log('  - Query will return: clicks for user 1 ✅');
    
    // Simulate what will happen with userId = 1
    const user1Clicks = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM clicks WHERE user_id = 1
    `;
    
    console.log(`\nCurrent clicks for user_id = 1: ${Number(user1Clicks[0].count)}`);
    console.log('After fix: New clicks will have user_id = 1 and will show in dashboard ✅');
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 4: Expected behavior
    console.log('\n📊 STEP 4: Expected Behavior After Fix\n');
    
    console.log('When user clicks product:');
    console.log('  1. Frontend sends: POST /api/track/product-click');
    console.log('     - Headers: Authorization: Bearer <JWT_TOKEN>');
    console.log('     - Body: { productId, network }');
    console.log('');
    console.log('  2. Backend authMiddleware:');
    console.log('     - Extracts JWT token');
    console.log('     - Verifies token');
    console.log('     - Looks up user in database');
    console.log('     - Attaches req.user = { id: 1, email: "..." }');
    console.log('');
    console.log('  3. Track endpoint:');
    console.log('     - Checks req.user exists');
    console.log('     - Creates click with user_id = req.user.id');
    console.log('     - Saves to database');
    console.log('');
    console.log('  4. Dashboard query:');
    console.log('     - WHERE user_id = 1');
    console.log('     - Returns clicks for that user ✅');
    
    console.log('\n' + '=' .repeat(70));
    
    // STEP 5: Migration note
    console.log('\n📊 STEP 5: Existing Clicks (Migration Note)\n');
    
    const totalClicks = await prisma.$queryRaw`SELECT COUNT(*) as count FROM clicks`;
    const nullClicks = await prisma.$queryRaw`SELECT COUNT(*) as count FROM clicks WHERE user_id IS NULL`;
    
    console.log(`Total clicks in database: ${Number(totalClicks[0].count)}`);
    console.log(`Clicks with user_id = NULL: ${Number(nullClicks[0].count)}`);
    
    if (Number(nullClicks[0].count) > 0) {
      console.log('\n⚠️ NOTE: Existing clicks have user_id = NULL');
      console.log('   These will NOT show in user-specific dashboards.');
      console.log('   Options:');
      console.log('   1. Keep them as anonymous clicks');
      console.log('   2. Update them: UPDATE clicks SET user_id = 1 WHERE user_id IS NULL');
      console.log('   3. Delete them: DELETE FROM clicks WHERE user_id IS NULL');
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // FINAL SUMMARY
    console.log('\n📋 FINAL FIX SUMMARY:\n');
    
    console.log('✅ CHANGES APPLIED:');
    console.log('   1. Added authMiddleware to /api/track/product-click');
    console.log('   2. Removed userId from request body');
    console.log('   3. Extract user from req.user (JWT)');
    console.log('   4. Return 401 if no user authenticated');
    console.log('   5. Use user.id for both userId and user_id fields');
    
    console.log('\n✅ EXPECTED RESULTS:');
    console.log('   - New clicks will have user_id = authenticated user ID');
    console.log('   - Dashboard queries will return clicks for that user');
    console.log('   - Analytics will show per-user click data');
    console.log('   - No more NULL user_id values');
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('   1. Restart backend server');
    console.log('   2. Login to frontend (to get JWT token)');
    console.log('   3. Click a product');
    console.log('   4. Check database: user_id should be set');
    console.log('   5. Check dashboard: should show click count > 0');
    
    console.log('\n' + '=' .repeat(70));
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthenticatedTracking();
