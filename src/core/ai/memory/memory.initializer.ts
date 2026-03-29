/**
 * MEMORY INITIALIZER
 * Seeds initial system memory
 */

import { setMemory } from './memory.service';

/**
 * Initialize system memory with core data
 */
export async function initializeSystemMemory(): Promise<void> {
  console.log('🧠 Initializing system memory...');
  
  // API Structure
  await setMemory('api_structure', {
    base: '/api',
    ai_base: '/api/ai-system'
  }, 'global');
  
  console.log('✅ Stored: api_structure');
  
  // Services Source of Truth
  await setMemory('services_source_of_truth', {
    products: 'productImporter.ts',
    affiliate: 'realAffiliateConnector.ts',
    tokens: 'token.service.ts',
    ai: 'ai.manager.ts'
  }, 'global');
  
  console.log('✅ Stored: services_source_of_truth');
  
  console.log('✅ System memory initialized');
}
