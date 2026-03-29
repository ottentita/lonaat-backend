import prisma from '../prisma';
import axios from 'axios';

// Safety limits
const MAX_GENERATIONS_PER_HOUR = 10;
const generationLog: { userId: string; timestamp: Date }[] = [];

// Clean old logs (older than 1 hour)
function cleanOldLogs() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const initialLength = generationLog.length;
  
  for (let i = generationLog.length - 1; i >= 0; i--) {
    if (generationLog[i].timestamp < oneHourAgo) {
      generationLog.splice(i, 1);
    }
  }
  
  if (generationLog.length !== initialLength) {
    console.log(`🧹 Cleaned ${initialLength - generationLog.length} old generation logs`);
  }
}

// Check if user has exceeded generation limit
function canGenerate(userId: string): boolean {
  cleanOldLogs();
  const userGenerations = generationLog.filter(log => log.userId === userId);
  return userGenerations.length < MAX_GENERATIONS_PER_HOUR;
}

// Log a generation
function logGeneration(userId: string) {
  generationLog.push({
    userId,
    timestamp: new Date()
  });
}

// Generate content using AI
async function generateContent(prompt: string, templateType: string): Promise<string> {
  try {
    console.log('🤖 Generating AI content...');
    
    // Call the AI generation endpoint
    const response = await axios.post('http://localhost:4000/api/ai/generate', {
      productTitle: `Auto-generated ${templateType}`,
      productDescription: prompt,
      platform: 'tiktok'
    });

    if (response.data && response.data.success && response.data.data) {
      const { hooks, script, caption, hashtags } = response.data.data;
      
      const formattedOutput = `
🎯 HOOKS:
${hooks.map((hook: string, i: number) => `${i + 1}. ${hook}`).join('\n')}

📝 SCRIPT:
${script}

✍️ CAPTION:
${caption}

#️⃣ HASHTAGS:
${hashtags.join(' ')}
      `.trim();

      return formattedOutput;
    }

    throw new Error('Invalid AI response');
  } catch (error: any) {
    console.error('❌ AI generation failed:', error.message);
    throw error;
  }
}

// Process a single schedule
async function processSchedule(schedule: any) {
  console.log('⚙️ Processing schedule:', schedule.id);
  console.log('👤 User:', schedule.userId);
  console.log('📋 Template:', schedule.templateType);

  // Check safety limits
  if (!canGenerate(schedule.userId)) {
    console.log('⚠️ User has exceeded generation limit, skipping...');
    return;
  }

  try {
    // Generate content
    const content = await generateContent(schedule.prompt, schedule.templateType);
    console.log('✅ Content generated');

    // Save to content history
    const savedContent = await prisma.content.create({
      data: {
        userId: schedule.userId,
        prompt: schedule.prompt,
        result: content,
        type: schedule.templateType
      }
    });
    console.log('💾 Content saved:', savedContent.id);

    // Add to queue
    const queueItem = await prisma.queue.create({
      data: {
        userId: schedule.userId,
        contentId: savedContent.id,
        content: content,
        platform: schedule.templateType === 'tiktok' ? 'tiktok' : 
                  schedule.templateType === 'youtube' ? 'youtube' : 'twitter',
        status: 'pending'
      }
    });
    console.log('📥 Added to queue:', queueItem.id);

    // Log generation
    logGeneration(schedule.userId);

    // Update schedule
    const nextRun = calculateNextRun(schedule.frequency, schedule.time);
    await prisma.schedule.update({
      where: { id: schedule.id },
      data: {
        lastRun: new Date(),
        nextRun: nextRun
      }
    });
    console.log('⏭️ Next run scheduled for:', nextRun);

    console.log('✅ Schedule processed successfully');

  } catch (error: any) {
    console.error('❌ Failed to process schedule:', error.message);
    
    // Optionally: mark schedule as failed or disable it
    // await prisma.schedule.update({
    //   where: { id: schedule.id },
    //   data: { isActive: false }
    // });
  }
}

// Calculate next run time
function calculateNextRun(frequency: string, time: string): Date {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const nextRun = new Date();
  
  if (frequency === 'hourly') {
    nextRun.setHours(now.getHours() + 1, 0, 0, 0);
  } else if (frequency === 'daily') {
    nextRun.setHours(hours, minutes, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  } else if (frequency === 'weekly') {
    nextRun.setHours(hours, minutes, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 7);
    }
  }
  
  return nextRun;
}

// Main worker function
export async function runAutoGenerator() {
  console.log('🔄 AUTO GENERATOR WORKER RUNNING');
  console.log('⏰ Time:', new Date().toISOString());

  try {
    // Find schedules that need to run
    const now = new Date();
    const schedules = await prisma.schedule.findMany({
      where: {
        isActive: true,
        nextRun: {
          lte: now
        }
      }
    });

    console.log('📊 Found', schedules.length, 'schedules to process');

    if (schedules.length === 0) {
      console.log('✅ No schedules to process');
      return;
    }

    // Process each schedule
    for (const schedule of schedules) {
      await processSchedule(schedule);
      
      // Add delay between generations to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('✅ Auto generator worker completed');

  } catch (error: any) {
    console.error('❌ Auto generator worker error:', error);
  }
}

// Start the worker (runs every 5 minutes)
export function startAutoGenerator() {
  console.log('🚀 Starting Auto Generator Worker');
  console.log('⏱️ Interval: 5 minutes');
  console.log('🛡️ Safety limit:', MAX_GENERATIONS_PER_HOUR, 'generations per hour per user');

  // Run immediately on start
  runAutoGenerator();

  // Then run every 5 minutes
  const interval = setInterval(() => {
    runAutoGenerator();
  }, 5 * 60 * 1000); // 5 minutes

  return interval;
}

// Export for manual testing
export { canGenerate, logGeneration, cleanOldLogs };
