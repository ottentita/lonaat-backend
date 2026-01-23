import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI();

interface ProductScore {
  productId: number;
  name: string;
  score: number;
  reasons: string[];
  recommendations: string[];
}

interface PlatformOptimization {
  platform: string;
  bestPostingTimes: string[];
  recommendedFrequency: string;
  contentStyle: string;
  expectedEngagement: string;
}

interface GrowthInsight {
  category: string;
  insight: string;
  actionItem: string;
  priority: 'high' | 'medium' | 'low';
  expectedImpact: string;
}

interface GrowthReport {
  overallScore: number;
  topProducts: ProductScore[];
  platformOptimizations: PlatformOptimization[];
  growthInsights: GrowthInsight[];
  roiAnalysis: {
    currentROI: number;
    projectedROI: number;
    recommendations: string[];
  };
  fraudRiskLevel: 'low' | 'medium' | 'high';
  generatedAt: Date;
}

export async function rankProducts(userId?: number, limit: number = 20): Promise<ProductScore[]> {
  const whereClause = userId ? { created_by: userId } : {};
  
  const products = await prisma.product.findMany({
    where: whereClause,
    take: 100
  });

  const productIds = products.map(p => p.id);
  
  const clicks = await prisma.affiliateClick.groupBy({
    by: ['product_id'],
    _count: { id: true },
    where: {
      product_id: { in: productIds },
      created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }
  });

  const conversions = await prisma.commission.groupBy({
    by: ['product_id'],
    _sum: { amount: true },
    _count: { id: true },
    where: {
      product_id: { in: productIds },
      created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }
  });

  const socialPosts = await prisma.socialPost.groupBy({
    by: ['product_id'],
    _count: { id: true },
    where: {
      product_id: { in: productIds },
      status: 'published'
    }
  });

  const clicksMap = new Map(clicks.map(c => [c.product_id, c._count.id]));
  const conversionsMap = new Map(conversions.map(c => [c.product_id, { count: c._count.id, amount: c._sum.amount || 0 }]));
  const socialMap = new Map(socialPosts.map(s => [s.product_id, s._count.id]));

  const scoredProducts: ProductScore[] = products.map(product => {
    const clickCount = clicksMap.get(product.id) || 0;
    const conversionData = conversionsMap.get(product.id) || { count: 0, amount: 0 };
    const socialCount = socialMap.get(product.id) || 0;
    
    const conversionRate = clickCount > 0 ? (conversionData.count / clickCount) * 100 : 0;
    
    let score = 0;
    const reasons: string[] = [];
    const recommendations: string[] = [];

    if (conversionRate > 5) {
      score += 40;
      reasons.push(`High conversion rate: ${conversionRate.toFixed(1)}%`);
    } else if (conversionRate > 2) {
      score += 20;
      reasons.push(`Good conversion rate: ${conversionRate.toFixed(1)}%`);
    } else if (clickCount > 0) {
      recommendations.push('Consider improving landing page or targeting');
    }

    if (clickCount > 100) {
      score += 30;
      reasons.push(`High traffic: ${clickCount} clicks`);
    } else if (clickCount > 20) {
      score += 15;
      reasons.push(`Moderate traffic: ${clickCount} clicks`);
    } else {
      recommendations.push('Increase social media promotion');
    }

    if (conversionData.amount > 500) {
      score += 25;
      reasons.push(`High earnings: $${conversionData.amount.toFixed(2)}`);
    } else if (conversionData.amount > 100) {
      score += 10;
      reasons.push(`Moderate earnings: $${conversionData.amount.toFixed(2)}`);
    }

    if (socialCount >= 3) {
      score += 5;
      reasons.push(`Active on ${socialCount} platforms`);
    } else {
      recommendations.push(`Only ${socialCount} social posts - consider expanding`);
    }

    return {
      productId: product.id,
      name: product.name,
      score,
      reasons,
      recommendations
    };
  });

  return scoredProducts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function optimizePlatforms(userId: number): Promise<PlatformOptimization[]> {
  const posts = await prisma.socialPost.findMany({
    where: { 
      user_id: userId,
      status: 'published'
    },
    orderBy: { published_at: 'desc' },
    take: 100
  });

  const platforms = ['facebook', 'twitter', 'telegram', 'instagram', 'tiktok'];
  
  return platforms.map(platform => {
    const platformPosts = posts.filter(p => p.platform === platform);
    const publishedTimes = platformPosts
      .filter(p => p.published_at)
      .map(p => new Date(p.published_at!).getHours());
    
    const bestHours = findBestHours(publishedTimes);
    
    return {
      platform,
      bestPostingTimes: bestHours.map(h => `${h}:00`),
      recommendedFrequency: getRecommendedFrequency(platform),
      contentStyle: getContentStyle(platform),
      expectedEngagement: getExpectedEngagement(platform, platformPosts.length)
    };
  });
}

function findBestHours(hours: number[]): number[] {
  if (hours.length === 0) {
    return [9, 12, 18];
  }
  
  const counts: Record<number, number> = {};
  hours.forEach(h => {
    counts[h] = (counts[h] || 0) + 1;
  });
  
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));
}

function getRecommendedFrequency(platform: string): string {
  const frequencies: Record<string, string> = {
    facebook: '1-2 posts per day',
    twitter: '3-5 tweets per day',
    telegram: '2-3 posts per day',
    instagram: '1 post per day, 3-5 stories',
    tiktok: '1-3 videos per day'
  };
  return frequencies[platform] || '1 post per day';
}

function getContentStyle(platform: string): string {
  const styles: Record<string, string> = {
    facebook: 'Longer form, storytelling, community engagement',
    twitter: 'Short, punchy, trending hashtags, threads for detailed info',
    telegram: 'Direct, informative, links encouraged',
    instagram: 'Visual-first, lifestyle focused, hashtag-rich',
    tiktok: 'Trendy, entertaining, Gen-Z language, viral hooks'
  };
  return styles[platform] || 'Engaging and platform-appropriate';
}

function getExpectedEngagement(platform: string, postCount: number): string {
  if (postCount < 5) return 'Building audience - focus on consistency';
  if (postCount < 20) return 'Growing - expect 1-3% engagement rate';
  return 'Established - aim for 3-5% engagement rate';
}

export async function generateGrowthInsights(userId: number): Promise<GrowthInsight[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      products: true,
      commissions: {
        where: {
          created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      }
    }
  });

  if (!user) return [];

  const insights: GrowthInsight[] = [];

  const totalProducts = user.products.length;
  if (totalProducts < 5) {
    insights.push({
      category: 'Product Portfolio',
      insight: `You have ${totalProducts} products. Top affiliates typically promote 10-20 products.`,
      actionItem: 'Import more products from affiliate networks',
      priority: 'high',
      expectedImpact: '+30% potential earnings'
    });
  }

  const totalCommissions = user.commissions.reduce((sum, c) => sum + c.amount, 0);
  const approvedCommissions = user.commissions.filter(c => c.status === 'approved' || c.status === 'paid_by_network');
  const approvalRate = user.commissions.length > 0 
    ? (approvedCommissions.length / user.commissions.length) * 100 
    : 0;

  if (approvalRate < 50 && user.commissions.length > 5) {
    insights.push({
      category: 'Commission Quality',
      insight: `Your commission approval rate is ${approvalRate.toFixed(0)}%, below the 70% benchmark.`,
      actionItem: 'Focus on higher-quality traffic sources and target audience refinement',
      priority: 'high',
      expectedImpact: '+40% approved earnings'
    });
  }

  const socialPosts = await prisma.socialPost.count({
    where: { user_id: userId }
  });

  if (socialPosts < 10) {
    insights.push({
      category: 'Social Presence',
      insight: 'Limited social media activity detected.',
      actionItem: 'Enable auto-posting for all products to increase visibility',
      priority: 'medium',
      expectedImpact: '+50% click-through rate'
    });
  }

  const recentClicks = await prisma.affiliateClick.count({
    where: {
      user_id: userId,
      created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }
  });

  if (recentClicks < 50) {
    insights.push({
      category: 'Traffic',
      insight: `Only ${recentClicks} clicks in the last 7 days.`,
      actionItem: 'Increase posting frequency and diversify content types',
      priority: 'high',
      expectedImpact: '+100% traffic potential'
    });
  }

  return insights;
}

export async function analyzeROI(userId: number): Promise<{ currentROI: number; projectedROI: number; recommendations: string[] }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const commissions = await prisma.commission.findMany({
    where: {
      user_id: userId,
      created_at: { gte: thirtyDaysAgo }
    }
  });

  const clicks = await prisma.affiliateClick.count({
    where: {
      user_id: userId,
      created_at: { gte: thirtyDaysAgo }
    }
  });

  const totalEarnings = commissions.reduce((sum, c) => sum + c.amount, 0);
  
  const estimatedEffort = clicks / 10;
  const currentROI = estimatedEffort > 0 ? (totalEarnings / estimatedEffort) * 100 : 0;

  const recommendations: string[] = [];
  let projectedMultiplier = 1;

  if (currentROI < 50) {
    recommendations.push('Focus on higher-commission products (>10% commission rate)');
    projectedMultiplier += 0.3;
  }

  if (clicks > 100 && commissions.length < 5) {
    recommendations.push('Improve landing page copy and call-to-action');
    projectedMultiplier += 0.4;
  }

  const uniqueProducts = new Set(commissions.map(c => c.product_id)).size;
  if (uniqueProducts < 3) {
    recommendations.push('Diversify product portfolio to reduce risk');
    projectedMultiplier += 0.2;
  }

  return {
    currentROI: Math.round(currentROI),
    projectedROI: Math.round(currentROI * projectedMultiplier),
    recommendations
  };
}

export async function generateGrowthReport(userId: number): Promise<GrowthReport> {
  const [topProducts, platformOptimizations, growthInsights, roiAnalysis] = await Promise.all([
    rankProducts(userId, 10),
    optimizePlatforms(userId),
    generateGrowthInsights(userId),
    analyzeROI(userId)
  ]);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fraud_score: true }
  });

  let fraudRiskLevel: 'low' | 'medium' | 'high' = 'low';
  if (user?.fraud_score && user.fraud_score > 50) {
    fraudRiskLevel = 'high';
  } else if (user?.fraud_score && user.fraud_score > 25) {
    fraudRiskLevel = 'medium';
  }

  const overallScore = calculateOverallScore(topProducts, roiAnalysis.currentROI, growthInsights);

  return {
    overallScore,
    topProducts,
    platformOptimizations,
    growthInsights,
    roiAnalysis,
    fraudRiskLevel,
    generatedAt: new Date()
  };
}

function calculateOverallScore(
  products: ProductScore[], 
  roi: number, 
  insights: GrowthInsight[]
): number {
  let score = 50;
  
  if (products.length > 0) {
    const avgProductScore = products.reduce((sum, p) => sum + p.score, 0) / products.length;
    score += (avgProductScore / 100) * 20;
  }

  if (roi > 100) score += 15;
  else if (roi > 50) score += 10;
  else if (roi > 0) score += 5;

  const highPriorityIssues = insights.filter(i => i.priority === 'high').length;
  score -= highPriorityIssues * 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function getAIRecommendations(userId: number): Promise<string[]> {
  try {
    const report = await generateGrowthReport(userId);
    
    const prompt = `Based on this affiliate marketing performance data, provide 5 specific, actionable recommendations:

Performance Score: ${report.overallScore}/100
Current ROI: ${report.roiAnalysis.currentROI}%
Top Products: ${report.topProducts.slice(0, 3).map(p => p.name).join(', ')}
Key Issues: ${report.growthInsights.slice(0, 3).map(i => i.insight).join('; ')}
Fraud Risk: ${report.fraudRiskLevel}

Provide 5 brief, specific recommendations to improve affiliate earnings. Format as a JSON array of strings.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 300
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return parsed.recommendations || parsed.tips || [];
    }
    
    return report.roiAnalysis.recommendations;
  } catch (error) {
    console.error('AI recommendations error:', error);
    return [
      'Focus on high-commission products',
      'Increase social media posting frequency',
      'Diversify across multiple affiliate networks',
      'Optimize content for each platform',
      'Track and analyze your best-performing products'
    ];
  }
}
