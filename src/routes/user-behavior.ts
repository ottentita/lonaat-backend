/**
 * USER BEHAVIOR TRACKING - Personalization Engine
 * Tracks user interactions for personalized product rankings
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { rankingService } from '../services/ranking.service';
import { logger } from '../services/logger.service';
import prisma from '../prisma';

const router = Router();

/**
 * POST /api/user-behavior/track - Track user interaction
 */
router.post('/track', [
  authMiddleware
], async (req: AuthRequest, res: Response) => {
  try {
    const { productId, interaction, metadata } = req.body;
    
    if (!productId || !interaction) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: productId, interaction'
      });
    }

    if (!['click', 'view', 'conversion', 'share', 'favorite'].includes(interaction)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid interaction type'
      });
    }

    // Update user preferences
    await rankingService.updateUserPreferences(
      String(req.user!.id), 
      Number(productId), 
      interaction as 'click' | 'conversion'
    );

    // Log interaction
    logger.info('user_interaction', {
      userId: req.user!.id,
      productId,
      interaction,
      metadata,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Interaction tracked successfully'
    });

  } catch (error: any) {
    console.error('❌ Failed to track user behavior:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track interaction'
    });
  }
});

/**
 * GET /api/user-behavior/preferences - Get user preferences
 */
router.get('/preferences', [
  authMiddleware
], async (req: AuthRequest, res: Response) => {
  try {
    const preferences = await rankingService.getUserPreferences(String(req.user!.id));

    res.json({
      success: true,
      data: {
        preferences,
        insights: generateInsights(preferences)
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to get user preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get preferences'
    });
  }
});

/**
 * GET /api/user-behavior/recommendations - Get personalized recommendations
 */
router.get('/recommendations', [
  authMiddleware
], async (req: AuthRequest, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const category = req.query.category as string;

    // Get user preferences
    const preferences = await rankingService.getUserPreferences(String(req.user!.id));
    
    // Get products
    const { productCacheService } = await import('../services/productCache.service');
    let products = await productCacheService.getProducts();

    // Filter by category if specified
    if (category) {
      products = products.filter(p => p.category === category);
    }

    // Rank and personalize
    const ranked = rankingService.rankProducts(products);
    const personalized = rankingService.personalizeRankings(ranked, preferences);

    // Return top recommendations
    const recommendations = personalized.slice(0, limit);

    res.json({
      success: true,
      data: {
        recommendations,
        personalization: {
          applied: !!preferences,
          preferredCategory: preferences?.preferredCategory,
          boostApplied: recommendations.some(r => (r.score || 0) > 80)
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to get recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations'
    });
  }
});

/**
 * POST /api/user-behavior/share - Track product sharing (viral loop)
 */
router.post('/share', [
  authMiddleware
], async (req: AuthRequest, res: Response) => {
  try {
    const { productId, platform, shareId } = req.body;

    if (!productId || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: productId, platform'
      });
    }

    // Track share
    await prisma.product_shares.create({
      data: {
        product_id: Number(productId),
        user_id: Number(req.user!.id),
        platform,
        share_id: shareId || null,
        created_at: new Date()
      }
    });

    // Award tokens for sharing (viral loop incentive)
    const tokensAwarded = await awardShareTokens(Number(req.user!.id), Number(productId));

    // Log viral loop
    logger.info('viral_loop_share', {
      userId: req.user!.id,
      productId,
      platform,
      tokensAwarded,
      shareId,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        tokensAwarded,
        message: 'Share tracked! Tokens awarded for viral contribution.'
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to track share:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track share'
    });
  }
});

/**
 * GET /api/user-behavior/viral-stats - Get viral loop statistics
 */
router.get('/viral-stats', [
  authMiddleware
], async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);

    // Get user's share stats
    const shareStats = await prisma.product_shares.groupBy({
      by: ['platform'],
      where: { user_id: userId },
      _count: { id: true }
    });

    // Get total tokens from shares
    const totalTokensFromShares = await prisma.token_purchases.sum({
      where: {
        userId: userId,
        // This would need a reference to share source in a real implementation
      },
      amount: true
    });

    // Get conversion rate from shares
    const conversionsFromShares = await prisma.product_conversions.count({
      where: {
        user_id: userId,
        // This would need tracking of share-to-conversion in a real implementation
      }
    });

    res.json({
      success: true,
      data: {
        shares: {
          total: shareStats.reduce((sum, stat) => sum + stat._count.id, 0),
          byPlatform: shareStats.map(stat => ({
            platform: stat.platform,
            count: stat._count.id
          }))
        },
        tokens: {
          fromShares: totalTokensFromShares.amount || 0
        },
        conversions: {
          fromShares: conversionsFromShares
        },
        viralScore: calculateViralScore(shareStats, conversionsFromShares)
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to get viral stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get viral stats'
    });
  }
});

// Helper functions

function generateInsights(preferences: any) {
  if (!preferences) {
    return { message: 'No data available yet. Start interacting with products!' };
  }

  const insights = [];
  
  if (preferences.preferredCategory) {
    insights.push(`You seem interested in ${preferences.preferredCategory} products`);
  }

  const topCategories = Object.entries(preferences.categoryClicks)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category);

  if (topCategories.length > 0) {
    insights.push(`Your top categories: ${topCategories.join(', ')}`);
  }

  if (preferences.recentlyViewed.length > 5) {
    insights.push('You\'re an active browser! Check your recommendations for personalized picks.');
  }

  return {
    message: insights.length > 0 ? insights.join('. ') : 'Keep exploring to get better recommendations!',
    topCategories,
    activityLevel: preferences.recentlyViewed.length > 10 ? 'High' : 
                    preferences.recentlyViewed.length > 5 ? 'Medium' : 'Low'
  };
}

async function awardShareTokens(userId: number, productId: number): Promise<number> {
  try {
    // Award tokens for sharing (viral loop incentive)
    const tokenAmount = 5; // 5 tokens per share
    
    // In a real implementation, this would:
    // 1. Check daily share limits
    // 2. Verify the share actually happened
    // 3. Award tokens to user account
    
    console.log(`🎯 Awarding ${tokenAmount} tokens to user ${userId} for sharing product ${productId}`);
    
    return tokenAmount;
  } catch (error) {
    console.error('❌ Failed to award share tokens:', error);
    return 0;
  }
}

function calculateViralScore(shareStats: any[], conversions: number): number {
  const totalShares = shareStats.reduce((sum, stat) => sum + stat._count.id, 0);
  
  if (totalShares === 0) return 0;
  
  // Viral score based on shares and conversion rate
  const conversionRate = conversions / totalShares;
  const platformDiversity = shareStats.length;
  
  return Math.round((totalShares * 0.3) + (conversionRate * 100 * 0.5) + (platformDiversity * 10 * 0.2));
}

export default router;
