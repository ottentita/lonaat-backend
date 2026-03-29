/**
 * AUTOMATED AD GENERATION CRON JOB
 * Generates ads for top products every 30 minutes
 */

import cron from 'node-cron';
import prisma from '../prisma';
import { generateAndSaveAd } from '../services/aiAd.service';

/**
 * Start automated ad generation for top products
 * Runs every 30 minutes
 */
export function startAutoAdGeneration() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⏰ AUTO AD GENERATION INITIALIZED');
  console.log('📅 Schedule: Every 30 minutes');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Schedule: Every 30 minutes
  const job = cron.schedule('*/30 * * * *', async () => {
    try {
      console.log('\n🤖 AUTO AD GENERATION STARTED');
      console.log(`⏰ Time: ${new Date().toISOString()}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Get top products without ads (by clicks/views)
      const topProducts = await prisma.products.findMany({
        where: {
          isActive: true,
          isApproved: true,
          aiGeneratedAd: null
        },
        orderBy: [
          { clicks: 'desc' },
          { views: 'desc' }
        ],
        take: 10 // Generate ads for top 10 products
      });

      if (topProducts.length === 0) {
        console.log('⚠️ No products found needing ads');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return;
      }

      console.log(`📦 Found ${topProducts.length} products needing ads`);

      let successCount = 0;
      let failCount = 0;

      for (const product of topProducts) {
        try {
          const ad = await generateAndSaveAd(product.id, prisma);
          console.log(`✅ Generated ad for: ${product.name}`);
          successCount++;

          // Rate limiting - wait 1 second between generations
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
          console.error(`❌ Failed for ${product.name}:`, error.message);
          failCount++;
        }
      }

      console.log('\n📊 GENERATION SUMMARY:');
      console.log(`   ✅ Success: ${successCount}`);
      console.log(`   ❌ Failed: ${failCount}`);
      console.log(`   📝 Total: ${topProducts.length}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Auto ad generation completed\n');

    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ AUTO AD GENERATION FAILED');
      console.error('Error:', error.message);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  });

  console.log('✅ Auto ad generation cron job started');
  console.log('🔄 Next generation in 30 minutes\n');

  return job;
}

/**
 * Stop the cron job
 */
export function stopAutoAdGeneration(job: cron.ScheduledTask) {
  if (job) {
    job.stop();
    console.log('⏹️ Auto ad generation stopped');
  }
}

export default {
  startAutoAdGeneration,
  stopAutoAdGeneration
};
