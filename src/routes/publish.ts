import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import { formatForPlatform, validateForPlatform } from '../utils/platformFormatter';
import { generateHashtags } from '../utils/hashtagGenerator';

const router = Router();

// ============================================
// PHASE 4: SMART PUBLISH SYSTEM
// ============================================

// GET /api/publish/prepare/:draftId - Prepare content for publishing
router.get('/prepare/:draftId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { draftId } = req.params;
    const { platform } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    console.log('📦 PREPARE CONTENT FOR PUBLISH:', { userId, draftId, platform });

    // Get draft
    const draft = await prisma.content.findUnique({
      where: { id: draftId }
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: 'Draft not found'
      });
    }

    if (draft.userId !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this draft'
      });
    }

    // Parse content
    const content = JSON.parse(draft.result);

    // Prepare platform-specific content
    let platformContent: any = {};
    let platformUrl: string = '';

    if (platform === 'tiktok') {
      platformContent = {
        text: `${content.script.hook}\n\n${content.script.body}\n\n${content.script.cta}\n\n${content.hashtags}`,
        link: content.trackingLink.short
      };
      platformUrl = 'https://www.tiktok.com/upload';
    } else if (platform === 'whatsapp') {
      platformContent = {
        text: `${content.message}\n\n${content.trackingLink.short}`,
        link: content.trackingLink.short
      };
      platformUrl = 'https://web.whatsapp.com/';
    } else if (platform === 'instagram') {
      platformContent = {
        text: `${content.story}\n\n${content.hashtags}`,
        link: content.trackingLink.landing
      };
      platformUrl = 'https://www.instagram.com/';
    } else {
      // Default: all content
      platformContent = {
        script: content.script,
        message: content.message,
        story: content.story,
        hashtags: content.hashtags,
        link: content.trackingLink.short
      };
    }

    console.log('✅ CONTENT PREPARED FOR:', platform || 'all platforms');

    return res.json({
      success: true,
      data: {
        draftId,
        platform: platform || 'all',
        content: platformContent,
        actions: {
          copyContent: true,
          copyLink: true,
          openPlatform: platformUrl
        },
        instructions: {
          tiktok: '1. Copy content\n2. Open TikTok\n3. Record video\n4. Paste caption\n5. Post',
          whatsapp: '1. Copy message\n2. Open WhatsApp\n3. Select contact/group\n4. Paste and send',
          instagram: '1. Copy story text\n2. Open Instagram\n3. Create story\n4. Add text\n5. Post'
        }
      }
    });

  } catch (error: any) {
    console.error('❌ PREPARE PUBLISH ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/post/publish - Publish content to a platform
router.post('/publish', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📤 PUBLISH CONTENT REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { contentId, platform, content: directContent } = req.body;

    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    if (!contentId && !directContent) {
      return res.status(400).json({ error: 'Either contentId or content is required' });
    }

    console.log('👤 User:', userId);
    console.log('📱 Platform:', platform);
    console.log('🆔 Content ID:', contentId || 'direct');

    let contentToPublish = directContent;
    let contentRecord = null;

    // If contentId provided, fetch from database
    if (contentId) {
      contentRecord = await prisma.content.findUnique({
        where: { id: contentId }
      });

      if (!contentRecord) {
        return res.status(404).json({ error: 'Content not found' });
      }

      if (contentRecord.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden - not your content' });
      }

      contentToPublish = contentRecord.result;
    }

    // Validate content for platform
    const validation = validateForPlatform(contentToPublish, platform);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Content validation failed',
        details: validation.errors 
      });
    }

    // Generate hashtags based on content
    const category = contentRecord?.type || 'general';
    const hashtags = generateHashtags(contentToPublish.substring(0, 100), category, 10);

    // Format content for platform
    const formatted = formatForPlatform(contentToPublish, platform, hashtags);

    console.log('📝 Formatted content for', platform);
    console.log('📊 Character count:', formatted.characterCount);
    console.log('#️⃣ Hashtags:', formatted.hashtags.length);

    // Simulate publishing (log the formatted content)
    console.log('📤 SIMULATED PUBLISH:');
    console.log('═══════════════════════════════════════');
    console.log(`Platform: ${platform.toUpperCase()}`);
    console.log(`User: ${userId}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('───────────────────────────────────────');
    console.log(formatted.content);
    console.log('═══════════════════════════════════════');

    // Create analytics record
    const analytics = await prisma.postAnalytics.create({
      data: {
        userId,
        contentId: contentId || null,
        platform,
        status: 'published',
        content: formatted.content,
        hashtags: formatted.hashtags,
        publishedAt: new Date()
      }
    });

    console.log('✅ Content published (simulated):', analytics.id);

    res.json({
      success: true,
      message: `Content published to ${platform} (simulated)`,
      analytics: {
        id: analytics.id,
        platform: analytics.platform,
        status: analytics.status,
        publishedAt: analytics.publishedAt,
        characterCount: formatted.characterCount,
        hashtagCount: formatted.hashtags.length
      },
      formatted: {
        content: formatted.content,
        hashtags: formatted.hashtags,
        characterCount: formatted.characterCount
      },
      validation: {
        warnings: validation.warnings
      }
    });

  } catch (error: any) {
    console.error('❌ Publish error:', error);
    res.status(500).json({ 
      error: 'Failed to publish content',
      details: error.message 
    });
  }
});

// POST /api/post/bulk-publish - Publish multiple content items
router.post('/bulk-publish', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📤 BULK PUBLISH REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { contentIds, platform } = req.body;

    if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return res.status(400).json({ error: 'contentIds array is required' });
    }

    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    console.log('👤 User:', userId);
    console.log('📱 Platform:', platform);
    console.log('📊 Content count:', contentIds.length);

    const results = [];
    const errors = [];

    for (const contentId of contentIds) {
      try {
        // Fetch content
        const content = await prisma.content.findUnique({
          where: { id: contentId }
        });

        if (!content) {
          errors.push({ contentId, error: 'Content not found' });
          continue;
        }

        if (content.userId !== userId) {
          errors.push({ contentId, error: 'Forbidden - not your content' });
          continue;
        }

        // Generate hashtags
        const hashtags = generateHashtags(content.result.substring(0, 100), content.type, 10);

        // Format for platform
        const formatted = formatForPlatform(content.result, platform, hashtags);

        // Validate
        const validation = validateForPlatform(formatted.content, platform);
        if (!validation.valid) {
          errors.push({ contentId, error: validation.errors.join(', ') });
          continue;
        }

        // Log simulated publish
        console.log(`📤 Publishing ${contentId} to ${platform}...`);

        // Create analytics record
        const analytics = await prisma.postAnalytics.create({
          data: {
            userId,
            contentId,
            platform,
            status: 'published',
            content: formatted.content,
            hashtags: formatted.hashtags,
            publishedAt: new Date()
          }
        });

        results.push({
          contentId,
          analyticsId: analytics.id,
          platform,
          status: 'published',
          characterCount: formatted.characterCount,
          hashtagCount: formatted.hashtags.length
        });

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        console.error(`❌ Failed to publish ${contentId}:`, error.message);
        errors.push({ contentId, error: error.message });
      }
    }

    console.log('✅ Bulk publish complete');
    console.log('📊 Published:', results.length);
    console.log('❌ Failed:', errors.length);

    res.json({
      success: true,
      message: `Bulk publish complete: ${results.length} published, ${errors.length} failed`,
      results,
      errors,
      summary: {
        total: contentIds.length,
        published: results.length,
        failed: errors.length
      }
    });

  } catch (error: any) {
    console.error('❌ Bulk publish error:', error);
    res.status(500).json({ 
      error: 'Failed to bulk publish',
      details: error.message 
    });
  }
});

// GET /api/post/analytics - Get publishing analytics
router.get('/analytics', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📊 GET ANALYTICS REQUEST');
  
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

    const [analytics, total, stats] = await Promise.all([
      prisma.postAnalytics.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit)
      }),
      prisma.postAnalytics.count({ where }),
      prisma.postAnalytics.groupBy({
        by: ['platform', 'status'],
        where: { userId },
        _count: true
      })
    ]);

    console.log('✅ Found', analytics.length, 'analytics records');

    res.json({
      success: true,
      analytics,
      total,
      stats: stats.map((s: any) => ({
        platform: s.platform,
        status: s.status,
        count: s?._count ?? 0
      }))
    });

  } catch (error: any) {
    console.error('❌ Get analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to get analytics',
      details: error.message 
    });
  }
});

// DELETE /api/post/analytics/:id - Delete analytics record
router.delete('/analytics/:id', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🗑️ DELETE ANALYTICS REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const analytics = await prisma.postAnalytics.findUnique({
      where: { id }
    });

    if (!analytics) {
      return res.status(404).json({ error: 'Analytics record not found' });
    }

    if (analytics.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden - not your record' });
    }

    await prisma.postAnalytics.delete({
      where: { id }
    });

    console.log('✅ Analytics record deleted:', id);

    res.json({
      success: true,
      message: 'Analytics record deleted'
    });

  } catch (error: any) {
    console.error('❌ Delete analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to delete analytics',
      details: error.message 
    });
  }
});

export default router;
