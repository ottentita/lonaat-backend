/**
 * TEST PRODUCT SYNC SERVICE
 * Tests the new product sync functionality
 */

const { syncAllNetworks, getSyncStats } = require('./dist/services/productSync.service');
const { triggerManualSync, getSyncJobStatus } = require('./dist/jobs/productSync.job');

async function testProductSync() {
  console.log('🧪 TESTING PRODUCT SYNC SERVICE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // Test 1: Get sync stats
    console.log('📊 Testing sync stats...');
    const stats = await getSyncStats();
    console.log('Current database stats:', stats);
    
    // Test 2: Get job status
    console.log('\n⏰ Testing job status...');
    const jobStatus = getSyncJobStatus();
    console.log('Job status:', jobStatus);
    
    // Test 3: Manual sync trigger
    console.log('\n🔄 Testing manual sync...');
    const syncResult = await triggerManualSync();
    console.log('Sync result:', syncResult);
    
    // Test 4: Final stats check
    console.log('\n📊 Final stats check...');
    const finalStats = await getSyncStats();
    console.log('Final database stats:', finalStats);
    
    console.log('\n✅ PRODUCT SYNC TEST COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    console.error('❌ PRODUCT SYNC TEST FAILED:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testProductSync();
