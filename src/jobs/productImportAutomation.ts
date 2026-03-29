/**
 * AUTOMATED PRODUCT IMPORT CRON JOB
 * Syncs affiliate products every 10 minutes for continuous updates
 */

import cron from 'node-cron';
import { importProducts } from '../services/productImport.service';

/**
 * Start automated product import cron job
 * Runs every 10 minutes to keep products fresh
 */
export function startProductImportAutomation() {
  // 🚫 MANUAL PRODUCTS MODE - Auto import disabled for production stability
  if (process.env.MANUAL_PRODUCTS_ONLY === 'true') {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚫 AUTOMATED PRODUCT IMPORT DISABLED');
    console.log('📝 Mode: MANUAL_PRODUCTS_ONLY=true');
    console.log('✅ System running in manual products mode');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return null;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⏰ AUTOMATED PRODUCT IMPORT INITIALIZED');
  console.log('📅 Schedule: Every 10 minutes');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Schedule: Every 10 minutes
  // Pattern: */10 * * * * (minute hour day month weekday)
  const job = cron.schedule('*/10 * * * *', async () => {
    try {
      console.log('\n🔄 AUTOMATED PRODUCT SYNC STARTED');
      console.log(`⏰ Time: ${new Date().toISOString()}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const result = await importProducts();

      console.log('\n📊 SYNC SUMMARY:');
      console.log(`   Total imported: ${result.totalImported} products`);
      console.log(`   Successful networks: ${result.results.filter(r => r.success).length}/${result.results.length}`);
      
      result.results.forEach(r => {
        const status = r.success ? '✅' : '❌';
        const message = r.error ? ` (${r.error})` : '';
        console.log(`   ${status} ${r.network}: ${r.productsImported} products${message}`);
      });

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Automated sync completed\n');

    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ AUTOMATED SYNC FAILED');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  });

  console.log('✅ Automated product import cron job started');
  console.log('🔄 Next sync in 10 minutes\n');

  return job;
}

/**
 * Stop the cron job
 */
export function stopProductImportAutomation(job: cron.ScheduledTask | null) {
  if (job) {
    job.stop();
    console.log('⏹️ Automated product import stopped');
  }
}

export default {
  startProductImportAutomation,
  stopProductImportAutomation
};
