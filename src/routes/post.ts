import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

// POST /api/post/simulate - Simulate posting content
router.post('/simulate', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📤 SIMULATE POST REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { queueId, platform, content } = req.body;

    if (!queueId && !content) {
      return res.status(400).json({ 
        error: 'Either queueId or content is required' 
      });
    }

    console.log('👤 User:', userId);
    console.log('📱 Platform:', platform);
    console.log('🆔 Queue ID:', queueId || 'direct post');

    let queueItem;
    let contentToPost = content;

    // If queueId provided, fetch from queue
    if (queueId) {
      queueItem = await prisma.queue.findUnique({
        where: { id: queueId }
      });

      if (!queueItem) {
        return res.status(404).json({ error: 'Queue item not found' });
      }

      if (queueItem.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden - not your queue item' });
      }

      contentToPost = queueItem.content;
    }

    // Simulate posting (log the content)
    console.log('📝 SIMULATED POST:');
    console.log('═══════════════════════════════════════');
    console.log(`Platform: ${platform || queueItem?.platform || 'unknown'}`);
    console.log(`User: ${userId}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('───────────────────────────────────────');
    console.log(contentToPost);
    console.log('═══════════════════════════════════════');

    // Update queue item status if it exists
    if (queueItem) {
      await prisma.queue.update({
        where: { id: queueId },
        data: {
          status: 'posted',
          postedAt: new Date()
        }
      });
      console.log('✅ Queue item marked as posted:', queueId);
    }

    // Create a log entry (you could add a PostLog model later)
    console.log('✅ Content posted successfully (simulated)');

    res.json({
      success: true,
      message: 'Content posted successfully (simulated)',
      post: {
        platform: platform || queueItem?.platform,
        content: contentToPost.substring(0, 100) + '...',
        postedAt: new Date(),
        simulation: true
      }
    });

  } catch (error: any) {
    console.error('❌ Simulate post error:', error);
    res.status(500).json({ 
      error: 'Failed to simulate post',
      details: error.message 
    });
  }
});

// POST /api/post/batch - Simulate posting multiple items from queue
router.post('/batch', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📤 BATCH POST REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { queueIds, limit = 10 } = req.body;

    let itemsToPost;

    if (queueIds && Array.isArray(queueIds)) {
      // Post specific items
      itemsToPost = await prisma.queue.findMany({
        where: {
          id: { in: queueIds },
          userId,
          status: 'pending'
        }
      });
    } else {
      // Post next pending items
      itemsToPost = await prisma.queue.findMany({
        where: {
          userId,
          status: 'pending'
        },
        orderBy: { createdAt: 'asc' },
        take: Number(limit)
      });
    }

    console.log('📊 Found', itemsToPost.length, 'items to post');

    const results = [];

    for (const item of itemsToPost) {
      console.log('📤 Posting item:', item.id);
      console.log(`Platform: ${item.platform}`);
      console.log(`Content: ${item.content.substring(0, 50)}...`);

      // Update status
      await prisma.queue.update({
        where: { id: item.id },
        data: {
          status: 'posted',
          postedAt: new Date()
        }
      });

      results.push({
        id: item.id,
        platform: item.platform,
        status: 'posted'
      });
    }

    console.log('✅ Batch post complete:', results.length, 'items posted');

    res.json({
      success: true,
      message: `Posted ${results.length} items (simulated)`,
      results
    });

  } catch (error: any) {
    console.error('❌ Batch post error:', error);
    res.status(500).json({ 
      error: 'Failed to batch post',
      details: error.message 
    });
  }
});

export default router;
