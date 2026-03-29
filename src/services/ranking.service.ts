/**
 * AI PRODUCT RANKING SERVICE - MAX PROFIT OPTIMIZATION
 * Ranks products by profit score to maximize revenue
 */

interface ProductScore {
  productId: number;
  score: number;
  breakdown: {
    commissionScore: number;
    conversionScore: number;
    ratingScore: number;
    priceScore: number;
  };
}

interface UserPreferences {
  preferredCategory?: string;
  categoryClicks: Record<string, number>;
  recentlyViewed: number[];
  lastClickCategories: string[];
}

interface RankedProduct {
  id: number;
  name: string;
  description?: string;
  price?: number;
  commission?: number;
  rating?: number;
  clicks?: number;
  conversions?: number;
  category?: string;
  network?: string;
  affiliateLink?: string;
  imageUrl?: string;
  isActive?: boolean;
  isApproved?: boolean;
  score?: number;
  badge?: string;
  breakdown?: ProductScore['breakdown'];
}

class RankingService {
  private readonly WEIGHTS = {
    commission: 0.4,    // 💰 Money weight
    conversion: 0.3,    // 🎯 Performance weight  
    rating: 0.2,        // ⭐ Trust weight
    price: 0.1          // 💵 Value weight
  };

  /**
   * Calculate profit score for a product
   */
  calculateScore(product: any): ProductScore {
    const commission = product.commission || 0;
    const price = parseFloat(product.price?.toString() || '0');
    const rating = product.rating || 0;
    const clicks = product.clicks || 0;
    const conversions = product.conversions || 0;

    // Calculate conversion rate
    const conversionRate = clicks > 0 ? conversions / clicks : 0;

    // Calculate individual scores
    const commissionScore = this.normalizeCommission(commission);
    const conversionScore = this.normalizeConversionRate(conversionRate);
    const ratingScore = this.normalizeRating(rating);
    const priceScore = this.normalizePrice(price);

    // Calculate weighted total score
    const totalScore = 
      (commissionScore * this.WEIGHTS.commission) +
      (conversionScore * this.WEIGHTS.conversion) +
      (ratingScore * this.WEIGHTS.rating) +
      (priceScore * this.WEIGHTS.price);

    return {
      productId: product.id,
      score: Math.round(totalScore * 100) / 100, // Round to 2 decimal places
      breakdown: {
        commissionScore: Math.round(commissionScore * 100) / 100,
        conversionScore: Math.round(conversionScore * 100) / 100,
        ratingScore: Math.round(ratingScore * 100) / 100,
        priceScore: Math.round(priceScore * 100) / 100
      }
    };
  }

  /**
   * Normalize commission score (0-100)
   */
  private normalizeCommission(commission: number): number {
    // Commission typically ranges 0-5000, normalize to 0-100
    const maxCommission = 5000;
    return Math.min(commission / maxCommission * 100, 100);
  }

  /**
   * Normalize conversion rate score (0-100)
   */
  private normalizeConversionRate(conversionRate: number): number {
    // Conversion rate typically 0-0.1 (10%), normalize to 0-100
    const maxConversionRate = 0.1; // 10%
    return Math.min(conversionRate / maxConversionRate * 100, 100);
  }

  /**
   * Normalize rating score (0-100)
   */
  private normalizeRating(rating: number): number {
    // Rating typically 0-5, normalize to 0-100
    return (rating / 5) * 100;
  }

  /**
   * Normalize price score (0-100)
   */
  private normalizePrice(price: number): number {
    // Price typically 0-50000, normalize to 0-100
    // Higher price = higher potential commission
    const maxPrice = 50000;
    return Math.min(price / maxPrice * 100, 100);
  }

  /**
   * Rank products by profit score
   */
  rankProducts(products: any[]): RankedProduct[] {
    return products
      .map(product => {
        const scoreData = this.calculateScore(product);
        const badge = this.generateBadge(product, scoreData.score);
        
        return {
          ...product,
          score: scoreData.score,
          breakdown: scoreData.breakdown,
          badge
        } as RankedProduct;
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  /**
   * Generate product badge based on performance
   */
  private generateBadge(product: any, score: number): string | undefined {
    const commission = product.commission || 0;
    const conversionRate = product.clicks > 0 ? (product.conversions || 0) / product.clicks : 0;
    const rating = product.rating || 0;

    // High commission badge
    if (commission > 2000) {
      return "🔥 HIGH EARNING";
    }

    // High conversion badge
    if (conversionRate > 0.05) { // 5% conversion rate
      return "🎯 HIGH CONVERTING";
    }

    // High rating badge
    if (rating >= 4.8) {
      return "⭐ TOP RATED";
    }

    // Trending badge (high score overall)
    if (score > 80) {
      return "📈 TRENDING";
    }

    // Popular badge (good clicks)
    if (product.clicks > 100) {
      return "👥 POPULAR";
    }

    return undefined;
  }

  /**
   * Personalize product rankings for user
   */
  personalizeRankings(products: RankedProduct[], userPreferences?: UserPreferences): RankedProduct[] {
    if (!userPreferences) {
      return products;
    }

    return products.map(product => {
      let boost = 0;

      // Category preference boost
      if (userPreferences.preferredCategory === product.category) {
        boost += 20; // Significant boost for preferred category
      }

      // Category history boost
      const categoryClicks = userPreferences.categoryClicks[product.category || ''] || 0;
      if (categoryClicks > 0) {
        boost += Math.min(categoryClicks * 2, 15); // Up to 15 boost based on category history
      }

      // Recently viewed boost (but not too much to avoid echo chamber)
      if (userPreferences.recentlyViewed.includes(product.id)) {
        boost += 5; // Small boost for recently viewed
      }

      // Last clicked categories boost
      if (userPreferences.lastClickCategories.includes(product.category || '')) {
        boost += 10; // Boost for categories user recently clicked
      }

      return {
        ...product,
        score: (product.score || 0) + boost
      };
    }).sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  /**
   * Get user preferences from behavior data
   */
  async getUserPreferences(userId?: string): Promise<UserPreferences | undefined> {
    if (!userId) {
      return undefined;
    }

    try {
      const { prisma } = await import('../prisma');

      // Get user's click history
      const clickHistory = await prisma.product_clicks.findMany({
        where: { user_id: userId ? parseInt(userId) : null },
        include: {
          product: {
            select: { category: true }
          }
        },
        orderBy: { created_at: 'desc' },
        take: 50 // Last 50 clicks
      });

      // Get user's conversion history
      const conversionHistory = await prisma.product_conversions.findMany({
        where: { user_id: userId ? parseInt(userId) : null },
        include: {
          product: {
            select: { category: true }
          }
        },
        orderBy: { created_at: 'desc' },
        take: 20 // Last 20 conversions
      });

      // Analyze category preferences
      const categoryClicks: Record<string, number> = {};
      const lastClickCategories: string[] = [];
      const recentlyViewed: number[] = [];

      clickHistory.forEach(click => {
        const category = click.product?.category;
        if (category) {
          categoryClicks[category] = (categoryClicks[category] || 0) + 1;
          if (lastClickCategories.length < 5) {
            lastClickCategories.push(category);
          }
        }
        if (click.product_id && !recentlyViewed.includes(click.product_id)) {
          recentlyViewed.push(click.product_id);
        }
      });

      // Give more weight to conversions
      conversionHistory.forEach(conv => {
        const category = conv.product?.category;
        if (category) {
          categoryClicks[category] = (categoryClicks[category] || 0) + 5; // Conversions worth 5x clicks
        }
      });

      // Find preferred category (most clicked)
      const preferredCategory = Object.entries(categoryClicks)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      return {
        preferredCategory,
        categoryClicks,
        recentlyViewed: recentlyViewed.slice(0, 10), // Last 10 viewed
        lastClickCategories: lastClickCategories.slice(0, 5) // Last 5 categories
      };

    } catch (error) {
      console.error('Error getting user preferences:', error);
      return undefined;
    }
  }

  /**
   * Update user preferences based on new interaction
   */
  async updateUserPreferences(userId: string, productId: number, interaction: 'click' | 'conversion'): Promise<void> {
    try {
      const { prisma } = await import('../prisma');

      // Get product category
      const product = await prisma.products.findUnique({
        where: { id: productId },
        select: { category: true }
      });

      if (!product || !product.category) {
        return;
      }

      // This would be stored in a separate user preferences table
      // For now, we'll rely on the click history analysis in getUserPreferences
      
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  }

  /**
   * Get ranking statistics for analytics
   */
  getRankingStats(products: RankedProduct[]): any {
    const totalProducts = products.length;
    const highEarning = products.filter(p => p.badge === "🔥 HIGH EARNING").length;
    const highConverting = products.filter(p => p.badge === "🎯 HIGH CONVERTING").length;
    const topRated = products.filter(p => p.badge === "⭐ TOP RATED").length;
    const trending = products.filter(p => p.badge === "📈 TRENDING").length;

    const avgScore = products.reduce((sum, p) => sum + (p.score || 0), 0) / totalProducts;
    const avgCommission = products.reduce((sum, p) => sum + (p.commission || 0), 0) / totalProducts;
    const avgRating = products.reduce((sum, p) => sum + (p.rating || 0), 0) / totalProducts;

    return {
      totalProducts,
      badges: {
        highEarning,
        highConverting,
        topRated,
        trending,
        popular: products.filter(p => p.badge === "👥 POPULAR").length
      },
      averages: {
        score: Math.round(avgScore * 100) / 100,
        commission: Math.round(avgCommission),
        rating: Math.round(avgRating * 10) / 10
      },
      topPerformers: products.slice(0, 5).map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        badge: p.badge
      }))
    };
  }
}

// Export singleton instance
export const rankingService = new RankingService();

// Export utility functions for direct use
export const calculateScore = (product: any) => rankingService.calculateScore(product);
export const rankProducts = (products: any[]) => rankingService.rankProducts(products);
export const personalizeRankings = (products: RankedProduct[], userPrefs?: UserPreferences) => 
  rankingService.personalizeRankings(products, userPrefs);

// Export types
export type { ProductScore, UserPreferences, RankedProduct };
