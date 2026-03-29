import { Router, Response, Request } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest, adminOnlyMiddleware } from '../middleware/auth';
import { enqueueSocialPosts } from '../services/socialQueue';
import { processPendingPosts, getSocialStats, publishPost } from '../services/socialPublisher';
import { generateSocialContent } from '../services/socialAI';

const router = Router();


router.get('/accounts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const accounts = await prisma.socialAccount.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        platform: true,
        page_id: true,
        page_name: true,
        enabled: true,
        created_at: true
      }
    });

    res.json({ accounts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/accounts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { platform, access_token, page_id, page_name, config } = req.body;

    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    const userId = Number(req.user!.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const account = await prisma.socialAccount.upsert({
      where: {
        user_id_platform_page_id: {
          user_id: userId,
          platform,
          page_id: page_id || 'default'
        }
      },
      update: {
        access_token,
        page_name,
        config,
        enabled: true
      },
      create: {
        user_id: userId,
        platform,
        access_token,
        page_id: page_id || 'default',
        page_name,
        config
      }
    });

    res.json({ 
      success: true, 
      account: {
        id: account.id,
        platform: account.platform,
        page_name: account.page_name,
        enabled: account.enabled
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/accounts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const accountId = Number(req.params.id);
    
    if (isNaN(userId) || isNaN(accountId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    await prisma.socialAccount.deleteMany({
      where: {
        id: accountId,
        user_id: userId
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/accounts/:id/toggle', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const accountId = Number(req.params.id);
    
    if (isNaN(userId) || isNaN(accountId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const account = await prisma.socialAccount.findFirst({
      where: { id: accountId, user_id: userId }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const updated = await prisma.socialAccount.update({
      where: { id: accountId },
      data: { enabled: !account.enabled }
    });

    res.json({ success: true, enabled: updated.enabled });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/posts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as string;
    const platform = req.query.platform as string;

    const where: any = { user_id: userId };
    if (status) where.status = status;
    if (platform) where.platform = platform;

    const [posts, total] = await Promise.all([
      prisma.socialPost.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.socialPost.count({ where })
    ]);

    res.json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/posts/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    const product = await prisma.product.findUnique({
      where: { id: product_id }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await enqueueSocialPosts({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      description: product.description,
      affiliate_link: product.affiliate_link
    }, Number(req.user!.id), true);

    res.json({ success: true, message: 'Social posts queued with AI content' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/posts/preview', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { product_id } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: product_id }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const content = await generateSocialContent({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      description: product.description,
      affiliate_link: product.affiliate_link
    });

    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/posts/:id/publish', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const postId = Number(req.params.id);
    
    if (isNaN(userId) || isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const post = await prisma.socialPost.findFirst({
      where: { id: postId, user_id: userId }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const result = await publishPost(post as any);

    if (result.success) {
      await prisma.socialPost.update({
        where: { id: postId },
        data: { 
          status: 'published', 
          post_url: result.postUrl,
          published_at: new Date()
        }
      });
    } else {
      await prisma.socialPost.update({
        where: { id: postId },
        data: { status: 'failed', error: result.error }
      });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/posts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const postId = Number(req.params.id);
    
    if (isNaN(userId) || isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    await prisma.socialPost.deleteMany({
      where: { id: postId, user_id: userId }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getSocialStats(Number(req.user!.id));
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/process', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const result = await processPendingPosts(limit);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/posts/retry-failed', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const result = await prisma.socialPost.updateMany({
      where: { 
        user_id: userId,
        status: 'failed' 
      },
      data: { status: 'pending', error: null }
    });

    res.json({ success: true, count: result.count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
