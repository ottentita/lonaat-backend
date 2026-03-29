import { Router, Response, Request } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest, authenticate } from '../middleware/auth';
import { authorizeRole } from '../middleware/role';
import { body, validationResult } from 'express-validator';
import { getWallet } from '../modules/ads/tokenWallet.service';
import { searchAffiliateOffers, getAvailableNetworks } from '../services/affiliateService';

const router = Router();

// GET /api/marketplace/products - Unified affiliate products from all networks
router.get('/products', async (req: Request, res: Response) => {
  try {
    console.log('📡 MARKETPLACE - GET /products request:', req.query);
    
    const limit = Number(req.query.limit) || 50;
    const network = req.query.network as string;
    const category = req.query.category as string;
    const search = req.query.search as string;

    // Fetch products from unified affiliate service
    let products = await searchAffiliateOffers(network, category, limit);
    
    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(p => 
        p.title.toLowerCase().includes(searchLower) ||
        (p.description && p.description.toLowerCase().includes(searchLower))
      );
    }

    // Get available networks
    const networks = getAvailableNetworks();

    console.log(`✅ MARKETPLACE - Returning ${products.length} products from ${networks.length} networks`);

    res.json({
      products,
      networks,
      total: products.length
    });
  } catch (error) {
    console.error('❌ MARKETPLACE - Products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const productId = Number(idParam);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        network: true,
        image_url: true,
        affiliate_link: true,
        is_active: true,
        created_at: true
      }
    });

    if (!product || !product.is_active) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

router.get('/networks', async (req: Request, res: Response) => {
  try {
    const networks = await prisma.product.groupBy({
      by: ['network'],
      _count: { id: true },
      where: { is_active: true }
    });

    res.json({
      networks: networks.map(n => ({
        name: n.network,
        product_count: n?._count?.id ?? 0
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get networks' });
  }
});

router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.product.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { is_active: true, category: { not: null } }
    });

    res.json({
      categories: categories.map(c => ({
        name: c.category,
        product_count: c?._count?.id ?? 0
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

router.get('/stats', authenticate, authorizeRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const [totalProducts, totalNetworks, recentProducts] = await Promise.all([
      prisma.product.count({ where: { is_active: true, isValid: true } }),
      prisma.product.groupBy({ by: ['network'], where: { is_active: true, isValid: true } }),
      prisma.product.findMany({
        where: { is_active: true, isValid: true },
        orderBy: { created_at: 'desc' },
        take: 5,
        select: { id: true, name: true, network: true, created_at: true }
      })
    ]);

    res.json({
      total_products: totalProducts,
      total_networks: totalNetworks.length,
      recent_products: recentProducts
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get marketplace stats' });
  }
});

router.post('/import-offer', authMiddleware, body('networkOfferId').notEmpty(), async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { networkOfferId } = req.body as any;
    let offer;
    const idNum = Number(networkOfferId);
    if (!isNaN(idNum) && Number.isInteger(idNum)) {
      offer = await prisma.offer.findUnique({ where: { id: idNum } });
    }
    if (!offer) {
      offer = await prisma.offer.findFirst({ where: { externalOfferId: String(networkOfferId) } });
    }
    if (!offer) return res.status(404).json({ error: 'Network offer not found' });

    // check user eligibility: active subscription OR token wallet with balance
    const userId = typeof req.user!.id === 'string' ? Number(req.user!.id) : req.user!.id;
    const sub = await prisma.subscription.findFirst({ where: { userId, expiresAt: { gt: new Date() } } });
    const wallet = await getWallet(userId);
    if (!sub && (!wallet || wallet.balance <= 0)) {
      return res.status(403).json({ error: 'Not eligible to import; requires active subscription or tokens' });
    }

    const item = await prisma.marketplaceItem.create({ data: { userId, offerId: offer.id, customTitle: offer.title } });

    res.status(201).json({ marketplaceItem: item });
  } catch (e) {
    console.error('Import offer error', e);
    res.status(500).json({ error: 'Failed to import offer' });
  }
});

// USER PRODUCTS CRUD

// POST /api/marketplace/my-products - Create user product
router.post('/my-products', authMiddleware, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').optional().isString(),
  body('price').optional().isNumeric(),
  body('category').trim().notEmpty().withMessage('Category is required'),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, price, category, tags, images } = req.body;

    const product = await prisma.product.create({
      data: {
        userId: req.user!.id,
        name,
        description: description || '',
        price: price ? Number(price) : null,
        category,
        tags: tags || [],
        images: images || [],
        affiliateLink: `https://lonaat.com/product/${Date.now()}`,
        isActive: true
      }
    });

    console.log('✅ User product created:', product.id);
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });

  } catch (error: any) {
    console.error('❌ Create product error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create product',
      details: error.message
    });
  }
});

// GET /api/marketplace/my-products - Get user products
router.get('/my-products', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category as string;

    const where: any = { 
        userId: req.user!.id, 
        isActive: true,
        isValid: true 
    };
    if (category) where.category = category;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [
          { featured: 'desc' },
          { views: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ]);

    console.log('✅ User products retrieved:', products.length);

    res.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Get user products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get products',
      details: error.message
    });
  }
});

// DELETE /api/marketplace/my-products/:id - Delete user product
router.delete('/my-products/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = Number(req.user!.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }

    const product = await prisma.product.findFirst({
      where: { id, userId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    await prisma.product.delete({
      where: { id }
    });

    console.log('✅ User product deleted:', id);
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Delete product error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete product',
      details: error.message
    });
  }
});

// SOCIAL ACCOUNTS

// GET /api/marketplace/social-accounts - Get user social accounts
router.get('/social-accounts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }

    const socialAccounts = await prisma.socialAccount.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ Social accounts retrieved:', socialAccounts.length);
    res.json({
      success: true,
      socialAccounts
    });

  } catch (error: any) {
    console.error('❌ Get social accounts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get social accounts',
      details: error.message
    });
  }
});

// POST /api/marketplace/social-accounts - Add/update social account
router.post('/social-accounts', authMiddleware, [
  body('platform').trim().notEmpty().withMessage('Platform is required'),
  body('username').trim().notEmpty().withMessage('Username is required'),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { platform, username, profileUrl } = req.body;

    const socialAccount = await prisma.socialAccount.upsert({
      where: {
        userId_platform: {
          userId: req.user!.id,
          platform: platform.toLowerCase()
        }
      },
      update: {
        username,
        profileUrl,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        userId: req.user!.id,
        platform: platform.toLowerCase(),
        username,
        profileUrl,
        isActive: true
      }
    });

    console.log('✅ Social account saved:', socialAccount.id);
    res.status(201).json({
      success: true,
      message: 'Social account saved successfully',
      socialAccount
    });

  } catch (error: any) {
    console.error('❌ Save social account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save social account',
      details: error.message
    });
  }
});

// DELETE /api/marketplace/social-accounts/:platform - Delete social account
router.delete('/social-accounts/:platform', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { platform } = req.params;

    const socialAccount = await prisma.socialAccount.findFirst({
      where: { 
        userId: req.user!.id, 
        platform: platform.toLowerCase() 
      }
    });

    if (!socialAccount) {
      return res.status(404).json({
        success: false,
        error: 'Social account not found'
      });
    }

    await prisma.socialAccount.delete({
      where: { id: socialAccount.id }
    });

    console.log('✅ Social account deleted:', platform);
    res.json({
      success: true,
      message: 'Social account deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Delete social account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete social account',
      details: error.message
    });
  }
});

// AI PROMOTION

// POST /api/marketplace/promote/:id - Generate AI promotion content for product
router.post('/promote/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { platforms } = req.body; // platforms array: ['tiktok', 'instagram', 'twitter', 'whatsapp']

    // Get product details
    const product = await prisma.product.findFirst({
      where: { id, userId: Number(req.user!.id), isActive: true }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Get user's social accounts
    const socialAccounts = await prisma.socialAccount.findMany({
      where: { 
        userId: req.user!.id, 
        isActive: true,
        platform: { in: platforms || ['tiktok', 'instagram', 'twitter', 'whatsapp'] }
      }
    });

    console.log('🤖 AI PROMOTION REQUEST - Product:', product.name);
    console.log('📋 Platforms:', platforms || ['all']);

    // Generate AI content for each platform
    const promotionContent = {};

    const defaultPlatforms = ['tiktok', 'instagram', 'twitter', 'whatsapp'];
    const targetPlatforms = platforms && platforms.length > 0 ? platforms : defaultPlatforms;

    for (const platform of targetPlatforms) {
      try {
        // Prepare product data for AI
        const productData = {
          title: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          tags: product.tags,
          platform: platform,
          type: 'product'
        };

        // Call AI service
        const aiResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:4000'}/api/ai/generate-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.AI_SERVICE_TOKEN || 'default-token'}`
          },
          body: JSON.stringify(productData)
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          promotionContent[platform] = {
            success: true,
            content: aiData.content || aiData,
            copyText: aiData.content || aiData
          };
        } else {
          promotionContent[platform] = {
            success: false,
            error: 'AI generation failed',
            fallbackContent: generateFallbackContent(product, platform)
          };
        }
      } catch (error) {
        console.error(`❌ AI promotion failed for ${platform}:`, error);
        promotionContent[platform] = {
          success: false,
          error: 'AI service unavailable',
          fallbackContent: generateFallbackContent(product, platform)
        };
      }
    }

    // Track promotion click
    await prisma.product.update({
      where: { id },
      data: {
        clicks: {
          increment: 1
        }
      }
    });

    console.log('✅ AI promotion generated for product:', product.id);

    res.json({
      success: true,
      message: 'Promotion content generated successfully',
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        images: product.images
      },
      socialAccounts: socialAccounts.map(acc => ({
        platform: acc.platform,
        username: acc.username,
        profileUrl: acc.profileUrl
      })),
      promotionContent
    });

  } catch (error: any) {
    console.error('❌ AI promotion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate promotion content',
      details: error.message
    });
  }
});

// Helper function to generate fallback content
function generateFallbackContent(product: any, platform: string): string {
  const { name, description, price, category, tags } = product;
  
  switch (platform) {
    case 'tiktok':
      return `🔥 Check out this amazing ${name}! ${description}\n💰 Only ${price || 'Contact for price'}\n🏷️ ${category}\n${tags?.map(tag => `#${tag}`).join(' ') || ''}\n\n#TikTokMadeMeBuyIt #ProductReview`;
    
    case 'instagram':
      return `✨ NEW ARRIVAL: ${name} ✨\n\n${description}\n\n💰 Price: ${price || 'DM for price'}\n🏷️ Category: ${category}\n\n${tags?.map(tag => `#${tag}`).join(' ') || ''}\n\n📩 DM to order! 🛍️\n\n#ProductLaunch #ShopNow #NewProduct`;
    
    case 'twitter':
      return `🚀 Just launched: ${name}\n\n${description?.substring(0, 100)}${description?.length > 100 ? '...' : ''}\n\n💰 ${price || 'DM for price'} | 🏷️ ${category}\n\n${tags?.slice(0, 3).map(tag => `#${tag}`).join(' ') || ''}\n\n#ProductLaunch #NewProduct`;
    
    case 'whatsapp':
      return `🌟 Special Offer - ${name} 🌟\n\n${description}\n\n💰 Price: ${price || 'Contact for price'}\n🏷️ Category: ${category}\n\n📞 Interested? Reply to this message!\n\n#SpecialOffer #LimitedStock`;
    
    default:
      return `Check out this ${name}! ${description} Price: ${price || 'Contact for price'} Category: ${category}`;
  }
}

export default router;

