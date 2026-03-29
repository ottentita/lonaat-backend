import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// ============================================
// REFERRAL SYSTEM
// ============================================

// Generate unique referral code for user
function generateReferralCode(userId: number): string {
  const hash = crypto.createHash('sha256').update(`${userId}-${Date.now()}`).digest('hex');
  return hash.substring(0, 8).toUpperCase();
}

// GET /api/growth/referral-code - Get or generate user's referral code
router.get('/referral-code', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    console.log('🔗 GET REFERRAL CODE:', { userId });

    // Check if user already has a referral code (stored in user model if field exists)
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { id: true, email: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Generate referral code (in production, this would be stored in user model)
    const referralCode = generateReferralCode(Number(userId));
    const referralLink = `${process.env.APP_URL || 'http://localhost:3000'}/signup?ref=${referralCode}`;

    console.log('✅ REFERRAL CODE GENERATED:', { referralCode, referralLink });

    return res.json({
      success: true,
      data: {
        referralCode,
        referralLink,
        userId
      }
    });

  } catch (error: any) {
    console.error('❌ GET REFERRAL CODE ERROR:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/growth/referral-bonus - Award referral bonus when referred user earns
router.post('/referral-bonus', async (req: Request, res: Response) => {
  try {
    const { referredUserId, amount } = req.body;

    if (!referredUserId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'referredUserId and amount required'
      });
    }

    console.log('💰 PROCESS REFERRAL BONUS:', { referredUserId, amount });

    // Get referred user to find referrer (in production, check user.referrerId field)
    const referredUser = await prisma.user.findUnique({
      where: { id: Number(referredUserId) },
      select: { id: true, email: true }
    });

    if (!referredUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // For now, we'll use a simple mapping or query
    // In production, user model should have referrerId field
    const referrerId = (referredUser as any).referrerId || null;

    if (!referrerId) {
      console.log('ℹ️ No referrer for this user');
      return res.json({ success: true, message: 'No referrer to reward' });
    }

    // Calculate referral bonus (5% of referred user's earnings)
    const REFERRAL_BONUS_PERCENTAGE = 0.05;
    const bonusAmount = amount * REFERRAL_BONUS_PERCENTAGE;

    // Award bonus in atomic transaction
    await prisma.$transaction(async (tx) => {
      // Credit referrer's wallet
      const referrerWallet = await tx.wallet.findUnique({
        where: { userId: String(referrerId) }
      });

      if (referrerWallet) {
        await tx.wallet.update({
          where: { userId: String(referrerId) },
          data: {
            balance: { increment: bonusAmount },
            totalEarned: { increment: bonusAmount }
          }
        });

        // Log in ledger
        await tx.transactionLedger.create({
          data: {
            userId: referrerId,
            amount: Math.round(bonusAmount),
            type: 'credit',
            reason: `Referral bonus from user ${referredUserId}`
          }
        });

        console.log('✅ REFERRAL BONUS AWARDED:', {
          referrerId,
          referredUserId,
          bonusAmount
        });
      }
    });

    return res.json({
      success: true,
      data: {
        referrerId,
        bonusAmount,
        percentage: REFERRAL_BONUS_PERCENTAGE * 100
      }
    });

  } catch (error: any) {
    console.error('❌ REFERRAL BONUS ERROR:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 1. PRODUCT MARKETPLACE API
// ============================================

// GET /api/growth/products - List all products with commission info
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, category, sortBy = 'popularity' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    console.log('📦 GET PRODUCTS MARKETPLACE:', { page, limit, category, sortBy });

    // Build where clause
    const where: any = { isActive: true };
    if (category) {
      where.categoryId = Number(category);
    }

    // Get products with aggregated data
    const products = await prisma.offers.findMany({
      where,
      skip,
      take: Number(limit),
      include: {
        categories: {
          select: { name: true, slug: true }
        },
        _count: {
          select: {
            clicks: true,
            conversions: true
          }
        }
      }
    });

    // Calculate total for pagination
    const total = await prisma.offers.count({ where });

    // Enhance products with commission info and popularity
    const enhancedProducts = await Promise.all(products.map(async (product) => {
      const clickCount = product?._count?.clicks ?? 0;
      const conversionCount = product?._count?.conversions ?? 0;
      const conversionRate = clickCount > 0 ? (conversionCount / clickCount) * 100 : 0;

      // Calculate platform fee (2%)
      const price = product.payout ? Number(product.payout) : 0;
      const platformFee = price * 0.02;
      const userCommission = price * 0.98;
      const commissionPercentage = 98; // User gets 98%

      return {
        id: product.id,
        name: product.name,
        title: product.title,
        description: product.description,
        url: product.url,
        trackingUrl: product.trackingUrl,
        price,
        commission: userCommission,
        commissionPercentage,
        platformFee,
        category: product.categories?.name || 'Uncategorized',
        categorySlug: product.categories?.slug,
        network: product.network || product.networkName,
        images: product.images,
        popularity: {
          clicks: clickCount,
          conversions: conversionCount,
          conversionRate: Number(conversionRate.toFixed(2))
        },
        isActive: product.isActive
      };
    }));

    // Sort products based on sortBy parameter
    let sortedProducts = enhancedProducts;
    if (sortBy === 'popularity') {
      sortedProducts = enhancedProducts.sort((a, b) => b.popularity.clicks - a.popularity.clicks);
    } else if (sortBy === 'conversion') {
      sortedProducts = enhancedProducts.sort((a, b) => b.popularity.conversionRate - a.popularity.conversionRate);
    } else if (sortBy === 'commission') {
      sortedProducts = enhancedProducts.sort((a, b) => b.commission - a.commission);
    }

    console.log(`✅ Returning ${sortedProducts.length} products`);

    return res.json({
      success: true,
      data: {
        products: sortedProducts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error: any) {
    console.error('❌ GET PRODUCTS ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/growth/products/:id - Get single product details
router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('📄 GET PRODUCT DETAILS:', { id });

    const product = await prisma.offers.findUnique({
      where: { id: Number(id) },
      include: {
        categories: {
          select: { name: true, slug: true }
        },
        _count: {
          select: {
            clicks: true,
            conversions: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const clickCount = product?._count?.clicks ?? 0;
    const conversionCount = product?._count?.conversions ?? 0;
    const conversionRate = clickCount > 0 ? (conversionCount / clickCount) * 100 : 0;

    const price = product.payout ? Number(product.payout) : 0;
    const platformFee = price * 0.02;
    const userCommission = price * 0.98;

    const enhancedProduct = {
      id: product.id,
      name: product.name,
      title: product.title,
      description: product.description,
      url: product.url,
      trackingUrl: product.trackingUrl,
      price,
      commission: userCommission,
      commissionPercentage: 98,
      platformFee,
      category: product.categories?.name || 'Uncategorized',
      categorySlug: product.categories?.slug,
      network: product.network || product.networkName,
      images: product.images,
      popularity: {
        clicks: clickCount,
        conversions: conversionCount,
        conversionRate: Number(conversionRate.toFixed(2))
      },
      isActive: product.isActive,
      createdAt: product.createdAt
    };

    console.log('✅ Product details retrieved');

    return res.json({
      success: true,
      data: enhancedProduct
    });

  } catch (error: any) {
    console.error('❌ GET PRODUCT DETAILS ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 2. USER AFFILIATE LINKS
// ============================================

// POST /api/growth/generate-link - Generate ENHANCED shareable links
router.post('/generate-link', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID required'
      });
    }

    console.log('🔗 GENERATE ENHANCED SHAREABLE LINKS:', { userId, productId });

    // Get product
    const product = await prisma.offers.findUnique({
      where: { id: Number(productId) }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Generate unique tracking ID
    const trackingId = crypto.randomBytes(8).toString('hex');
    const baseUrl = process.env.APP_URL || 'http://localhost:4000';

    // Create MULTIPLE shareable link types
    const shortUrl = `${baseUrl}/r/${trackingId}?userId=${userId}&productId=${productId}`;
    const trackingUrl = `${baseUrl}/api/growth/track/${trackingId}?userId=${userId}&productId=${productId}`;
    const landingPageUrl = `${baseUrl}/api/growth/landing/${productId}/${userId}`;

    console.log('✅ ENHANCED LINKS GENERATED:', {
      trackingId,
      shortUrl,
      trackingUrl,
      landingPageUrl
    });

    return res.json({
      success: true,
      data: {
        trackingId,
        productId,
        productName: product.name,
        commission: product.payout ? Number(product.payout) * 0.98 : 0,
        links: {
          short: shortUrl,
          tracking: trackingUrl,
          landingPage: landingPageUrl
        },
        usage: {
          short: 'Direct redirect to product',
          tracking: 'Track click then redirect',
          landingPage: 'Show product preview page first'
        }
      }
    });

  } catch (error: any) {
    console.error('❌ GENERATE LINK ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/growth/my-links - Get user's affiliate links with ENHANCED analytics
router.get('/my-links', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    console.log('📊 GET MY AFFILIATE LINKS (ENHANCED):', { userId });

    // Get all clicks for this user
    const clicks = await prisma.clicks.findMany({
      where: { userId: Number(userId) },
      include: {
        offers: {
          select: {
            id: true,
            name: true,
            title: true,
            payout: true
          }
        },
        conversions: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group by product with ENHANCED analytics
    const linkStats = clicks.reduce((acc: any, click) => {
      const productId = click.offerId;
      if (!acc[productId]) {
        acc[productId] = {
          productId,
          productName: click.offers.name,
          productTitle: click.offers.title,
          clicks: 0,
          conversions: 0,
          earnings: 0,
          conversionRate: 0,
          earningsPerClick: 0
        };
      }

      acc[productId].clicks++;
      if (click.conversions) {
        acc[productId].conversions++;
        acc[productId].earnings += click.revenue * 0.98; // User gets 98%
      }

      return acc;
    }, {});

    // Calculate conversion rates and earnings per click
    const links = Object.values(linkStats).map((link: any) => ({
      ...link,
      conversionRate: link.clicks > 0 ? Number(((link.conversions / link.clicks) * 100).toFixed(2)) : 0,
      earningsPerClick: link.clicks > 0 ? Number((link.earnings / link.clicks).toFixed(2)) : 0
    }));

    console.log(`✅ Returning ${links.length} affiliate links with enhanced analytics`);

    return res.json({
      success: true,
      data: { links }
    });

  } catch (error: any) {
    console.error('❌ GET MY LINKS ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/growth/analytics/:productId - Get detailed analytics for a specific product
router.get('/analytics/:productId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    console.log('📈 GET PRODUCT ANALYTICS:', { userId, productId });

    // Get clicks and conversions for this product and user
    const [clicks, conversions] = await Promise.all([
      prisma.clicks.findMany({
        where: {
          userId: Number(userId),
          offerId: Number(productId)
        },
        include: { conversions: true }
      }),
      prisma.conversions.count({
        where: {
          offerId: Number(productId),
          clicks: { userId: Number(userId) }
        }
      })
    ]);

    const totalClicks = clicks.length;
    const totalConversions = conversions;
    const totalEarnings = clicks.reduce((sum, click) => {
      return sum + (click.conversions ? click.revenue * 0.98 : 0);
    }, 0);

    const conversionRate = totalClicks > 0 ? Number(((totalConversions / totalClicks) * 100).toFixed(2)) : 0;
    const earningsPerClick = totalClicks > 0 ? Number((totalEarnings / totalClicks).toFixed(2)) : 0;

    const analytics = {
      productId: Number(productId),
      clicks: totalClicks,
      conversions: totalConversions,
      earnings: totalEarnings,
      conversionRate,
      earningsPerClick
    };

    console.log('✅ PRODUCT ANALYTICS:', analytics);

    return res.json({
      success: true,
      data: analytics
    });

  } catch (error: any) {
    console.error('❌ GET PRODUCT ANALYTICS ERROR:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 3. CLICK TRACKING
// ============================================

// GET /r/:trackingId - Track click and redirect
router.get('/track/:trackingId', async (req: Request, res: Response) => {
  try {
    const { trackingId } = req.params;

    console.log('🖱️ CLICK TRACKED:', { trackingId });

    // For this implementation, we'll decode the trackingId to get userId and productId
    // In production, you'd store this mapping in a database table
    // For now, we'll extract from query params or use a simple encoding

    const { userId, productId } = req.query;

    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tracking link'
      });
    }

    // Get product
    const product = await prisma.offers.findUnique({
      where: { id: Number(productId) }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Log click
    const clickToken = crypto.randomBytes(16).toString('hex');
    const timeBucket = Math.floor(Date.now() / 1000);

    await prisma.clicks.create({
      data: {
        network: product.network || 'direct',
        offerId: Number(productId),
        adId: 1, // Default ad ID
        userId: Number(userId),
        timeBucket,
        clickId: trackingId,
        clickToken,
        ip: req.ip || 'unknown',
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        revenue: 0,
        converted: false,
        user_id: Number(userId),
        externalSubId: trackingId
      }
    });

    console.log('✅ CLICK LOGGED:', { userId, productId, trackingId });

    // Redirect to actual product URL
    const redirectUrl = product.trackingUrl || product.url;
    return res.redirect(redirectUrl);

  } catch (error: any) {
    console.error('❌ CLICK TRACKING ERROR:', error);
    // Even if logging fails, redirect to product
    const { productId } = req.query;
    if (productId) {
      const product = await prisma.offers.findUnique({
        where: { id: Number(productId) }
      });
      if (product) {
        return res.redirect(product.trackingUrl || product.url);
      }
    }
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 4. USER DASHBOARD API
// ============================================

// GET /api/growth/dashboard - User dashboard with earnings, balance, clicks, conversions
router.get('/dashboard', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    console.log('📊 GET USER DASHBOARD:', { userId });

    // Get wallet data
    const wallet = await prisma.wallet.findUnique({
      where: { userId: String(userId) }
    });

    // Get total earnings from ledger
    const earningsData = await prisma.transactionLedger.aggregate({
      where: {
        userId: Number(userId),
        type: 'credit',
        reason: 'Affiliate commission'
      },
      _sum: { amount: true }
    });

    // Get total withdrawals
    const withdrawalsData = await prisma.withdrawals.aggregate({
      where: {
        user_id: Number(userId),
        status: { in: ['approved', 'pending'] }
      },
      _sum: { amount: true }
    });

    // Get clicks and conversions
    const [totalClicks, totalConversions] = await Promise.all([
      prisma.clicks.count({
        where: { userId: Number(userId) }
      }),
      prisma.conversions.count({
        where: { userId: Number(userId) }
      })
    ]);

    // Calculate conversion rate
    const conversionRate = totalClicks > 0 ? Number(((totalConversions / totalClicks) * 100).toFixed(2)) : 0;

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentClicks = await prisma.clicks.count({
      where: {
        userId: Number(userId),
        createdAt: { gte: sevenDaysAgo }
      }
    });

    const recentConversions = await prisma.conversions.count({
      where: {
        userId: Number(userId),
        createdAt: { gte: sevenDaysAgo }
      }
    });

    const dashboard = {
      earnings: {
        total: earningsData._sum.amount || 0,
        recent7Days: 0 // Could calculate from recent conversions
      },
      balance: {
        available: wallet?.balance || 0,
        locked: wallet?.locked_balance || 0,
        total: (wallet?.balance || 0) + (wallet?.locked_balance || 0)
      },
      withdrawals: {
        total: withdrawalsData._sum.amount || 0,
        pending: 0 // Could calculate pending separately
      },
      performance: {
        totalClicks,
        totalConversions,
        conversionRate,
        recentClicks,
        recentConversions
      }
    };

    console.log('✅ DASHBOARD DATA:', dashboard);

    return res.json({
      success: true,
      data: dashboard
    });

  } catch (error: any) {
    console.error('❌ GET DASHBOARD ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 5. TOP PRODUCTS LOGIC
// ============================================

// GET /api/growth/top-products - Get top performing products with SMART RANKING
router.get('/top-products', async (req: Request, res: Response) => {
  try {
    const { limit = 10, sortBy = 'sales' } = req.query;

    console.log('🏆 GET TOP PRODUCTS (SMART RANKING):', { limit, sortBy });

    // Get products with aggregated stats
    const products = await prisma.offers.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            clicks: true,
            conversions: true
          }
        },
        conversions: {
          select: { amount: true }
        }
      }
    });

    // Enhance with SMART stats
    const productsWithStats = products.map(product => {
      const clickCount = product?._count?.clicks ?? 0;
      const conversionCount = product?._count?.conversions ?? 0;
      const conversionRate = clickCount > 0 ? (conversionCount / clickCount) * 100 : 0;
      
      // Calculate total earnings from conversions
      const totalEarnings = product.conversions.reduce((sum, conv) => {
        return sum + Number(conv.amount);
      }, 0);
      
      // Calculate earnings per click
      const earningsPerClick = clickCount > 0 ? totalEarnings / clickCount : 0;

      return {
        id: product.id,
        name: product.name,
        title: product.title,
        price: product.payout ? Number(product.payout) : 0,
        commission: product.payout ? Number(product.payout) * 0.98 : 0,
        clicks: clickCount,
        conversions: conversionCount,
        conversionRate: Number(conversionRate.toFixed(2)),
        salesVolume: conversionCount,
        totalEarnings: Number(totalEarnings.toFixed(2)),
        earningsPerClick: Number(earningsPerClick.toFixed(2)),
        network: product.network || product.networkName
      };
    });

    // SMART SORTING based on criteria
    let sortedProducts = productsWithStats;
    if (sortBy === 'sales') {
      sortedProducts = productsWithStats.sort((a, b) => b.salesVolume - a.salesVolume);
    } else if (sortBy === 'conversion' || sortBy === 'conversionRate') {
      sortedProducts = productsWithStats.sort((a, b) => b.conversionRate - a.conversionRate);
    } else if (sortBy === 'earningsPerClick') {
      sortedProducts = productsWithStats.sort((a, b) => b.earningsPerClick - a.earningsPerClick);
    } else if (sortBy === 'clicks') {
      sortedProducts = productsWithStats.sort((a, b) => b.clicks - a.clicks);
    } else if (sortBy === 'earnings') {
      sortedProducts = productsWithStats.sort((a, b) => b.totalEarnings - a.totalEarnings);
    }

    // Take top N
    const topProducts = sortedProducts.slice(0, Number(limit));

    console.log(`✅ Returning ${topProducts.length} top products (sorted by ${sortBy})`);

    return res.json({
      success: true,
      data: { topProducts }
    });

  } catch (error: any) {
    console.error('❌ GET TOP PRODUCTS ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// LANDING PAGE SYSTEM
// ============================================

// GET /p/:productId/:userId - Product landing page with click tracking
router.get('/landing/:productId/:userId', async (req: Request, res: Response) => {
  try {
    const { productId, userId } = req.params;

    console.log('🎯 LANDING PAGE VIEW:', { productId, userId });

    // Get product details
    const product = await prisma.offers.findUnique({
      where: { id: Number(productId) },
      include: {
        categories: {
          select: { name: true }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Log click
    const clickToken = crypto.randomBytes(16).toString('hex');
    const trackingId = crypto.randomBytes(8).toString('hex');
    const timeBucket = Math.floor(Date.now() / 1000);

    await prisma.clicks.create({
      data: {
        network: product.network || 'direct',
        offerId: Number(productId),
        adId: 1,
        userId: Number(userId),
        timeBucket,
        clickId: trackingId,
        clickToken,
        ip: req.ip || 'unknown',
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        revenue: 0,
        converted: false,
        user_id: Number(userId),
        externalSubId: `landing-${trackingId}`
      }
    });

    console.log('✅ LANDING PAGE CLICK LOGGED:', { productId, userId, trackingId });

    // Return landing page data (frontend will render this)
    const landingPageData = {
      product: {
        id: product.id,
        name: product.name,
        title: product.title,
        description: product.description,
        price: product.payout ? Number(product.payout) : 0,
        commission: product.payout ? Number(product.payout) * 0.98 : 0,
        category: product.categories?.name || 'Uncategorized',
        images: product.images,
        network: product.network || product.networkName
      },
      affiliateUrl: product.trackingUrl || product.url,
      trackingId
    };

    return res.json({
      success: true,
      data: landingPageData
    });

  } catch (error: any) {
    console.error('❌ LANDING PAGE ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
