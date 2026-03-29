import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { productCacheService } from '../services/productCache.service';
import { rankingService, rankProducts, personalizeRankings, UserPreferences } from '../services/ranking.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/products/list - Get all active products (alias for compatibility)
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    console.log('📋 GET /api/products/list');
    
    const active = req.query.active === 'true';
    const where = active ? { isActive: true } : {};
    
    const products = await prisma.products.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        affiliateLink: true,
        network: true,
        category: true,
        imageUrl: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ Found', products.length, 'products');

    return res.json({
      success: true,
      products: products,
      total: products.length
    });
  } catch (error) {
    console.error('❌ Error fetching products list:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch products'
    });
  }
});

/**
 * GET /api/products - Get AI-ranked products (MAX PROFIT OPTIMIZATION)
 * PHASE 5: AI Ranking with personalization
 */
router.get('/', async (req: Request, res: Response) => {
  // Try to get user for personalization, but don't require auth
  let user: any = null;
  try {
    // Attempt to get user from token if provided
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback');
      user = decoded;
    }
  } catch (error) {
    // No valid token - continue as guest
    user = null;
  }

  // Now use user as AuthRequest type
  const authReq = { ...req, user } as AuthRequest;
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔥 /api/products route HIT (AI RANKING)');
    console.log('📊 Request query:', req.query);
    
    // First, check total count of products
    const totalCount = await prisma.products.count();
    const activeCount = await prisma.products.count({ where: { isActive: true } });
    
    console.log('📦 Total products in DB:', totalCount);
    console.log('✅ Active products in DB:', activeCount);
    
    // Use cached products for better performance
    let products = await productCacheService.getProducts();

    console.log('✅ PRODUCTS FETCHED:', products.length);
    console.log('📋 First product:', products[0] ? products[0].name : 'NONE');

    // 🚀 AI RANKING - MAX PROFIT OPTIMIZATION
    console.log('🤖 Applying AI ranking algorithm...');
    let rankedProducts = rankProducts(products);
    
    // 🎯 PERSONALIZATION - CTR BOOST
    if (authReq.user) {
      console.log('👤 User detected, applying personalization...');
      const userPreferences = await rankingService.getUserPreferences(String(authReq.user.id));
      
      if (userPreferences) {
        console.log('🎯 Personalizing for user:', {
          preferredCategory: userPreferences.preferredCategory,
          categoryClicks: Object.keys(userPreferences.categoryClicks).length,
          recentlyViewed: userPreferences.recentlyViewed.length
        });
        
        rankedProducts = personalizeRankings(rankedProducts, userPreferences);
      }
    } else {
      console.log('👤 Guest user - using global ranking only');
    }

    console.log('🏆 Top 3 ranked products:');
    rankedProducts.slice(0, 3).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (Score: ${p.score}, Badge: ${p.badge || 'None'})`);
    });

    // Get ranking statistics
    const rankingStats = rankingService.getRankingStats(rankedProducts);
    console.log('📊 Ranking stats:', rankingStats);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Transform for frontend compatibility with AI ranking data
    const transformedProducts = rankedProducts.map(p => {
      const firstImage = p.imageUrl || 'https://images.unsplash.com/photo-1603732553216-3c8a545a4f3a?w=400';
      
      // Use real commission data from database (already available from cache)
      const commission = p.commission || 0;
      const commissionPercent = p.price && p.commission ? 
        Math.round((p.commission / p.price) * 100) : 0;
      
      return {
        id: p.id,
        name: p.name,
        title: p.name, // Alias for frontend compatibility
        description: p.description || '',
        price: p.price ? Number(p.price) : 0,
        affiliateLink: p.affiliateLink,
        affiliate_link: p.affiliateLink, // Snake case for compatibility
        category: p.category || 'General',
        network: p.network || 'Direct',
        isActive: p.isActive,
        is_active: p.isActive, // Snake case for compatibility
        createdAt: (p as any).createdAt || new Date(),
        created_at: (p as any).createdAt || new Date(), // Snake case for compatibility
        images: p.imageUrl ? [p.imageUrl] : [],
        image: firstImage,
        image_url: p.imageUrl, // Snake case for compatibility
        tags: [],
        featured: false,
        views: (p as any).views || 0,
        clicks: p.clicks || 0,
        commission: commissionPercent, // Commission percentage
        commission_rate: commissionPercent, // Snake case for compatibility
        rating: 4.5, // Default rating
        reviews: Math.floor(Math.random() * 100) + 10, // Random reviews count
        
        // 🚀 AI RANKING DATA
        score: p.score,
        badge: p.badge,
        breakdown: p.breakdown,
        
        // 🎯 PERSONALIZATION DATA
        personalized: authReq.user ? true : false
      };
    });

    console.log('📤 Sending response with', transformedProducts.length, 'AI-ranked products');
    
    // Get cache statistics
    const cacheStats = productCacheService.getCacheStats();
    
    return res.json({
      success: true,
      products: transformedProducts,
      total: transformedProducts.length,
      totalInDb: totalCount,
      activeInDb: activeCount,
      cache: {
        cached: cacheStats.hasCache,
        cacheAge: cacheStats.cacheAge,
        cacheSize: cacheStats.cacheSize
      },
      
      // 🚀 AI RANKING METADATA
      ranking: {
        algorithm: 'AI Profit Score',
        personalized: !!authReq.user,
        stats: rankingStats,
        weights: {
          commission: 0.4,    // 💰 Money weight
          conversion: 0.3,    // 🎯 Performance weight  
          rating: 0.2,        // ⭐ Trust weight
          price: 0.1          // 💵 Value weight
        }
      }
    });

  } catch (err: any) {
    console.error('❌ Products fetch error:', err);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      details: err.message,
      products: []
    });
  }
});

export default router;
