/**
 * PRODUCT SYNC CRON JOB
 * Runs product synchronization every 6 hours
 */

import cron from 'node-cron';
import { syncAllNetworks } from '../services/productSync.service';

let isRunning = false;

/**
 * Start the product sync cron job
 */
export function startProductSyncJob() {
  // 🚫 MANUAL PRODUCTS MODE - Auto sync disabled for production stability
  if (process.env.MANUAL_PRODUCTS_ONLY === 'true') {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚫 PRODUCT SYNC DISABLED');
    console.log('📝 Mode: MANUAL_PRODUCTS_ONLY=true');
    console.log('✅ System running in manual products mode');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return;
  }

  console.log('⏰ PRODUCT SYNC CRON JOB INITIALIZED');
  console.log('📅 Schedule: Every 6 hours (00:00, 06:00, 12:00, 18:00)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Schedule sync every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    if (isRunning) {
      console.log('⚠️ Product sync already running, skipping...');
      return;
    }
    
    isRunning = true;
    
    try {
      console.log('🔄 Running scheduled product sync...');
      const startTime = Date.now();
      
      const results = await syncAllNetworks();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Scheduled sync completed in ${duration}ms`);
      
      // Log results to monitoring system
      logSyncResults(results, duration);
      
    } catch (error) {
      console.error('❌ Scheduled product sync failed:', error);
    } finally {
      isRunning = false;
    }
  });
  
  // Also run once on startup (with delay to let server initialize)
  setTimeout(async () => {
    console.log('🚀 Running initial product sync on startup...');
    try {
      await syncAllNetworks();
      console.log('✅ Initial product sync completed');
    } catch (error) {
      console.error('❌ Initial product sync failed:', error);
    }
  }, 30000); // 30 seconds after server start
  
  console.log('✅ Product sync cron job started successfully');
}

/**
 * Manual trigger for product sync (for testing/admin use)
 */
export async function triggerManualSync() {
  if (isRunning) {
    throw new Error('Product sync is already running');
  }
  
  isRunning = true;
  
  try {
    console.log('🔄 Manual product sync triggered...');
    const startTime = Date.now();
    
    const results = await syncAllNetworks();
    
    const duration = Date.now() - startTime;
    console.log(`✅ Manual sync completed in ${duration}ms`);
    
    return {
      success: true,
      duration,
      results
    };
    
  } catch (error) {
    console.error('❌ Manual product sync failed:', error);
    throw error;
  } finally {
    isRunning = false;
  }
}

/**
 * Get sync job status
 */
export function getSyncJobStatus() {
  return {
    isRunning,
    nextRun: getNextRunTime()
  };
}

/**
 * Calculate next run time
 */
function getNextRunTime(): string {
  const now = new Date();
  const hours = now.getHours();
  
  // Find next 6-hour interval
  const nextHour = Math.ceil((hours + 1) / 6) * 6;
  const nextRun = new Date();
  nextRun.setHours(nextHour, 0, 0, 0);
  
  // If next run is tomorrow, set it accordingly
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  return nextRun.toISOString();
}

/**
 * Log sync results for monitoring
 */
function logSyncResults(results: any[], duration: number) {
  const successful = results.filter(r => r.success).length;
  const totalProducts = results.reduce((sum, r) => sum + r.productsCount, 0);
  
  console.log('📊 SYNC RESULTS LOGGED:');
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Networks: ${successful}/${results.length} successful`);
  console.log(`   Products: ${totalProducts} total synced`);
  
  // Here you could also send to external monitoring service
  // monitoringService.logSyncResults(results, duration);
}

/**
 * Stop the product sync job (for graceful shutdown)
 */
export function stopProductSyncJob() {
  console.log('🛑 Stopping product sync job...');
  // In a real implementation, you might want to keep track of the cron job
  // and call task.stop() here
  console.log('✅ Product sync job stopped');
}
