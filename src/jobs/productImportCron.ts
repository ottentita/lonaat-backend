import cron from 'node-cron';
import { importAllProducts } from '../services/productImporter';

/**
 * PRODUCT IMPORT CRON JOB
 * Auto-imports products from all networks every 6 hours
 * 
 * Schedule: 0 star-slash-6 star star star (every 6 hours)
 * Runs at: 00:00, 06:00, 12:00, 18:00 daily
 */

let isRunning = false;

export function startProductImportCron() {
  // 🚫 MANUAL PRODUCTS MODE - Auto import disabled for production stability
  if (process.env.MANUAL_PRODUCTS_ONLY === 'true') {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚫 AUTO PRODUCT IMPORT DISABLED');
    console.log('📝 Mode: MANUAL_PRODUCTS_ONLY=true');
    console.log('✅ System running in manual products mode');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⏰ PRODUCT IMPORT CRON JOB INITIALIZED');
  console.log('📅 Schedule: Every 6 hours (00:00, 06:00, 12:00, 18:00)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Schedule: Every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    if (isRunning) {
      console.log('⚠️ Product import already running, skipping...');
      return;
    }

    try {
      isRunning = true;
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⏰ CRON: Starting scheduled product import');
      console.log(`🕐 Time: ${new Date().toISOString()}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const count = await importAllProducts();

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ CRON: Product import completed');
      console.log(`📊 Imported: ${count} products`);
      console.log(`🕐 Completed: ${new Date().toISOString()}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ CRON: Product import failed');
      console.error(error);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } finally {
      isRunning = false;
    }
  });

  console.log('✅ Product import cron job started successfully');
}

/**
 * MANUAL TRIGGER (for testing)
 * Call this to run import immediately without waiting for schedule
 */
export async function runProductImportNow() {
  if (isRunning) {
    console.log('⚠️ Product import already running');
    return { success: false, message: 'Import already in progress' };
  }

  try {
    isRunning = true;
    console.log('🚀 Manual product import triggered');
    
    const count = await importAllProducts();
    
    console.log(`✅ Manual import completed: ${count} products`);
    return { success: true, imported: count };

  } catch (error) {
    console.error('❌ Manual import failed:', error);
    return { success: false, error };
  } finally {
    isRunning = false;
  }
}
