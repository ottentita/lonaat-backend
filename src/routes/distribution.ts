import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import { 
  formatForAllPlatforms, 
  createCopyPackage, 
  generateVideoScript,
  createHookCTAFormat 
} from '../utils/socialDistribution';

const router = Router();

// POST /api/distribution/prepare - Prepare content for distribution
router.post('/prepare', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📦 PREPARE DISTRIBUTION REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { contentId, platforms = ['tiktok', 'instagram', 'twitter'] } = req.body;

    if (!contentId) {
      return res.status(400).json({ error: 'contentId is required' });
    }

    console.log('👤 User:', userId);
    console.log('🆔 Content ID:', contentId);
    console.log('📱 Platforms:', platforms.join(', '));

    // Fetch content
    const content = await prisma.content.findUnique({
      where: { id: contentId }
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (content.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden - not your content' });
    }

    // Parse metadata if available
    let metadata: any = {};
    try {
      metadata = content.metadata ? JSON.parse(content.metadata as string) : {};
    } catch (e) {
      console.log('⚠️ Failed to parse metadata');
    }

    // Prepare content data
    const contentData = {
      hook: metadata.hook || content.result.substring(0, 100),
      script: content.result,
      cta: metadata.cta || null,
      hashtags: metadata.hashtags || [],
      product: metadata.product || null
    };

    // Format for all platforms
    const formatted = formatForAllPlatforms(contentData);

    // Create copy package
    const copyPackage = createCopyPackage(contentData);

    // Generate video script
    const videoScript = generateVideoScript(contentData);

    console.log('✅ Content prepared for distribution');

    res.json({
      success: true,
      contentId,
      platforms: {
        tiktok: formatted.tiktok,
        instagram: formatted.instagram,
        twitter: formatted.twitter
      },
      copyPackage,
      videoScript,
      message: 'Content prepared for distribution'
    });

  } catch (error: any) {
    console.error('❌ Prepare distribution error:', error);
    res.status(500).json({ 
      error: 'Failed to prepare distribution',
      details: error.message 
    });
  }
});

// POST /api/distribution/queue/add - Add content to distribution queue
router.post('/queue/add', authMiddleware, async (req: AuthRequest, res) => {
  console.log('➕ ADD TO QUEUE REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { contentId, platform, formattedContent, scheduledFor } = req.body;

    if (!contentId || !platform || !formattedContent) {
      return res.status(400).json({ error: 'contentId, platform, and formattedContent are required' });
    }

    console.log('👤 User:', userId);
    console.log('📱 Platform:', platform);
    console.log('🆔 Content ID:', contentId);

    // Verify content ownership
    const content = await prisma.content.findUnique({
      where: { id: contentId }
    });

    if (!content || content.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden - not your content' });
    }

    // Add to queue
    const queueItem = await prisma.queue.create({
      data: {
        userId,
        contentId,
        platform,
        status: 'ready',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        metadata: JSON.stringify({ formattedContent })
      }
    });

    console.log('✅ Added to queue:', queueItem.id);

    res.json({
      success: true,
      queueItem: {
        id: queueItem.id,
        platform,
        status: queueItem.status,
        scheduledFor: queueItem.scheduledFor,
        createdAt: queueItem.createdAt
      },
      message: 'Content added to distribution queue'
    });

  } catch (error: any) {
    console.error('❌ Add to queue error:', error);
    res.status(500).json({ 
      error: 'Failed to add to queue',
      details: error.message 
    });
  }
});

// GET /api/distribution/queue - Get distribution queue
router.get('/queue', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📋 GET QUEUE REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { platform, status, limit = 50 } = req.query;

    const where: any = { userId };
    if (platform && platform !== 'all') {
      where.platform = platform;
    }
    if (status && status !== 'all') {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      prisma.queue.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        include: {
          content: {
            select: {
              id: true,
              prompt: true,
              type: true,
              createdAt: true
            }
          }
        }
      }),
      prisma.queue.count({ where })
    ]);

    console.log('✅ Found', items.length, 'queue items');

    // Parse metadata for each item
    const itemsWithMetadata = items.map(item => ({
      ...item,
      formattedContent: item.metadata ? JSON.parse(item.metadata as string).formattedContent : null
    }));

    res.json({
      success: true,
      items: itemsWithMetadata,
      total,
      message: `Found ${items.length} items in queue`
    });

  } catch (error: any) {
    console.error('❌ Get queue error:', error);
    res.status(500).json({ 
      error: 'Failed to get queue',
      details: error.message 
    });
  }
});

// DELETE /api/distribution/queue/:id - Remove from queue
router.delete('/queue/:id', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🗑️ REMOVE FROM QUEUE REQUEST');
  
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

    console.log('✅ Removed from queue:', id);

    res.json({
      success: true,
      message: 'Removed from queue'
    });

  } catch (error: any) {
    console.error('❌ Remove from queue error:', error);
    res.status(500).json({ 
      error: 'Failed to remove from queue',
      details: error.message 
    });
  }
});

// POST /api/distribution/batch-prepare - Prepare multiple content items
router.post('/batch-prepare', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🔄 BATCH PREPARE REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { contentIds, platforms = ['tiktok', 'instagram', 'twitter'] } = req.body;

    if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return res.status(400).json({ error: 'contentIds array is required' });
    }

    console.log('👤 User:', userId);
    console.log('📊 Preparing', contentIds.length, 'items');

    const results = [];
    const errors = [];

    for (const contentId of contentIds) {
      try {
        // Fetch content
        const content = await prisma.content.findUnique({
          where: { id: contentId }
        });

        if (!content || content.userId !== userId) {
          errors.push({ contentId, error: 'Not found or forbidden' });
          continue;
        }

        // Parse metadata
        let metadata: any = {};
        try {
          metadata = content.metadata ? JSON.parse(content.metadata as string) : {};
        } catch (e) {
          metadata = {};
        }

        // Prepare content data
        const contentData = {
          hook: metadata.hook || content.result.substring(0, 100),
          script: content.result,
          cta: metadata.cta || null,
          hashtags: metadata.hashtags || [],
          product: metadata.product || null
        };

        // Format for platforms
        const formatted = formatForAllPlatforms(contentData);

        results.push({
          contentId,
          platforms: formatted
        });

      } catch (error: any) {
        errors.push({ contentId, error: error.message });
      }
    }

    console.log('✅ Batch prepare complete');
    console.log('📊 Prepared:', results.length);
    console.log('❌ Failed:', errors.length);

    res.json({
      success: true,
      results,
      errors,
      summary: {
        total: contentIds.length,
        prepared: results.length,
        failed: errors.length
      }
    });

  } catch (error: any) {
    console.error('❌ Batch prepare error:', error);
    res.status(500).json({ 
      error: 'Failed to batch prepare',
      details: error.message 
    });
  }
});

export default router;
