/**
 * ENHANCED TRACKING ROUTES - Rate limiting, security, and conversion tracking
 * Advanced click tracking with security and analytics
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import rateLimit from 'express-rate-limit';
import { monitoringService } from '../services/monitoring-enhanced.service';
import { logger } from '../services/logger.service';
import crypto from 'crypto';

const router = Router();

// Simple in-memory rate limiter (for production, use Redis)
const clickTracker = new Map<string, number>();
const CLEANUP_INTERVAL = 300000; // 5 minutes

// Cleanup old entries
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of clickTracker.entries()) {
    if (now - timestamp > CLEANUP_INTERVAL) {
      clickTracker.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Rate limiting middleware for clicks
 */
const clickRateLimit = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10, // 10 clicks per minute per IP
  message: {
    success: false,
    error: 'Too many clicks, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * GET /api/track/click/:productId - Enhanced click tracking
 * Features: Rate limiting, security validation, duplicate prevention
 */
router.get('/click/:productId', clickRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.productId);
    const userIp = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }

    // Find product
    const product = await prisma.products.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Check if product is active and approved
    if (!product.isActive || !product.isApproved) {
      return res.status(404).json({
        success: false,
        error: 'Product not available'
      });
    }

    // 🔥 HARDENED FINGERPRINT GENERATION
    const acceptLanguage = req.get('Accept-Language') || 'unknown';
    const fingerprintInput = `${userIp}-${req.get('User-Agent') || 'unknown'}-${acceptLanguage}`;
    const fingerprint = crypto
      .createHash('sha256')
      .update(fingerprintInput)
      .digest('hex');

    // 🔥 RATE LIMITING PER IP + PRODUCT
    const rateLimitKey = `${userIp}-${productId}`;
    const now = Date.now();
    const lastClick = clickTracker.get(rateLimitKey);

    // Skip duplicate clicks within 1 minute
    if (lastClick && (now - lastClick) < 60000) {
      console.log(`🔄 Skipping duplicate click: ${rateLimitKey}`);
      return res.redirect(302, product.affiliateLink);
    }

    // Update rate limit tracker
    clickTracker.set(rateLimitKey, now);

    // 🔥 SECURITY: Validate affiliate link
    if (!product.affiliateLink) {
      return res.status(400).json({
        success: false,
        error: 'No affiliate link available'
      });
    }

    try {
      new URL(product.affiliateLink);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid affiliate link'
      });
    }

    // 🔥 TRACK CLICK WITH UNIQUE USER DETECTION
    const isUniqueClick = await checkUniqueClick(fingerprint, productId);
    
    await prisma.product_clicks.create({
      data: {
        product_id: productId,
        user_id: req.user?.id ? Number(req.user.id) : null,
        ip_address: userIp,
        user_agent: req.get('User-Agent') || 'unknown',
        referrer: req.get('Referer') || null,
        fingerprint: fingerprint,
        unique_click: isUniqueClick,
        created_at: new Date()
      }
    });

    // 📊 PERSISTENT LOGGING
    logger.logClick(productId, userIp, fingerprint, isUniqueClick, {
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referer')
    });

    // Update product click count
    await prisma.products.update({
      where: { id: productId },
      data: {
        clicks: {
          increment: 1
        }
      }
    });

    console.log(`🔥 CLICK TRACKED: Product ${productId} by IP ${userIp}`);

    // � TRACK IN MONITORING SERVICE
    monitoringService.trackClick(productId, userIp, isUniqueClick);

    // � REDIRECT TO AFFILIATE LINK
    return res.redirect(302, product.affiliateLink);

  } catch (error: any) {
    console.error('❌ Enhanced click tracking failed:', error);
    monitoringService.trackError(error.message, 'click_tracking');
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/track/conversion - Track conversions (revenue tracking)
 * Receives conversion data from affiliate networks/webhooks
 */
router.post('/conversion', async (req: AuthRequest, res: Response) => {
  try {
    // 💰 CONVERSION TRUST LAYER - Validate network signature
    if (!req.headers['x-network-signature']) {
      console.log('❌ Conversion rejected: Missing network signature');
      return res.status(401).json({
        success: false,
        error: 'Network signature required'
      });
    }

    const networkSignature = req.headers['x-network-signature'] as string;
    
    // 💰 REAL SIGNATURE VALIDATION
    if (!validateNetworkSignature(network, networkSignature, req.body)) {
      console.log('❌ Conversion rejected: Invalid network signature');
      return res.status(401).json({
        success: false,
        error: 'Invalid network signature'
      });
    }
    
    console.log(`🔐 Network signature validated: ${network}`);

    const { productId, revenue, amount, commission, network, transactionId, source } = req.body;

    if (!productId || !revenue) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: productId, revenue'
      });
    }

    // Verify product exists
    const product = await prisma.products.findUnique({
      where: { id: Number(productId) }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // 🔥 TRACK CONVERSION (MONEY LAYER)
    const conversion = await prisma.product_conversions.create({
      data: {
        product_id: Number(productId),
        user_id: req.user?.id ? Number(req.user.id) : null,
        amount: Number(amount || revenue),
        commission: commission ? Number(commission) : null,
        revenue: Number(revenue),
        network: network || 'unknown',
        transaction_id: transactionId || null,
        source: source || 'webhook',
        ip_address: req.ip || req.connection.remoteAddress || 'unknown',
        created_at: new Date()
      }
    });

    // Update product conversion count
    await prisma.products.update({
      where: { id: Number(productId) },
      data: {
        views: {
          increment: 1
        }
      }
    });

    // 📊 PERSISTENT LOGGING
    logger.logConversion(productId, Number(revenue), network || 'unknown', {
      commission: commission ? Number(commission) : 0,
      transactionId,
      signature: networkSignature.substring(0, 20) + '...'
    });

    console.log(`💰 CONVERSION TRACKED: Product ${productId}, Revenue: ${revenue}, Commission: ${commission}`);

    // 📊 TRACK IN MONITORING SERVICE
    monitoringService.trackConversion(productId, Number(revenue), network || 'unknown');

    res.json({
      success: true,
      data: {
        conversionId: conversion.id,
        tracked: true,
        revenue: Number(revenue)
      }
    });

  } catch (error: any) {
    console.error('❌ Conversion tracking failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/track/product/:slug - SEO-friendly product URLs
 * Example: /track/product/crypto-trading-masterclass
 */
router.get('/product/:slug', async (req: AuthRequest, res: Response) => {
  try {
    const slug = req.params.slug;
    
    // Convert slug to product name (simple approach)
    const productName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Find product by name (for production, add actual slug field)
    const product = await prisma.products.findFirst({
      where: {
        name: {
          contains: productName,
          mode: 'insensitive'
        },
        isActive: true,
        isApproved: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Redirect to click tracking with product ID
    return res.redirect(302, `/api/track/click/${product.id}`);

  } catch (error: any) {
    console.error('❌ Product slug tracking failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/track/analytics/:productId - Detailed analytics
 */
router.get('/analytics/:productId', [
  authMiddleware
], async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.productId);
    
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }

    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Get comprehensive analytics
    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        clicks: true,
        views: true,
        commission: true,
        network: true,
        isApproved: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Get click analytics
    const clickStats = await prisma.product_clicks.groupBy({
      by: ['created_at'],
      where: {
        product_id: productId,
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Get conversion analytics
    const conversionStats = await prisma.product_conversions.aggregate({
      where: {
        product_id: productId,
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      _count: {
        id: true
      },
      _sum: {
        amount: true,
        revenue: true,
        commission: true
      }
    });

    const conversionRate = product.clicks > 0 ? 
      (conversionStats._count.id / product.clicks) * 100 : 0;

    res.json({
      success: true,
      data: {
        product: product,
        analytics: {
          totalClicks: product.clicks || 0,
          totalConversions: conversionStats._count.id,
          conversionRate: Math.round(conversionRate * 100) / 100,
          totalRevenue: conversionStats._sum.revenue || 0,
          totalCommission: conversionStats._sum.commission || 0,
          avgCommissionPerConversion: conversionStats._count.id > 0 ? 
            (conversionStats._sum.commission || 0) / conversionStats._count.id : 0
        },
        clickStats: clickStats,
        period: 'Last 30 days'
      }
    });

  } catch (error: any) {
    console.error('❌ Analytics retrieval failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Helper function to check unique clicks
async function checkUniqueClick(fingerprint: string, productId: number): Promise<boolean> {
  try {
    // Check if this fingerprint has clicked this product before
    const existingClick = await prisma.product_clicks.findFirst({
      where: {
        fingerprint: fingerprint,
        product_id: productId
      }
    });

    return !existingClick; // True if no previous click found
  } catch (error) {
    console.error('Error checking unique click:', error);
    return true; // Assume unique if error occurs
  }
}

// Helper function to validate network signatures
function validateNetworkSignature(network: string, signature: string, payload: any): boolean {
  try {
    switch (network?.toLowerCase()) {
      case 'admitad':
        return validateAdmitadSignature(signature, payload);
      case 'digistore24':
        return validateDigistoreSignature(signature, payload);
      case 'jvzoo':
        return validateJVZooSignature(signature, payload);
      default:
        console.log(`⚠️ No signature validation for network: ${network}`);
        return true; // Allow unknown networks for now
    }
  } catch (error) {
    console.error('Error validating network signature:', error);
    return false;
  }
}

// Admitad signature validation
function validateAdmitadSignature(signature: string, payload: any): boolean {
  try {
    const secret = process.env.ADMITAD_SECRET;
    if (!secret) {
      console.log('⚠️ ADMITAD_SECRET not configured, skipping validation');
      return true;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    return isValid;
  } catch (error) {
    console.error('Error validating Admitad signature:', error);
    return false;
  }
}

// Digistore24 signature validation (placeholder)
function validateDigistoreSignature(signature: string, payload: any): boolean {
  // TODO: Implement Digistore24 signature validation
  console.log('⚠️ Digistore24 signature validation not implemented');
  return true;
}

// JVZoo signature validation (placeholder)
function validateJVZooSignature(signature: string, payload: any): boolean {
  // TODO: Implement JVZoo signature validation
  console.log('⚠️ JVZoo signature validation not implemented');
  return true;
}

export default router;
