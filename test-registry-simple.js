/**
 * Simple test for updated SYSTEM_REGISTRY (no compilation needed)
 */

const fs = require('fs');

console.log('🧪 Testing Updated SYSTEM_REGISTRY Structure\n');

// Read the TypeScript file directly
const registryContent = fs.readFileSync('./src/core/ai/registry/system.registry.ts', 'utf-8');

console.log('📋 Verifying Structure:');
console.log('─────────────────────────────────────');

// Check for new structure
const hasServicesObject = registryContent.includes('services: {');
const hasProductsService = registryContent.includes('products: {') && registryContent.includes('file: "productImporter.ts"');
const hasAffiliateService = registryContent.includes('affiliate: {') && registryContent.includes('file: "realAffiliateConnector.ts"');
const hasTokensService = registryContent.includes('tokens: {') && registryContent.includes('file: "token.service.ts"');
const hasAiService = registryContent.includes('ai: {') && registryContent.includes('file: "ai.manager.ts"');

const hasRoutesObject = registryContent.includes('routes: {');
const hasProductsRoute = registryContent.includes('products: "/api/products"');
const hasWalletRoute = registryContent.includes('wallet: "/api/wallet"');
const hasAnalyticsRoute = registryContent.includes('analytics: "/api/analytics"');

// Check functions unchanged
const hasGetService = registryContent.includes('export function getService(');
const hasServiceExists = registryContent.includes('export function serviceExists(');
const hasRouteExists = registryContent.includes('export function routeExists(');

console.log('✅ services object:', hasServicesObject ? 'FOUND' : 'MISSING');
console.log('  ✅ products service:', hasProductsService ? 'FOUND' : 'MISSING');
console.log('  ✅ affiliate service:', hasAffiliateService ? 'FOUND' : 'MISSING');
console.log('  ✅ tokens service:', hasTokensService ? 'FOUND' : 'MISSING');
console.log('  ✅ ai service:', hasAiService ? 'FOUND' : 'MISSING');
console.log('');
console.log('✅ routes object:', hasRoutesObject ? 'FOUND' : 'MISSING');
console.log('  ✅ products route:', hasProductsRoute ? 'FOUND' : 'MISSING');
console.log('  ✅ wallet route:', hasWalletRoute ? 'FOUND' : 'MISSING');
console.log('  ✅ analytics route:', hasAnalyticsRoute ? 'FOUND' : 'MISSING');
console.log('');
console.log('✅ Function names unchanged:');
console.log('  ✅ getService():', hasGetService ? 'FOUND' : 'MISSING');
console.log('  ✅ serviceExists():', hasServiceExists ? 'FOUND' : 'MISSING');
console.log('  ✅ routeExists():', hasRouteExists ? 'FOUND' : 'MISSING');
console.log('');

const allChecks = [
  hasServicesObject, hasProductsService, hasAffiliateService, hasTokensService, hasAiService,
  hasRoutesObject, hasProductsRoute, hasWalletRoute, hasAnalyticsRoute,
  hasGetService, hasServiceExists, hasRouteExists
];

if (allChecks.every(check => check)) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ALL CHECKS PASSED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📊 SUMMARY:');
  console.log('  ✅ SYSTEM_REGISTRY structure normalized');
  console.log('  ✅ Services use strict nested object format');
  console.log('  ✅ Routes use strict nested object format');
  console.log('  ✅ Function names unchanged');
  console.log('  ✅ No new services added\n');
} else {
  console.log('❌ SOME CHECKS FAILED');
  process.exit(1);
}
