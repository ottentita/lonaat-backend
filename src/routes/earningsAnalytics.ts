import express from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/analytics/earnings - Get earnings analytics
router.get('/earnings', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  try {
    console.log('📊 EARNINGS ANALYTICS - Request received');
    
    const userId = req.user?.userId || req.user?.id;
    console.log('DEBUG TYPES:', typeof userId, userId);
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    const userIdNum = Number(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    console.log('DEBUG CONVERTED:', typeof userIdNum, userIdNum);

    // Get total clicks from clicks for this user
    const clickResult: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as total FROM clicks WHERE user_id = $1`,
      userIdNum
    );
    const totalClicks = clickResult[0]?.total || 0;

    // Get active products count for this user
    const productResult: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as total FROM products WHERE user_id = $1 AND is_active = true`,
      userIdNum
    );
    const activeProducts = productResult[0]?.total || 0;

    // Get top products with click counts
    const topProducts: any[] = await prisma.$queryRawUnsafe(
      `SELECT p.id as "product_id", p.name as "product_name", p.category as network,
              COALESCE(p.clicks, 0) as clicks,
              COALESCE(p.clicks * CAST(p.price AS FLOAT) * 0.05, 0) as "estimated_earnings"
       FROM products p
       WHERE p.user_id = $1 AND p.is_active = true
       ORDER BY p.clicks DESC NULLS LAST
       LIMIT 10`,
      userIdNum
    );

    // Build response matching the DashboardStats interface the frontend expects
    const totalEstimatedEarnings = topProducts.reduce((sum, p) => sum + Number(p.estimated_earnings || 0), 0);

    const responseData = {
      summary: {
        totalProducts: activeProducts,
        totalClicks: totalClicks,
        totalEstimatedEarnings: totalEstimatedEarnings,
        averageEarningsPerProduct: activeProducts > 0 ? totalEstimatedEarnings / activeProducts : 0,
        averageClicksPerProduct: activeProducts > 0 ? totalClicks / activeProducts : 0,
      },
      earningsByNetwork: [],
      topProducts: topProducts,
      allProducts: []
    };

    console.log('📊 EARNINGS ANALYTICS - Response:', { totalClicks, activeProducts, totalEstimatedEarnings });
    res.json(responseData);

  } catch (error: any) {
    console.error('❌ EARNINGS ANALYTICS - Error:', error);
    res.status(500).json({ 
      error: 'Failed to calculate earnings analytics',
      message: error.message 
    });
  }
});

// GET /api/analytics/earnings/product/:productId - Get earnings for specific product
router.get('/earnings/product/:productId', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.role;

    console.log('DEBUG TYPES:', typeof productId, productId, typeof userId, userId);

    // Only allow admin users to view earnings analytics
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const productIdNum = Number(Array.isArray(productId) ? productId[0] : productId);
    if (isNaN(productIdNum)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    console.log('DEBUG CONVERTED:', typeof productIdNum, productIdNum);
    console.log(`📊 PRODUCT EARNINGS - Getting earnings for product ${productIdNum}`);

    // Get product first
    const product = await prisma.product.findUnique({
      where: { id: productIdNum },
      select: {
        id: true,
        name: true,
        network: true,
        category: true,
        price: true,
        affiliate_link: true,
        created_at: true
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get click count for this product
    const clicks = await prisma.productClick.count({
      where: { productId: Number(product.id) }
    });

    // Get conversion data for this product
    const conversions = await prisma.productConversion.findMany({
      where: { productId: Number(product.id) }
    });
    
    const totalConversionAmount = conversions.reduce((sum, conv) => sum + conv.amount, 0);
    const conversionCount = conversions.length;
    
    // Realistic commission rates by network
    const COMMISSION_RATES = {
      'AWIN': 0.05,        // 5% for AWIN
      'Digistore24': 0.40,  // 40% for Digistore24 (high commission)
      'Impact': 0.08,       // 8% for Impact
      'ClickBank': 0.50,    // 50% for ClickBank (digital products)
      'JVZoo': 0.45,        // 45% for JVZoo
      'WarriorPlus': 0.45,  // 45% for WarriorPlus
      'Admitad': 0.06,      // 6% for Admitad
      'AliExpress': 0.08,   // 8% for AliExpress
      'MyLead': 0.25,       // 25% for CPA networks
    };
    
    const commissionRate = COMMISSION_RATES[product.network as keyof typeof COMMISSION_RATES] || 0.02; // fallback 2%
    const price = parseFloat(product.price?.toString() || '0') || 0;
    
    let estimatedEarnings;
    let actualEarnings = 0;
    
    if (conversionCount > 0) {
      // Use real conversion data when available
      actualEarnings = totalConversionAmount * commissionRate;
      estimatedEarnings = actualEarnings; // Use actual earnings
    } else {
      // Estimate earnings based on clicks when no conversions
      estimatedEarnings = clicks * price * commissionRate;
    }

    res.json({
      productId: product.id,
      productName: product.name,
      network: product.network,
      category: product.category,
      price: price,
      clicks: clicks,
      conversions: conversionCount,
      actualEarnings: actualEarnings,
      commissionRate: commissionRate,
      estimatedEarnings: estimatedEarnings,
      hasRealConversions: conversionCount > 0,
      createdAt: product.created_at
    });

  } catch (error: any) {
    console.error('❌ PRODUCT EARNINGS - Error:', error);
    res.status(500).json({ 
      error: 'Failed to get product earnings',
      message: error.message 
    });
  }
});

export default router;
