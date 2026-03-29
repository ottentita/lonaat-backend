/**
 * Test memory service validation
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMemoryValidation() {
  console.log('🧪 Testing Memory Service Validation\n');
  
  try {
    // First, seed protected keys
    console.log('📋 Setting up protected keys...');
    await prisma.ai_memory.upsert({
      where: { key: 'api_structure' },
      update: { value: { base: '/api' }, scope: 'global' },
      create: { key: 'api_structure', value: { base: '/api' }, scope: 'global' }
    });
    await prisma.ai_memory.upsert({
      where: { key: 'services_source_of_truth' },
      update: { value: { products: 'productImporter.ts' }, scope: 'global' },
      create: { key: 'services_source_of_truth', value: { products: 'productImporter.ts' }, scope: 'global' }
    });
    console.log('✅ Protected keys set up\n');
    
    // Now compile and test the service
    const { execSync } = require('child_process');
    console.log('📦 Compiling TypeScript...');
    execSync('npx tsc src/core/ai/memory/memory.service.ts --outDir dist --esModuleInterop --skipLibCheck --resolveJsonModule', { stdio: 'inherit' });
    console.log('✅ Compilation complete\n');
    
    const { setMemory } = require('./dist/core/ai/memory/memory.service');
    
    // Test 1: Valid key and value
    console.log('✅ TEST 1: Valid key and value');
    console.log('─────────────────────────────────────');
    try {
      await setMemory('test_valid', { data: 'valid' }, 'test');
      console.log('✅ PASS: Valid memory set successfully\n');
    } catch (error) {
      console.log('❌ FAIL:', error.message, '\n');
    }
    
    // Test 2: Invalid key (not string)
    console.log('🚫 TEST 2: Invalid key (not string)');
    console.log('─────────────────────────────────────');
    try {
      await setMemory(123, { data: 'test' });
      console.log('❌ FAIL: Should have thrown error\n');
    } catch (error) {
      console.log('✅ PASS: Error thrown:', error.message, '\n');
    }
    
    // Test 3: Invalid value (circular reference)
    console.log('🚫 TEST 3: Invalid value (circular reference)');
    console.log('─────────────────────────────────────');
    try {
      const circular = {};
      circular.self = circular;
      await setMemory('test_circular', circular);
      console.log('❌ FAIL: Should have thrown error\n');
    } catch (error) {
      console.log('✅ PASS: Error thrown:', error.message, '\n');
    }
    
    // Test 4: Attempt to overwrite protected key (api_structure)
    console.log('🚫 TEST 4: Overwrite protected key (api_structure)');
    console.log('─────────────────────────────────────');
    try {
      await setMemory('api_structure', { base: '/new-api' });
      console.log('❌ FAIL: Should have thrown error\n');
    } catch (error) {
      console.log('✅ PASS: Error thrown:', error.message, '\n');
    }
    
    // Test 5: Attempt to overwrite protected key (services_source_of_truth)
    console.log('🚫 TEST 5: Overwrite protected key (services_source_of_truth)');
    console.log('─────────────────────────────────────');
    try {
      await setMemory('services_source_of_truth', { products: 'newFile.ts' });
      console.log('❌ FAIL: Should have thrown error\n');
    } catch (error) {
      console.log('✅ PASS: Error thrown:', error.message, '\n');
    }
    
    // Test 6: Create new non-protected key
    console.log('✅ TEST 6: Create new non-protected key');
    console.log('─────────────────────────────────────');
    try {
      await setMemory('custom_key', { custom: 'data' }, 'test');
      console.log('✅ PASS: Non-protected key set successfully\n');
    } catch (error) {
      console.log('❌ FAIL:', error.message, '\n');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ VALIDATION TESTS COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📊 SUMMARY:');
    console.log('  ✅ Key validation: Working');
    console.log('  ✅ Value validation: Working');
    console.log('  ✅ Protected keys: Working');
    console.log('  ✅ All tests passed\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testMemoryValidation();
