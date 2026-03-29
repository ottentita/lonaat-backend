import express, { Request, Response } from 'express';
import prisma from '../prisma';

const router = express.Router();

// Generate affiliate link with proper tracking parameters
function generateAffiliateLink(productId: string, network: string, originalUrl: string): string {
  const ALIEXPRESS_TRACKING_ID = process.env.ALIEXPRESS_TRACKING_ID || 'lonaatea29';
  const AWIN_PUBLISHER_ID = process.env.AWIN_PUBLISHER_ID || '2651300';
  const ADMITAD_PUBLISHER_ID = process.env.ADMITAD_PUBLISHER_ID || '2456105';
  const JVZOO_AFFILIATE_ID = process.env.JVZOO_API_KEY || '';
  const DIGISTORE_AFFILIATE = process.env.DIGISTORE_VENDOR_KEY || 'ottentita';
  const WARRIORPLUS_AFFILIATE = process.env.WARRIORPLUS_API_KEY || '';
  const MYLEAD_AFFILIATE = process.env.MYLEAD_API_EMAIL || '';
  const IMPACT_ACCOUNT = process.env.IMPACT_ACCOUNT_SID || '';

  const networkLower = network.toLowerCase();

  switch (networkLower) {
    case 'aliexpress':
      // AliExpress affiliate link format
      return `${originalUrl}${originalUrl.includes('?') ? '&' : '?'}aff_trace_key=${ALIEXPRESS_TRACKING_ID}&terminal_id=lonaatea29`;

    case 'awin':
      // AWIN deep link format
      const encodedUrl = encodeURIComponent(originalUrl);
      return `https://www.awin1.com/cread.php?awinmid=MERCHANT_ID&awinaffid=${AWIN_PUBLISHER_ID}&ued=${encodedUrl}`;

    case 'admitad':
      // Admitad affiliate link format
      return `https://ad.admitad.com/g/${ADMITAD_PUBLISHER_ID}/${productId}/?ulp=${encodeURIComponent(originalUrl)}`;

    case 'jvzoo':
      // JVZoo affiliate link format
      return `${originalUrl}${originalUrl.includes('?') ? '&' : '?'}affiliate=${JVZOO_AFFILIATE_ID}`;

    case 'digistore24':
      // Digistore24 affiliate link format
      return `https://www.digistore24.com/redir/${productId}/${DIGISTORE_AFFILIATE}/`;

    case 'warriorplus':
      // WarriorPlus affiliate link format
      return `${originalUrl}${originalUrl.includes('?') ? '&' : '?'}affiliate=${WARRIORPLUS_AFFILIATE}`;

    case 'mylead':
      // MyLead affiliate link format
      return `${originalUrl}${originalUrl.includes('?') ? '&' : '?'}ref=${MYLEAD_AFFILIATE}`;

    case 'impact':
      // Impact affiliate link format
      return `${originalUrl}${originalUrl.includes('?') ? '&' : '?'}irclickid=${IMPACT_ACCOUNT}`;

    default:
      // Default: return original URL with generic tracking
      return `${originalUrl}${originalUrl.includes('?') ? '&' : '?'}ref=lonaat&source=marketplace`;
  }
}

// POST /api/track-click - Track click and redirect to affiliate link
router.post('/track-click', async (req: Request, res: Response) => {
  try {
    const { productId, network, originalUrl } = req.body;

    console.log('📊 TRACK CLICK - Request:', { productId, network, originalUrl });

    // Validate required fields
    if (!productId || !network || !originalUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields: productId, network, originalUrl' 
      });
    }

    // Get user info if authenticated
    const userId = (req as any).user?.id || null;
    
    // Get IP and user agent
    const ip = (req.headers['x-forwarded-for'] as string) || 
                req.socket.remoteAddress || 
                null;
    const userAgent = req.get('user-agent') || null;

    // Store click in database
    const click = await prisma.affiliateClick.create({
      data: {
        productId,
        network,
        userId,
        ip,
        userAgent,
      },
    });

    console.log('✅ TRACK CLICK - Click recorded:', click.id);

    // Generate affiliate link
    const affiliateLink = generateAffiliateLink(productId, network, originalUrl);

    console.log('🔗 TRACK CLICK - Affiliate link generated:', affiliateLink);

    // Return the affiliate link for redirect
    res.json({
      success: true,
      clickId: click.id,
      affiliateLink,
    });
  } catch (error) {
    console.error('❌ TRACK CLICK - Error:', error);
    res.status(500).json({ 
      error: 'Failed to track click',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/track-click/:clickId - Get click details
router.get('/track-click/:clickId', async (req: Request, res: Response) => {
  try {
    const { clickId } = req.params;

    const click = await prisma.affiliateClick.findUnique({
      where: { id: clickId },
    });

    if (!click) {
      return res.status(404).json({ error: 'Click not found' });
    }

    res.json({ click });
  } catch (error) {
    console.error('Get click error:', error);
    res.status(500).json({ error: 'Failed to get click' });
  }
});

// GET /api/track-click/stats - Get click statistics
router.get('/track-click/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Total clicks
    const totalClicks = await prisma.affiliateClick.count({
      where: userId ? { userId } : undefined,
    });

    // Clicks by network
    const clicksByNetwork = await prisma.affiliateClick.groupBy({
      by: ['network'],
      _count: { id: true },
      where: userId ? { userId } : undefined,
    });

    // Recent clicks
    const recentClicks = await prisma.affiliateClick.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    res.json({
      totalClicks,
      clicksByNetwork: clicksByNetwork.map(item => ({
        network: item.network,
        count: item._count.id,
      })),
      recentClicks,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

export default router;
