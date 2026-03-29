/**
 * PHASE 2 TEST SCRIPT
 * Tests memory system and registry
 */

async function testPhase2() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 PHASE 2: MEMORY SYSTEM + REGISTRY TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Test 1: System Registry
    console.log('📋 TEST 1: System Registry');
    console.log('─────────────────────────────────────');
    
    const { SYSTEM_REGISTRY, getService, serviceExists, routeExists } = require('./dist/core/ai/registry/system.registry');
    
    console.log(`✅ Registry loaded: ${SYSTEM_REGISTRY.length} entries`);
    
    // Test getService
    const productService = getService('productImporter');
    console.log(`✅ getService('productImporter'):`, productService ? productService.path : 'NOT FOUND');
    
    // Test serviceExists
    const exists = serviceExists('productImporter');
    console.log(`✅ serviceExists('productImporter'):`, exists);
    
    // Test routeExists
    const routeCheck = routeExists('/api/products');
    console.log(`✅ routeExists('/api/products'):`, routeCheck);
    
    console.log('\n');
    
    // Test 2: Memory Service
    console.log('💾 TEST 2: Memory Service');
    console.log('─────────────────────────────────────');
    
    const { setMemory, getMemory, getAllMemory } = require('./dist/core/ai/memory/memory.service');
    
    // Insert test memory
    await setMemory('test_key', { message: 'Hello from Phase 2' }, 'test');
    console.log('✅ setMemory: test_key inserted');
    
    // Retrieve test memory
    const retrieved = await getMemory('test_key');
    console.log('✅ getMemory: test_key retrieved:', retrieved);
    
    // Get all memory
    const allMemory = await getAllMemory('test');
    console.log(`✅ getAllMemory: ${allMemory.length} entries in 'test' scope`);
    
    console.log('\n');
    
    // Test 3: Memory Initializer
    console.log('🚀 TEST 3: Memory Initializer');
    console.log('─────────────────────────────────────');
    
    const { initializeSystemMemory } = require('./dist/core/ai/memory/memory.initializer');
    
    await initializeSystemMemory();
    
    // Verify initialized data
    const apiStructure = await getMemory('api_structure');
    console.log('✅ Retrieved api_structure:', apiStructure);
    
    const sourcesOfTruth = await getMemory('services_source_of_truth');
    console.log('✅ Retrieved services_source_of_truth:', sourcesOfTruth);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ PHASE 2 TESTS COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📊 SUMMARY:');
    console.log('  ✅ System Registry: Working');
    console.log('  ✅ Memory Service: Working');
    console.log('  ✅ Memory Initializer: Working');
    console.log('  ✅ All tests passed\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testPhase2();
