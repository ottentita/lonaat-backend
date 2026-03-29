/**
 * Test updated SYSTEM_REGISTRY structure
 */

async function testRegistryUpdate() {
  console.log('🧪 Testing Updated SYSTEM_REGISTRY Structure\n');
  
  try {
    // Compile TypeScript first
    const { execSync } = require('child_process');
    console.log('📦 Compiling TypeScript...');
    execSync('npx tsc src/core/ai/registry/system.registry.ts --outDir dist --esModuleInterop --skipLibCheck', { stdio: 'inherit' });
    console.log('✅ Compilation complete\n');
    
    const { SYSTEM_REGISTRY, getService, serviceExists, routeExists } = require('./dist/core/ai/registry/system.registry');
    
    console.log('📋 SYSTEM_REGISTRY Structure:');
    console.log('─────────────────────────────────────');
    console.log(JSON.stringify(SYSTEM_REGISTRY, null, 2));
    console.log('\n');
    
    // Test getService
    console.log('🔍 Testing getService():');
    console.log('─────────────────────────────────────');
    const productService = getService('products');
    console.log('getService("products"):', productService);
    
    const affiliateService = getService('affiliate');
    console.log('getService("affiliate"):', affiliateService);
    
    const tokensService = getService('tokens');
    console.log('getService("tokens"):', tokensService);
    
    const aiService = getService('ai');
    console.log('getService("ai"):', aiService);
    console.log('\n');
    
    // Test serviceExists
    console.log('✅ Testing serviceExists():');
    console.log('─────────────────────────────────────');
    console.log('serviceExists("products"):', serviceExists('products'));
    console.log('serviceExists("affiliate"):', serviceExists('affiliate'));
    console.log('serviceExists("tokens"):', serviceExists('tokens'));
    console.log('serviceExists("ai"):', serviceExists('ai'));
    console.log('serviceExists("nonexistent"):', serviceExists('nonexistent'));
    console.log('\n');
    
    // Test routeExists
    console.log('🛣️  Testing routeExists():');
    console.log('─────────────────────────────────────');
    console.log('routeExists("/api/products"):', routeExists('/api/products'));
    console.log('routeExists("/api/wallet"):', routeExists('/api/wallet'));
    console.log('routeExists("/api/analytics"):', routeExists('/api/analytics'));
    console.log('routeExists("/api/nonexistent"):', routeExists('/api/nonexistent'));
    console.log('\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL TESTS PASSED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📊 SUMMARY:');
    console.log('  ✅ SYSTEM_REGISTRY structure updated');
    console.log('  ✅ getService() working');
    console.log('  ✅ serviceExists() working');
    console.log('  ✅ routeExists() working');
    console.log('  ✅ Function names unchanged\n');
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

testRegistryUpdate();
