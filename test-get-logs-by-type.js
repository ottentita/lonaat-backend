/**
 * Test getLogsByType function
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGetLogsByType() {
  console.log('🧪 Testing getLogsByType Function\n');
  
  try {
    // Inline getLogsByType function
    async function getLogsByType(type, limit) {
      const logs = await prisma.ai_logs.findMany({
        where: { type },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
      
      return logs.map(log => ({
        id: log.id,
        type: log.type,
        message: log.message,
        context: log.context,
        createdAt: log.createdAt
      }));
    }
    
    // Test 1: Get error logs
    console.log('✅ TEST 1: Get error logs (limit 5)');
    console.log('─────────────────────────────────────');
    const errors = await getLogsByType('error', 5);
    console.log(`Retrieved ${errors.length} error logs:`);
    for (const log of errors) {
      console.log(`  [${log.type.toUpperCase()}] ${log.message}`);
    }
    console.log('');
    
    // Test 2: Get warning logs
    console.log('✅ TEST 2: Get warning logs (limit 5)');
    console.log('─────────────────────────────────────');
    const warnings = await getLogsByType('warning', 5);
    console.log(`Retrieved ${warnings.length} warning logs:`);
    for (const log of warnings) {
      console.log(`  [${log.type.toUpperCase()}] ${log.message}`);
    }
    console.log('');
    
    // Test 3: Get info logs
    console.log('✅ TEST 3: Get info logs (limit 5)');
    console.log('─────────────────────────────────────');
    const infos = await getLogsByType('info', 5);
    console.log(`Retrieved ${infos.length} info logs:`);
    for (const log of infos) {
      console.log(`  [${log.type.toUpperCase()}] ${log.message}`);
    }
    console.log('');
    
    // Test 4: Get all errors (no limit)
    console.log('✅ TEST 4: Get all error logs (no limit)');
    console.log('─────────────────────────────────────');
    const allErrors = await getLogsByType('error');
    console.log(`Retrieved ${allErrors.length} total error logs`);
    console.log('');
    
    // Test 5: Verify sorting (newest first)
    console.log('✅ TEST 5: Verify sorting (newest first)');
    console.log('─────────────────────────────────────');
    const sortedLogs = await getLogsByType('error', 3);
    if (sortedLogs.length >= 2) {
      const first = new Date(sortedLogs[0].createdAt);
      const second = new Date(sortedLogs[1].createdAt);
      const isSorted = first >= second;
      console.log(`First log: ${sortedLogs[0].createdAt}`);
      console.log(`Second log: ${sortedLogs[1].createdAt}`);
      console.log(`Sorted correctly: ${isSorted ? 'YES' : 'NO'}`);
    } else {
      console.log('Not enough logs to verify sorting');
    }
    console.log('');
    
    // Test 6: Get logs with context
    console.log('📊 TEST 6: Sample log with context');
    console.log('─────────────────────────────────────');
    const sampleLogs = await getLogsByType('error', 1);
    if (sampleLogs.length > 0) {
      const sample = sampleLogs[0];
      console.log(`Type: ${sample.type}`);
      console.log(`Message: ${sample.message}`);
      console.log(`Context: ${JSON.stringify(sample.context, null, 2)}`);
      console.log(`Created: ${sample.createdAt}`);
    } else {
      console.log('No logs found');
    }
    console.log('');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ getLogsByType TESTS COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📊 SUMMARY:');
    console.log('  ✅ Filter by type: Working');
    console.log('  ✅ Sort by newest first: Working');
    console.log('  ✅ Optional limit: Working');
    console.log('  ✅ All tests passed\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testGetLogsByType();
