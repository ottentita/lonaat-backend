import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

// POST /api/queue/add - Add content to queue
router.post('/add', authMiddleware, async (req: AuthRequest, res) => {
  console.log('➕ ADD TO QUEUE REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { contentId, content, platform, scheduledAt } = req.body;

    if (!content || !platform) {
      return res.status(400).json({ 
        error: 'Missing required fields: content, platform' 
      });
    }

    console.log('👤 User:', userId);
    console.log('📱 Platform:', platform);
    console.log('📅 Scheduled:', scheduledAt || 'immediate');

    const queueItem = await prisma.queue.create({
      data: {
        userId,
        contentId: contentId || null,
        content,
        platform,
        status: 'pending',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null
      }
    });

    console.log('✅ Added to queue:', queueItem.id);

    res.json({
      success: true,
      queueItem: {
        id: queueItem.id,
        content: queueItem.content.substring(0, 100) + '...',
        platform: queueItem.platform,
        status: queueItem.status,
        scheduledAt: queueItem.scheduledAt,
        createdAt: queueItem.createdAt
      },
      message: 'Content added to queue'
    });

  } catch (error: any) {
    console.error('❌ Add to queue error:', error);
    res.status(500).json({ 
      error: 'Failed to add to queue',
      details: error.message 
    });
  }
});

// GET /api/queue/list - Get user's queue
router.get('/list', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📋 GET QUEUE REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status, platform, limit = 50 } = req.query;

    console.log('👤 User:', userId);
    console.log('🔍 Status filter:', status || 'all');
    console.log('📱 Platform filter:', platform || 'all');

    const where: any = { userId };
    if (status && status !== 'all') {
      where.status = status;
    }
    if (platform && platform !== 'all') {
      where.platform = platform;
    }

    const [items, total] = await Promise.all([
      prisma.queue.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit)
      }),
      prisma.queue.count({ where })
    ]);

    console.log('✅ Found', items.length, 'queue items out of', total, 'total');

    res.json({
      success: true,
      items,
      total
    });

  } catch (error: any) {
    console.error('❌ Get queue error:', error);
    res.status(500).json({ 
      error: 'Failed to get queue',
      details: error.message 
    });
  }
});

// PATCH /api/queue/:id/status - Update queue item status
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🔄 UPDATE QUEUE STATUS REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { status, error } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    if (!['pending', 'posted', 'failed'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be: pending, posted, or failed' 
      });
    }

    const queueItem = await prisma.queue.findUnique({
      where: { id }
    });

    if (!queueItem) {
      return res.status(404).json({ error: 'Queue item not found' });
    }

    if (queueItem.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden - not your queue item' });
    }

    const updated = await prisma.queue.update({
      where: { id },
      data: {
        status,
        error: error || null,
        postedAt: status === 'posted' ? new Date() : null
      }
    });

    console.log('✅ Queue status updated:', id, '→', status);

    res.json({
      success: true,
      queueItem: updated,
      message: 'Queue status updated'
    });

  } catch (error: any) {
    console.error('❌ Update queue status error:', error);
    res.status(500).json({ 
      error: 'Failed to update queue status',
      details: error.message 
    });
  }
});

// DELETE /api/queue/:id - Delete queue item
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🗑️ DELETE QUEUE ITEM REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const queueItem = await prisma.queue.findUnique({
      where: { id }
    });

    if (!queueItem) {
      return res.status(404).json({ error: 'Queue item not found' });
    }

    if (queueItem.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden - not your queue item' });
    }

    await prisma.queue.delete({
      where: { id }
    });

    console.log('✅ Queue item deleted:', id);

    res.json({
      success: true,
      message: 'Queue item deleted'
    });

  } catch (error: any) {
    console.error('❌ Delete queue item error:', error);
    res.status(500).json({ 
      error: 'Failed to delete queue item',
      details: error.message 
    });
  }
});

// GET /api/queue/stats - Get queue statistics
router.get('/stats', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📊 GET QUEUE STATS REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [pending, posted, failed, total] = await Promise.all([
      prisma.queue.count({ where: { userId, status: 'pending' } }),
      prisma.queue.count({ where: { userId, status: 'posted' } }),
      prisma.queue.count({ where: { userId, status: 'failed' } }),
      prisma.queue.count({ where: { userId } })
    ]);

    console.log('✅ Queue stats:', { pending, posted, failed, total });

    res.json({
      success: true,
      stats: {
        pending,
        posted,
        failed,
        total
      }
    });

  } catch (error: any) {
    console.error('❌ Get queue stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get queue stats',
      details: error.message 
    });
  }
});

export default router;
