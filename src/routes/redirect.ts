import express from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /redirect/:productId - Redirect tracking for affiliate links
router.get('/redirect/:productId', async (req: express.Request, res: express.Response) => {
  try {
    console.log('🔗 REDIRECT TRACKING - Request received');
    console.log('📦 Product ID:', req.params.productId);
    console.log('🌐 IP:', req.ip);
    console.log('👤 User-Agent:', req.headers['user-agent']?.substring(0, 100) + '...');
    
    const { productId } = req.params;
    
    // Validate productId
    const productIdStr = Array.isArray(productId) ? productId[0] : productId;
    const productIdNum = Number(productIdStr);
    if (!productIdStr || isNaN(productIdNum)) {
      console.log('❌ REDIRECT TRACKING - Invalid product ID');
      return res.status(400).send('Invalid product ID');
    }

    // Find product
    const product = await prisma.product.findUnique({
      where: { id: productIdNum }
    });

    if (!product) {
      console.log('❌ REDIRECT TRACKING - Product not found:', productId);
      return res.status(404).send('Product not found');
    }

    console.log('✅ REDIRECT TRACKING - Product found:', product.name);
    console.log('🔗 Affiliate Link:', product.affiliate_link);

    // Extract user ID from authentication if available
    let userId = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const { verifyToken } = await import('../utils/jwt');
        const decoded = verifyToken(token);
        userId = decoded?.id ? String(decoded.id) : null;
        console.log('👤 Authenticated User ID:', userId);
      } catch (error) {
        console.log('⚠️ REDIRECT TRACKING - Invalid token, tracking as anonymous');
      }
    }

    // Duplicate click protection
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || null;
    
    if (clientIp) {
      console.log('🔍 Checking for duplicate clicks...');
      
      const recentClick = await prisma.productClick.findFirst({
        where: {
          ip: clientIp,
          productId: productIdStr,
          createdAt: {
            gte: new Date(Date.now() - 60 * 1000) // Last 60 seconds
          }
        }
      });

      if (recentClick) {
        console.log('🚫 DUPLICATE CLICK DETECTED');
        console.log(`   IP: ${clientIp}`);
        console.log(`   Product: ${productIdStr}`);
        console.log(`   Previous click: ${recentClick.createdAt}`);
        console.log(`   Time since last click: ${Date.now() - recentClick.createdAt.getTime()}ms`);
        
        // Still redirect but don't create duplicate click
        console.log('🔄 REDIRECT TRACKING - Redirecting (duplicate click prevented)');
        return res.redirect(302, product.affiliate_link);
      }
      
      console.log('✅ No duplicate click found');
    }

    // Track click
    const clickData = {
      productId: productIdStr,
      userId: userId,
      ip: clientIp,
      userAgent: req.headers['user-agent'] || null,
      network: product.network || 'Unknown'
    };

    console.log('📊 REDIRECT TRACKING - Creating click record:', {
      productId: clickData.productId,
      userId: clickData.userId,
      network: clickData.network,
      hasIp: !!clickData.ip,
      hasUserAgent: !!clickData.userAgent
    });

    await prisma.productClick.create({
      data: clickData
    });

    console.log('✅ REDIRECT TRACKING - Click tracked successfully');
    console.log('🔄 REDIRECT TRACKING - Redirecting to affiliate link...');

    // Redirect to affiliate link
    res.redirect(302, product.affiliate_link);

  } catch (error: any) {
    console.error('❌ REDIRECT TRACKING - Error:', error);
    res.status(500).send('Internal server error');
  }
});

export default router;
