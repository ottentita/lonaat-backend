/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MONETIZATION CRON JOB
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Runs auto monetization system every 6 hours
 */

import cron from 'node-cron';
import runAutoMonetizationSystem from '../scripts/auto-monetization-system';

/**
 * Schedule auto monetization system to run every 6 hours
 */
export function scheduleMonetizationCron() {
  console.log('🕐 Scheduling auto monetization system to run every 6 hours...');
  
  // Run every 6 hours: '0 */6 * * *'
  cron.schedule('0 */6 * * *', async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⏰ AUTO MONETIZATION CRON JOB STARTED');
    console.log(`📅 ${new Date().toISOString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    try {
      await runAutoMonetizationSystem();
      console.log('✅ Cron job completed successfully');
    } catch (error) {
      console.error('❌ Cron job failed:', error);
    }
  });
  
  console.log('✅ Auto monetization cron job scheduled (every 6 hours)');
}

/**
 * Run immediately for testing
 */
export function runMonetizationNow() {
  console.log('🚀 Running auto monetization system immediately...');
  return runAutoMonetizationSystem();
}
