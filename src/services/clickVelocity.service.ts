/**
 * CLICK VELOCITY & BEHAVIOR SCORING SERVICE
 * Detects slow-burn click fraud that stays under rate limits
 */

import prisma from '../prisma';

interface VelocityScore {
  score: number;
  level: 'safe' | 'suspicious' | 'fraudulent';
  factors: {
    clickVelocity: number;
    conversionRate: number;
    timePattern: number;
    behaviorScore: number;
  };
  recommendation: string;
}

interface UserBehaviorPattern {
  userId?: number;
  fingerprint: string;
  totalClicks: number;
  uniqueProducts: number;
  conversions: number;
  avgTimeBetweenClicks: number;
  clicksInPeakHours: number;
  clicksInOffHours: number;
  suspiciousPatterns: string[];
}

class ClickVelocityService {
  
  /**
   * Calculate click velocity score for a user/fingerprint
   * Detects slow-burn fraud that stays under rate limits
   */
  async calculateVelocityScore(
    fingerprint: string,
    userId?: number,
    timeWindowHours: number = 24
  ): Promise<VelocityScore> {
    const since = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    
    try {
      // Get click history
      const clicks = await prisma.product_clicks.findMany({
        where: {
          fingerprint,
          created_at: { gte: since }
        },
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          product_id: true,
          created_at: true,
          conversion: {
            select: { id: true, amount: true }
          }
        }
      });

      if (clicks.length === 0) {
        return {
          score: 0,
          level: 'safe',
          factors: {
            clickVelocity: 0,
            conversionRate: 0,
            timePattern: 0,
            behaviorScore: 0
          },
          recommendation: 'No activity in time window'
        };
      }

      // Calculate factors
      const clickVelocity = this.calculateClickVelocity(clicks, timeWindowHours);
      const conversionRate = this.calculateConversionRate(clicks);
      const timePattern = this.analyzeTimePattern(clicks);
      const behaviorScore = this.analyzeBehaviorPattern(clicks);

      // Weighted score (0-100)
      const score = Math.min(
        (clickVelocity * 0.3) +
        (conversionRate * 0.3) +
        (timePattern * 0.2) +
        (behaviorScore * 0.2),
        100
      );

      // Determine level
      let level: 'safe' | 'suspicious' | 'fraudulent';
      let recommendation: string;

      if (score >= 70) {
        level = 'fraudulent';
        recommendation = 'Block this user/fingerprint immediately. High fraud indicators.';
      } else if (score >= 40) {
        level = 'suspicious';
        recommendation = 'Monitor closely. Consider additional verification.';
      } else {
        level = 'safe';
        recommendation = 'Normal behavior detected.';
      }

      return {
        score: Math.round(score),
        level,
        factors: {
          clickVelocity: Math.round(clickVelocity),
          conversionRate: Math.round(conversionRate),
          timePattern: Math.round(timePattern),
          behaviorScore: Math.round(behaviorScore)
        },
        recommendation
      };

    } catch (error) {
      console.error('Error calculating velocity score:', error);
      throw error;
    }
  }

  /**
   * Calculate click velocity score
   * High velocity = suspicious
   */
  private calculateClickVelocity(clicks: any[], timeWindowHours: number): number {
    const clicksPerHour = clicks.length / timeWindowHours;
    
    // Score based on clicks per hour
    // 0-2 clicks/hour = 0 points
    // 2-5 clicks/hour = 20 points
    // 5-10 clicks/hour = 50 points
    // 10+ clicks/hour = 100 points
    
    if (clicksPerHour <= 2) return 0;
    if (clicksPerHour <= 5) return 20 + ((clicksPerHour - 2) / 3) * 30;
    if (clicksPerHour <= 10) return 50 + ((clicksPerHour - 5) / 5) * 50;
    return 100;
  }

  /**
   * Calculate conversion rate score
   * 0% conversion = suspicious (click fraud)
   * Very high conversion = suspicious (fake conversions)
   */
  private calculateConversionRate(clicks: any[]): number {
    const conversions = clicks.filter(c => c.conversion).length;
    const rate = conversions / clicks.length;
    
    // Suspicious if 0% or >50% conversion
    if (rate === 0 && clicks.length > 10) return 60; // No conversions = click fraud
    if (rate > 0.5) return 80; // Too high = fake conversions
    if (rate > 0.3) return 40; // Moderately high
    
    return 0; // Normal conversion rate (1-30%)
  }

  /**
   * Analyze time pattern
   * Bot-like patterns: clicks at exact intervals, 24/7 activity
   */
  private analyzeTimePattern(clicks: any[]): number {
    if (clicks.length < 3) return 0;
    
    let score = 0;
    
    // Check for exact time intervals (bot pattern)
    const intervals: number[] = [];
    for (let i = 1; i < clicks.length; i++) {
      const interval = clicks[i].created_at.getTime() - clicks[i - 1].created_at.getTime();
      intervals.push(interval);
    }
    
    // Calculate variance in intervals
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - avgInterval, 2);
    }, 0) / intervals.length;
    
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avgInterval;
    
    // Low variation = bot-like (clicks at exact intervals)
    if (coefficientOfVariation < 0.1) {
      score += 50; // Very regular intervals = suspicious
    } else if (coefficientOfVariation < 0.3) {
      score += 20; // Somewhat regular
    }
    
    // Check for 24/7 activity (no sleep pattern)
    const hours = clicks.map(c => c.created_at.getHours());
    const uniqueHours = new Set(hours);
    
    if (uniqueHours.size > 20) {
      score += 30; // Active in >20 different hours = suspicious
    } else if (uniqueHours.size > 16) {
      score += 15; // Active in >16 hours
    }
    
    return Math.min(score, 100);
  }

  /**
   * Analyze behavior pattern
   * Sequential product clicking, no browsing pattern
   */
  private analyzeBehaviorPattern(clicks: any[]): number {
    if (clicks.length < 5) return 0;
    
    let score = 0;
    
    // Check for sequential product IDs (bot pattern)
    const productIds = clicks.map(c => c.product_id);
    let sequential = 0;
    
    for (let i = 1; i < productIds.length; i++) {
      if (Math.abs(productIds[i] - productIds[i - 1]) === 1) {
        sequential++;
      }
    }
    
    const sequentialRate = sequential / (productIds.length - 1);
    if (sequentialRate > 0.7) {
      score += 60; // >70% sequential = bot clicking through products
    } else if (sequentialRate > 0.4) {
      score += 30;
    }
    
    // Check for duplicate product clicks (spam)
    const uniqueProducts = new Set(productIds);
    const duplicateRate = 1 - (uniqueProducts.size / productIds.length);
    
    if (duplicateRate > 0.5) {
      score += 40; // >50% duplicates = spam
    } else if (duplicateRate > 0.3) {
      score += 20;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Get detailed user behavior pattern
   */
  async getUserBehaviorPattern(
    fingerprint: string,
    userId?: number,
    days: number = 7
  ): Promise<UserBehaviorPattern> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const clicks = await prisma.product_clicks.findMany({
      where: {
        fingerprint,
        created_at: { gte: since }
      },
      orderBy: { created_at: 'asc' },
      include: {
        conversion: true
      }
    });

    const uniqueProducts = new Set(clicks.map(c => c.product_id));
    const conversions = clicks.filter(c => c.conversion).length;
    
    // Calculate average time between clicks
    let totalTimeBetween = 0;
    for (let i = 1; i < clicks.length; i++) {
      totalTimeBetween += clicks[i].created_at.getTime() - clicks[i - 1].created_at.getTime();
    }
    const avgTimeBetweenClicks = clicks.length > 1 
      ? totalTimeBetween / (clicks.length - 1) / 1000 / 60 // minutes
      : 0;

    // Peak hours (9am-9pm) vs off hours
    const peakHours = clicks.filter(c => {
      const hour = c.created_at.getHours();
      return hour >= 9 && hour <= 21;
    }).length;
    const offHours = clicks.length - peakHours;

    // Detect suspicious patterns
    const suspiciousPatterns: string[] = [];
    
    if (avgTimeBetweenClicks < 5 && clicks.length > 10) {
      suspiciousPatterns.push('Very fast clicking (< 5 min between clicks)');
    }
    
    if (offHours > peakHours * 2) {
      suspiciousPatterns.push('Mostly off-hours activity (bot pattern)');
    }
    
    if (conversions === 0 && clicks.length > 20) {
      suspiciousPatterns.push('No conversions despite many clicks');
    }
    
    if (uniqueProducts.size < clicks.length * 0.3) {
      suspiciousPatterns.push('High duplicate click rate');
    }

    return {
      userId,
      fingerprint,
      totalClicks: clicks.length,
      uniqueProducts: uniqueProducts.size,
      conversions,
      avgTimeBetweenClicks: Math.round(avgTimeBetweenClicks),
      clicksInPeakHours: peakHours,
      clicksInOffHours: offHours,
      suspiciousPatterns
    };
  }

  /**
   * Get velocity scores for all active users
   */
  async getTopSuspiciousUsers(limit: number = 20): Promise<any[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Get active fingerprints
    const activeFingerprints = await prisma.product_clicks.groupBy({
      by: ['fingerprint'],
      where: {
        created_at: { gte: oneDayAgo }
      },
      _count: {
        id: true
      },
      having: {
        id: {
          _count: {
            gt: 5 // At least 5 clicks
          }
        }
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: limit * 2 // Get more to filter
    });

    // Calculate velocity scores
    const scores = await Promise.all(
      activeFingerprints.map(async (fp) => {
        const velocityScore = await this.calculateVelocityScore(fp.fingerprint);
        return {
          fingerprint: fp.fingerprint.substring(0, 16) + '...',
          clicks: fp._count.id,
          ...velocityScore
        };
      })
    );

    // Sort by score and return top suspicious
    return scores
      .filter(s => s.level !== 'safe')
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

// Export singleton
export const clickVelocityService = new ClickVelocityService();

export default clickVelocityService;
