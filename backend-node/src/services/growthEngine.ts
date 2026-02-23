import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ProductScore {
  productId: number;
  name: string;
  score: number;
  reasons: string[];
  recommendations: string[];
}

export async function rankProducts(
  userId?: number,
  limit: number = 20,
): Promise<ProductScore[]> {
  const whereClause = userId ? { user_id: userId } : undefined;

  const products = await prisma.product.findMany({
    ...(whereClause ? { where: whereClause } : {}),
    take: 100,
  });

  // Use commission aggregates as a proxy for product performance
  const productIds = products.map((p) => p.id);
  const conversions = await prisma.commission.groupBy({
    by: ["product_id"],
    _sum: { amount: true },
    _count: { id: true },
    where: {
      product_id: { in: productIds },
      created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });

  const conversionsMap = new Map(
    conversions.map((c) => [
      c.product_id as number,
      { count: c._count.id, amount: c._sum.amount ? Number(c._sum.amount) : 0 },
    ]),
  );

  const scoredProducts: ProductScore[] = products.map((product) => {
    const conversionData = conversionsMap.get(product.id) || {
      count: 0,
      amount: 0,
    } as { count: number; amount: number };

    let score = 0;
    const reasons: string[] = [];
    const recommendations: string[] = [];

    if (conversionData.amount > 500) {
      score += 40;
      reasons.push(`High earnings: $${conversionData.amount.toFixed(2)}`);
    } else if (conversionData.amount > 100) {
      score += 20;
      reasons.push(`Moderate earnings: $${conversionData.amount.toFixed(2)}`);
    }

    if (conversionData.count > 10) {
      score += 20;
      reasons.push(`Consistent conversions: ${conversionData.count}`);
    }

    if (score === 0) recommendations.push("Consider testing different creatives or offers");

    return {
      productId: product.id,
      name: product.name,
      score,
      reasons,
      recommendations,
    };
  });

  return scoredProducts.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function analyzeROI(userId: number): Promise<{
  currentROI: number;
  projectedROI: number;
  recommendations: string[];
}> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const commissions = await prisma.commission.findMany({
    where: {
      user_id: userId,
      created_at: { gte: thirtyDaysAgo },
    },
  });

  const totalEarnings = commissions.reduce(
    (sum, c) => sum + (c.amount ? Number(c.amount) : 0),
    0,
  );

  // Fallback estimate using number of commission records
  const effortEstimate = Math.max(1, commissions.length);
  const currentROI = effortEstimate > 0 ? (totalEarnings / effortEstimate) * 100 : 0;

  const recommendations: string[] = [];
  let projectedMultiplier = 1;

  if (currentROI < 50) {
    recommendations.push("Focus on higher-commission products (>10% commission rate)");
    projectedMultiplier += 0.3;
  }

  const uniqueProducts = new Set(commissions.map((c) => c.product_id)).size;
  if (uniqueProducts < 3) {
    recommendations.push("Diversify product portfolio to reduce risk");
    projectedMultiplier += 0.2;
  }

  return {
    currentROI: Math.round(currentROI),
    projectedROI: Math.round(currentROI * projectedMultiplier),
    recommendations,
  };
}

export async function generateGrowthReport(userId: number) {
  const [topProducts, roiAnalysis] = await Promise.all([
    rankProducts(userId, 10),
    analyzeROI(userId),
  ]);

  const overallScore = Math.round(
    (topProducts.reduce((s, p) => s + p.score, 0) / Math.max(1, topProducts.length)) || 0,
  );

  return {
    overallScore,
    topProducts,
    roiAnalysis,
    generatedAt: new Date(),
  };
}
