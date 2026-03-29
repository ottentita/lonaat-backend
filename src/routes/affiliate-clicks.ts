import express from 'express';
import { prisma } from '../prisma';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// POST /api/affiliate/click - Track affiliate click and redirect
router.post('/click', authMiddleware, async (req: any, res: express.Response) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 AFFILIATE CLICK TRACKING');
  console.log('👤 User ID:', req.user?.userId || req.user?.id);
  console.log('📦 Request body:', req.body);
  
  try {
    const { product_id, affiliate_link } = req.body;
    const userId = req.user?.userId || req.user?.id;
    
    // Validate required fields
    if (!product_id) {
      console.error('❌ Missing product_id');
      return res.status(400).json({ 
        error: 'Missing required field: product_id' 
      });
    }
    
    if (!affiliate_link) {
      console.error('❌ Missing affiliate_link');
      return res.status(400).json({ 
        error: 'Missing required field: affiliate_link' 
      });
    }
    
    if (!userId) {
      console.error('❌ Missing user ID from token');
      return res.status(401).json({ 
        error: 'User not authenticated' 
      });
    }
    
    console.log('✅ Validation passed');
    console.log('🔗 Affiliate link:', affiliate_link);
    console.log('📦 Product ID:', product_id);
    
    // Get IP address and user agent
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    console.log('🌐 IP Address:', ipAddress);
    console.log('🖥️ User Agent:', userAgent?.substring(0, 50) + '...');
    
    // Create affiliate click record using correct schema fields
    const clickData = {
      id: `click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId: String(product_id),
      network: 'direct',
      userId: String(userId),
      ip: ipAddress as string || 'unknown',
      userAgent: userAgent || 'unknown',
    };
    
    console.log('💾 Creating click record...');
    
    const click = await prisma.clicks.create({
      data: clickData
    });
    
    console.log('✅ Click recorded successfully');
    console.log('🆔 Click ID:', click.id);
    
    // Update product click count
    try {
      await prisma.$executeRaw`
        UPDATE products 
        SET clicks = COALESCE(clicks, 0) + 1 
        WHERE id = ${product_id}
      `;
      console.log('✅ Product click count updated');
    } catch (error) {
      console.warn('⚠️ Failed to update product click count:', error);
    }
    
    console.log('🔄 Redirecting to:', affiliate_link);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Return success with redirect URL
    return res.status(200).json({
      success: true,
      click_id: click.id,
      product_id: click.productId,
      user_id: click.userId,
      timestamp: click.timestamp,
      redirect_url: affiliate_link,
      message: 'Click tracked successfully'
    });
    
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ AFFILIATE CLICK ERROR:');
    console.error('📝 Message:', error?.message);
    console.error('📚 Stack:', error?.stack);
    console.error('🔍 Full Error:', error);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return res.status(500).json({
      error: 'Failed to track click',
      message: error?.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
});

// GET /api/affiliate/clicks - Get user's click history
router.get('/clicks', authMiddleware, async (req: any, res: express.Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated' 
      });
    }
    
    const clicks = await prisma.clicks.findMany({
      where: { userId: String(userId) },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        productId: true,
        network: true,
        userId: true,
        ip: true,
        userAgent: true,
        createdAt: true,
      }
    });
    
    return res.status(200).json({
      success: true,
      count: clicks.length,
      clicks: clicks.map(c => ({
        id: c.id,
        product_id: c.productId,
        user_id: c.userId,
        network: c.network,
        ip: c.ip,
        user_agent: c.userAgent,
        created_at: c.createdAt,
      }))
    });
    
  } catch (error: any) {
    console.error('❌ Get clicks error:', error?.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to get clicks',
      message: error?.message
    });
  }
});

// GET /api/affiliate/redirect - Track click and redirect to affiliate link
router.get('/redirect', async (req: express.Request, res: express.Response) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 AFFILIATE REDIRECT REQUEST');
  console.log('📋 Query params:', req.query);
  
  try {
    const { user_id, product_id, url } = req.query;
    
    // Validate required parameters
    if (!user_id) {
      console.error('❌ Missing user_id');
      return res.status(400).send('Missing required parameter: user_id');
    }
    
    if (!product_id) {
      console.error('❌ Missing product_id');
      return res.status(400).send('Missing required parameter: product_id');
    }
    
    if (!url) {
      console.error('❌ Missing url');
      return res.status(400).send('Missing required parameter: url');
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 8: PROTECT REDIRECT API - VALIDATE URL
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const urlString = String(url);
    
    // Check URL format
    try {
      const urlObj = new URL(urlString);
      
      // Only allow HTTPS URLs (more secure)
      if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
        console.error('❌ Invalid protocol:', urlObj.protocol);
        return res.status(400).send('Invalid URL: Only HTTP/HTTPS protocols allowed');
      }
    } catch (error) {
      console.error('❌ Malformed URL:', urlString);
      return res.status(400).send('Invalid URL format');
    }
    
    console.log('✅ Validation passed');
    console.log('👤 User ID:', user_id);
    console.log('📦 Product ID:', product_id);
    console.log('🔗 Affiliate URL:', url);
    
    // Save click to database
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    const click = await prisma.clicks.create({
      data: {
        id: `click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: String(product_id),
        network: 'redirect',
        userId: String(user_id),
        ip: ipAddress as string || 'unknown',
        userAgent: userAgent || 'unknown',
      }
    });
    
    console.log('✅ Click saved successfully');
    console.log('🆔 Click ID:', click.id);
    
    // Update product click count
    try {
      await prisma.$executeRaw`
        UPDATE products 
        SET clicks = COALESCE(clicks, 0) + 1 
        WHERE id = ${String(product_id)}
      `;
      console.log('✅ Product click count updated');
    } catch (error) {
      console.warn('⚠️ Failed to update product click count:', error);
    }
    
    console.log('🔄 Redirecting to:', url);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Redirect to affiliate link
    return res.redirect(String(url));
    
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ AFFILIATE REDIRECT ERROR:');
    console.error('📝 Message:', error?.message);
    console.error('📚 Stack:', error?.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Even if tracking fails, still redirect to avoid broken user experience
    const fallbackUrl = req.query.url as string;
    if (fallbackUrl) {
      console.warn('⚠️ Redirecting anyway despite error');
      return res.redirect(fallbackUrl);
    }
    
    return res.status(500).send('Failed to process redirect');
  }
});

// GET /api/affiliate/clicks/stats - Get click statistics
router.get('/clicks/stats', authMiddleware, async (req: any, res: express.Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated' 
      });
    }
    
    const stats = await prisma.clicks.count({
      where: { userId: String(userId) },
    });
    
    // Get unique products clicked
    const uniqueProducts = await prisma.clicks.groupBy({
      by: ['productId'],
      where: { userId: String(userId) },
      _count: { id: true }
    });
    
    return res.status(200).json({
      success: true,
      stats: {
        total_clicks: stats || 0,
        unique_products: uniqueProducts.length || 0,
        products_breakdown: uniqueProducts.map(p => ({
          product_id: p.productId,
          clicks: p._count.id
        }))
      }
    });
    
  } catch (error: any) {
    console.error('❌ Get stats error:', error);
    return res.status(500).json({
      error: 'Failed to get stats',
      message: error?.message
    });
  }
});

export default router;
