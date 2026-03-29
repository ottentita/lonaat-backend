import { Router, Request, Response } from 'express';
import { importAllProducts } from '../services/productImporter';

const router = Router();

/**
 * POST /api/internal/import-products
 * Internal system endpoint for automated product imports
 * Requires SYSTEM_SECRET header for authentication
 * No admin login required - uses system key authentication
 */
router.post('/import-products', async (req: Request, res: Response) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 INTERNAL SYSTEM IMPORT REQUEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Debug: Log all headers
    console.log('📋 Request Headers:', JSON.stringify(req.headers, null, 2));

    // Verify system secret key
    const systemKey = req.headers['x-system-key'] as string;
    const expectedKey = process.env.SYSTEM_SECRET;

    console.log('🔑 Received Key:', systemKey ? `${systemKey.substring(0, 20)}...` : 'NONE');
    console.log('🔑 Expected Key:', expectedKey ? `${expectedKey.substring(0, 20)}...` : 'NOT SET');

    if (!expectedKey) {
      console.error('❌ SYSTEM_SECRET not configured in environment');
      return res.status(500).json({ 
        success: false,
        error: 'System secret not configured' 
      });
    }

    if (!systemKey) {
      console.error('❌ Missing x-system-key header');
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden: Missing system key' 
      });
    }

    if (systemKey !== expectedKey) {
      console.error('❌ Invalid system key provided');
      console.error(`   Received: ${systemKey}`);
      console.error(`   Expected: ${expectedKey}`);
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden: Invalid system key' 
      });
    }

    console.log('✅ System key verified');
    console.log('🚀 Starting product import...');

    // Import products
    const count = await importAllProducts();

    console.log(`✅ Import complete: ${count} products`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return res.json({ 
      success: true, 
      imported: count,
      message: `Successfully imported ${count} products`
    });

  } catch (error: any) {
    console.error('❌ Internal import error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    });
  }
});

/**
 * GET /api/internal/health
 * Health check endpoint for internal monitoring
 */
router.get('/health', async (req: Request, res: Response) => {
  const systemKey = req.headers['x-system-key'] as string;
  const expectedKey = process.env.SYSTEM_SECRET;

  if (systemKey !== expectedKey) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'lonaat-backend'
  });
});

export default router;
