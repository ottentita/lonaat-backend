import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

// Commission rates by network
const commissionRates: Record<string, number> = {
  'Digistore24': 0.5,    // 50%
  'AWIN': 0.3,           // 30%
  'awin': 0.3,           // 30%
  'WarriorPlus': 0.5,    // 50%
  'Impact': 0.3,         // 30%
  'JVZoo': 0.5,          // 50%
  'ClickBank': 0.5,      // 50%
  'Admitad': 0.3,        // 30%
  'MyLead': 0.3          // 30%
};

// Get commission rate for network (default 30%)
const getCommissionRate = (network: string): number => {
  return commissionRates[network] || 0.3;
};

// POST /api/conversion/webhook - Track affiliate conversions (no auth required for webhooks)
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    console.log('💰 CONVERSION WEBHOOK - Request received');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    console.log('🌐 IP:', req.ip);
    console.log('👤 User-Agent:', req.headers['user-agent']?.substring(0, 100) + '...');
    
    const { productId, amount, network, orderId, customData } = req.body;
    
    // Validate required fields
    if (!productId || !amount || !network) {
      console.log('❌ CONVERSION WEBHOOK - Missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['productId', 'amount', 'network']
      });
    }
    
    // Validate amount is a positive number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      console.log('❌ CONVERSION WEBHOOK - Invalid amount:', amount);
      return res.status(400).json({ 
        error: 'Invalid amount',
        amount: amount
      });
    }
    
    // Validate productId
    const productIdStr = Array.isArray(productId) ? productId[0] : productId;
    if (!productIdStr || productIdStr.trim() === '') {
      console.log('❌ CONVERSION WEBHOOK - Invalid productId:', productId);
      return res.status(400).json({ 
        error: 'Invalid productId',
        productId: productId
      });
    }
    
    console.log('✅ CONVERSION WEBHOOK - Validation passed');
    console.log(`   Product ID: ${productIdStr}`);
    console.log(`   Amount: $${parsedAmount.toFixed(2)}`);
    console.log(`   Network: ${network}`);
    console.log(`   Order ID: ${orderId || 'N/A'}`);
    
    // Check if product exists (optional validation)
    try {
      const productIdNum = Number(productIdStr);
      if (isNaN(productIdNum)) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }

      const product = await prisma.product.findUnique({
        where: { id: productIdNum }
      });
      
      if (!product) {
        console.log('⚠️ CONVERSION WEBHOOK - Product not found, but proceeding anyway');
        console.log(`   Product ID ${productIdStr} not found in database`);
      } else {
        console.log(`✅ CONVERSION WEBHOOK - Product found: ${product.name}`);
      }
    } catch (productCheckError) {
      console.log('⚠️ CONVERSION WEBHOOK - Could not validate product, proceeding anyway');
    }
    
    // Create conversion record
    const conversionData = {
      productId: productIdStr,
      amount: parsedAmount,
      network: network
    };
    
    console.log('💰 CONVERSION WEBHOOK - Creating conversion record...');
    
    const conversion = await prisma.productConversion.create({
      data: conversionData
    });
    
    console.log('✅ CONVERSION WEBHOOK - Conversion created successfully');
    console.log(`   Conversion ID: ${conversion.id}`);
    console.log(`   Created At: ${conversion.createdAt}`);
    
    // Extract user from customData or orderId
    let userId: number | null = null;
    
    if (customData && customData.userId) {
      userId = Number(customData.userId);
      console.log('✅ CONVERSION WEBHOOK - User ID from customData:', userId);
    } else if (orderId) {
      // Try to extract user ID from order ID format (e.g., "user123-order456")
      const match = orderId.match(/user(\d+)/i);
      if (match) {
        userId = Number(match[1]);
        console.log('✅ CONVERSION WEBHOOK - User ID extracted from orderId:', userId);
      }
    }
    
    // Create commission if user ID found
    let commission = null;
    if (userId) {
      const externalRef = orderId || conversion.id;
      
      // PREVENT DUPLICATES - Check if transaction already processed
      const existingCommission = await prisma.commissions.findFirst({
        where: { external_ref: externalRef }
      });

      if (existingCommission) {
        console.warn('⚠️ CONVERSION WEBHOOK - DUPLICATE DETECTED: Transaction already processed');
        console.warn(`   External Ref: ${externalRef}`);
        console.warn(`   Existing Commission ID: ${existingCommission.id}`);
        console.warn(`   Created At: ${existingCommission.created_at}`);
        
        // Return existing commission info but don't create duplicate
        commission = existingCommission;
      } else {
        // Calculate commission using network-specific rate
        const rate = getCommissionRate(network);
        const commissionAmount = parsedAmount * rate;
        
        // CREATE REAL COMMISSION WITH TRACE
        commission = await prisma.commissions.create({
          data: {
            user_id: userId,
            network: network,
            product_id: productIdNum,
            amount: commissionAmount,
            status: 'pending',
            external_ref: externalRef,
            webhook_data: JSON.stringify(req.body)
          }
        });
        
        // LOG EVERYTHING - REAL COMMISSION CREATED
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ REAL COMMISSION CREATED FROM WEBHOOK');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 COMMISSION DETAILS:', {
          commission_id: commission.id,
          user_id: userId,
          network: network,
          source: 'webhook',
          external_ref: externalRef,
          sale_amount: parsedAmount,
          commission_rate: `${(rate * 100).toFixed(0)}%`,
          commission_amount: commissionAmount,
          status: 'pending',
          product_id: productIdNum,
          created_at: new Date().toISOString()
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }

      // Sync wallet balance (only if new commission created)
      if (!existingCommission) {
        const rate = getCommissionRate(network);
        const commissionAmount = parsedAmount * rate;
        
        try {
          let wallet = await prisma.wallet.findUnique({
            where: { userId: String(userId) }
          });

          if (!wallet) {
            console.log('💰 CONVERSION WEBHOOK - Creating wallet for user:', userId);
            wallet = await prisma.wallet.create({
              data: {
                userId: String(userId),
                balance: commissionAmount,
                totalEarned: commissionAmount
              }
            });
            console.log('✅ CONVERSION WEBHOOK - Wallet created with balance:', commissionAmount);
          } else {
            await prisma.wallet.update({
              where: { userId: String(userId) },
              data: {
                balance: { increment: commissionAmount },
                totalEarned: { increment: commissionAmount }
              }
            });
            console.log('✅ CONVERSION WEBHOOK - Wallet balance updated');
            console.log(`   Commission Added: $${commissionAmount.toFixed(2)}`);
            console.log(`   New Balance: $${(wallet.balance + commissionAmount).toFixed(2)}`);
          }
        } catch (walletError) {
          console.error('⚠️ CONVERSION WEBHOOK - Wallet update failed:', walletError);
        }
      }
    } else {
      console.log('⚠️ CONVERSION WEBHOOK - No user ID found, commission not created');
      console.log('   Tip: Include userId in customData or orderId format');
    }
    
    // Log conversion summary
    console.log('📊 CONVERSION SUMMARY:');
    console.log(`   Product: ${productIdStr}`);
    console.log(`   Network: ${network}`);
    console.log(`   Amount: $${parsedAmount.toFixed(2)}`);
    console.log(`   Commission Rate: ${(getCommissionRate(network) * 100).toFixed(0)}%`);
    console.log(`   Commission Created: ${commission ? 'YES' : 'NO'}`);
    
    // Return success response
    const rate = getCommissionRate(network);
    res.status(200).json({
      success: true,
      conversionId: conversion.id,
      commissionId: commission?.id || null,
      commissionAmount: commission ? parsedAmount * rate : null,
      commissionRate: rate,
      message: 'Conversion tracked successfully',
      data: {
        productId: productIdStr,
        amount: parsedAmount,
        network: network,
        conversionId: conversion.id,
        createdAt: conversion.createdAt
      }
    });
    
    console.log('🎉 CONVERSION WEBHOOK - Response sent successfully');
    
  } catch (error: any) {
    console.error('❌ CONVERSION WEBHOOK - Error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Failed to track conversion',
      message: error.message
    });
  }
});

// GET /api/conversion/webhook - Test endpoint (for debugging)
router.get('/webhook', async (req: Request, res: Response) => {
  try {
    console.log('🧪 CONVERSION WEBHOOK - Test endpoint accessed');
    
    const conversionCount = await prisma.productConversion.count();
    const recentConversions = await prisma.productConversion.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      message: 'Conversion webhook is active',
      totalConversions: conversionCount,
      recentConversions: recentConversions.map(conv => ({
        id: conv.id,
        productId: conv.productId,
        amount: conv.amount,
        network: conv.network,
        createdAt: conv.createdAt
      }))
    });
    
  } catch (error: any) {
    console.error('❌ CONVERSION WEBHOOK TEST - Error:', error);
    res.status(500).json({
      error: 'Failed to get webhook status',
      message: error.message
    });
  }
});

// POST /api/conversion/track-click - Track a click on affiliate link
router.post('/track-click', authMiddleware, async (req: AuthRequest, res) => {
  console.log('👆 TRACK CLICK REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { contentId, productId, hookType, ctaType, platform } = req.body;

    console.log('👤 User:', userId);
    console.log('🆔 Content ID:', contentId);
    console.log('📦 Product ID:', productId);
    console.log('🎯 Hook Type:', hookType);
    console.log('💬 CTA Type:', ctaType);

    // Find or create tracking record
    let tracking = await prisma.conversionTracking.findFirst({
      where: {
        userId,
        contentId: contentId || null,
        productId: productId || null,
        hookType,
        ctaType,
        platform: platform || null
      }
    });

    if (tracking) {
      // Update existing record
      tracking = await prisma.conversionTracking.update({
        where: { id: tracking.id },
        data: {
          clicks: { increment: 1 },
          lastClickAt: new Date()
        }
      });
    } else {
      // Create new record
      tracking = await prisma.conversionTracking.create({
        data: {
          userId,
          contentId: contentId || null,
          productId: productId || null,
          hookType,
          ctaType,
          platform: platform || null,
          clicks: 1,
          lastClickAt: new Date()
        }
      });
    }

    console.log('✅ Click tracked:', tracking.id);
    console.log('📊 Total clicks:', tracking.clicks);

    res.json({
      success: true,
      tracking: {
        id: tracking.id,
        clicks: tracking.clicks,
        conversions: tracking.conversions,
        conversionRate: tracking.conversionRate
      },
      message: 'Click tracked successfully'
    });

  } catch (error: any) {
    console.error('❌ Track click error:', error);
    res.status(500).json({ 
      error: 'Failed to track click',
      details: error.message 
    });
  }
});

// POST /api/conversion/track-conversion - Track a conversion
router.post('/track-conversion', authMiddleware, async (req: AuthRequest, res) => {
  console.log('💰 TRACK CONVERSION REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { contentId, productId, hookType, ctaType, platform, revenue = 0 } = req.body;

    console.log('👤 User:', userId);
    console.log('💵 Revenue:', revenue);

    // Find tracking record
    let tracking = await prisma.conversionTracking.findFirst({
      where: {
        userId,
        contentId: contentId || null,
        productId: productId || null,
        hookType,
        ctaType,
        platform: platform || null
      }
    });

    if (tracking) {
      // Calculate new conversion rate
      const newConversions = tracking.conversions + 1;
      const newRevenue = tracking.revenue + revenue;
      const conversionRate = tracking.clicks > 0 
        ? (newConversions / tracking.clicks) * 100 
        : 0;

      // Update existing record
      tracking = await prisma.conversionTracking.update({
        where: { id: tracking.id },
        data: {
          conversions: newConversions,
          revenue: newRevenue,
          conversionRate,
          lastConversionAt: new Date()
        }
      });
    } else {
      // Create new record with conversion
      tracking = await prisma.conversionTracking.create({
        data: {
          userId,
          contentId: contentId || null,
          productId: productId || null,
          hookType,
          ctaType,
          platform: platform || null,
          conversions: 1,
          revenue,
          conversionRate: 100, // 100% if first interaction is conversion
          lastConversionAt: new Date()
        }
      });
    }

    console.log('✅ Conversion tracked:', tracking.id);
    console.log('📊 Total conversions:', tracking.conversions);
    console.log('💰 Total revenue:', tracking.revenue);
    console.log('📈 Conversion rate:', tracking.conversionRate.toFixed(2) + '%');

    res.json({
      success: true,
      tracking: {
        id: tracking.id,
        clicks: tracking.clicks,
        conversions: tracking.conversions,
        revenue: tracking.revenue,
        conversionRate: tracking.conversionRate
      },
      message: 'Conversion tracked successfully'
    });

  } catch (error: any) {
    console.error('❌ Track conversion error:', error);
    res.status(500).json({ 
      error: 'Failed to track conversion',
      details: error.message 
    });
  }
});

// GET /api/conversion/stats - Get conversion statistics
router.get('/stats', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📊 GET CONVERSION STATS REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { hookType, ctaType, platform, productId } = req.query;

    const where: any = { userId };
    if (hookType && hookType !== 'all') where.hookType = hookType;
    if (ctaType && ctaType !== 'all') where.ctaType = ctaType;
    if (platform && platform !== 'all') where.platform = platform;
    if (productId) where.productId = productId;

    // Get aggregated stats
    const [totalStats, byHookType, byCtaType, byPlatform] = await Promise.all([
      // Total stats
      prisma.conversionTracking.aggregate({
        where,
        _sum: {
          clicks: true,
          conversions: true,
          revenue: true
        },
        _avg: {
          conversionRate: true
        }
      }),
      
      // Stats by hook type
      prisma.conversionTracking.groupBy({
        by: ['hookType'],
        where: { userId },
        _sum: {
          clicks: true,
          conversions: true,
          revenue: true
        },
        _avg: {
          conversionRate: true
        }
      }),
      
      // Stats by CTA type
      prisma.conversionTracking.groupBy({
        by: ['ctaType'],
        where: { userId },
        _sum: {
          clicks: true,
          conversions: true,
          revenue: true
        },
        _avg: {
          conversionRate: true
        }
      }),
      
      // Stats by platform
      prisma.conversionTracking.groupBy({
        by: ['platform'],
        where: { userId, platform: { not: null } },
        _sum: {
          clicks: true,
          conversions: true,
          revenue: true
        },
        _avg: {
          conversionRate: true
        }
      })
    ]);

    console.log('✅ Stats retrieved');
    console.log('📊 Total clicks:', totalStats._sum.clicks || 0);
    console.log('💰 Total conversions:', totalStats._sum.conversions || 0);

    res.json({
      success: true,
      stats: {
        total: {
          clicks: totalStats._sum.clicks || 0,
          conversions: totalStats._sum.conversions || 0,
          revenue: totalStats._sum.revenue || 0,
          avgConversionRate: totalStats._avg.conversionRate || 0
        },
        byHookType: byHookType.map((h: any) => ({
          hookType: h.hookType,
          clicks: h._sum.clicks || 0,
          conversions: h._sum.conversions || 0,
          revenue: h._sum.revenue || 0,
          avgConversionRate: h._avg.conversionRate || 0
        })),
        byCtaType: byCtaType.map((c: any) => ({
          ctaType: c.ctaType,
          clicks: c._sum.clicks || 0,
          conversions: c._sum.conversions || 0,
          revenue: c._sum.revenue || 0,
          avgConversionRate: c._avg.conversionRate || 0
        })),
        byPlatform: byPlatform.map((p: any) => ({
          platform: p.platform,
          clicks: p._sum.clicks || 0,
          conversions: p._sum.conversions || 0,
          revenue: p._sum.revenue || 0,
          avgConversionRate: p._avg.conversionRate || 0
        }))
      }
    });

  } catch (error: any) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get stats',
      details: error.message 
    });
  }
});

// GET /api/conversion/best-performers - Get best performing combinations
router.get('/best-performers', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🏆 GET BEST PERFORMERS REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit = 10 } = req.query;

    // Get top performing combinations by conversion rate
    const topByConversionRate = await prisma.conversionTracking.findMany({
      where: {
        userId,
        clicks: { gte: 10 } // Minimum 10 clicks for statistical significance
      },
      orderBy: {
        conversionRate: 'desc'
      },
      take: Number(limit)
    });

    // Get top performing by total conversions
    const topByConversions = await prisma.conversionTracking.findMany({
      where: { userId },
      orderBy: {
        conversions: 'desc'
      },
      take: Number(limit)
    });

    // Get top performing by revenue
    const topByRevenue = await prisma.conversionTracking.findMany({
      where: { userId },
      orderBy: {
        revenue: 'desc'
      },
      take: Number(limit)
    });

    console.log('✅ Best performers retrieved');

    res.json({
      success: true,
      bestPerformers: {
        byConversionRate: topByConversionRate.map((t: any) => ({
          hookType: t.hookType,
          ctaType: t.ctaType,
          platform: t.platform,
          clicks: t.clicks,
          conversions: t.conversions,
          conversionRate: t.conversionRate,
          revenue: t.revenue
        })),
        byConversions: topByConversions.map((t: any) => ({
          hookType: t.hookType,
          ctaType: t.ctaType,
          platform: t.platform,
          clicks: t.clicks,
          conversions: t.conversions,
          conversionRate: t.conversionRate,
          revenue: t.revenue
        })),
        byRevenue: topByRevenue.map((t: any) => ({
          hookType: t.hookType,
          ctaType: t.ctaType,
          platform: t.platform,
          clicks: t.clicks,
          conversions: t.conversions,
          conversionRate: t.conversionRate,
          revenue: t.revenue
        }))
      }
    });

  } catch (error: any) {
    console.error('❌ Get best performers error:', error);
    res.status(500).json({ 
      error: 'Failed to get best performers',
      details: error.message 
    });
  }
});

// POST /api/conversion/webhook-v2 - New conversion webhook with Conversion model
router.post('/webhook-v2', async (req: Request, res: Response) => {
  try {
    console.log('💰 CONVERSION WEBHOOK V2 - Request received');
    console.log('🔒 IP:', req.ip);
    console.log('🔒 User-Agent:', req.headers['user-agent']?.substring(0, 50));
    
    // 🔒 SECURITY: Verify webhook secret
    const webhookSecret = req.headers['x-webhook-secret'];
    const expectedSecret = process.env.WEBHOOK_SECRET || 'your-secure-webhook-secret-here';
    
    if (webhookSecret !== expectedSecret) {
      console.error('❌ WEBHOOK V2 - Unauthorized: Invalid webhook secret');
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized',
        message: 'Invalid webhook secret'
      });
    }
    
    const { reference, amount, userId, productId } = req.body;

    // Validate required fields
    if (!reference || amount === undefined || !userId || !productId) {
      console.error('❌ WEBHOOK V2 - Missing required fields');
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields',
        required: ['reference', 'amount', 'userId', 'productId']
      });
    }

    // 🔒 SECURITY: Validate amount is positive
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      console.error('❌ WEBHOOK V2 - Invalid amount:', amount);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid amount',
        message: 'Amount must be a positive number'
      });
    }

    // 🔒 SECURITY: Validate userId and productId are valid numbers
    const parsedUserId = Number(userId);
    const parsedProductId = Number(productId);
    
    if (isNaN(parsedUserId) || parsedUserId <= 0) {
      console.error('❌ WEBHOOK V2 - Invalid userId:', userId);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid userId'
      });
    }
    
    if (isNaN(parsedProductId) || parsedProductId <= 0) {
      console.error('❌ WEBHOOK V2 - Invalid productId:', productId);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid productId'
      });
    }

    // 🔒 SECURITY: Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: parsedUserId }
    });

    if (!user) {
      console.error('❌ WEBHOOK V2 - User not found:', parsedUserId);
      return res.status(404).json({ 
        success: false,
        error: 'User not found',
        message: `User with ID ${parsedUserId} does not exist`
      });
    }

    // 🔒 SECURITY: Verify product exists
    const product = await prisma.products.findUnique({
      where: { id: parsedProductId }
    });

    if (!product) {
      console.error('❌ WEBHOOK V2 - Product not found:', parsedProductId);
      return res.status(404).json({ 
        success: false,
        error: 'Product not found',
        message: `Product with ID ${parsedProductId} does not exist`
      });
    }

    // Prevent duplicate processing
    const exists = await prisma.conversion.findUnique({
      where: { reference }
    });

    if (exists) {
      console.log('⚠️ CONVERSION WEBHOOK V2 - Already processed:', reference);
      return res.status(200).json({ 
        success: true,
        message: 'Already processed',
        conversion: exists
      });
    }

    const commission = parsedAmount * 0.5; // 50% commission

    console.log('💰 CONVERSION WEBHOOK V2 - Processing new conversion');
    console.log(`   Reference: ${reference}`);
    console.log(`   Amount: ${parsedAmount} XAF`);
    console.log(`   Commission: ${commission} XAF`);
    console.log(`   User: ${user.email} (ID: ${parsedUserId})`);
    console.log(`   Product: ${product.name} (ID: ${parsedProductId})`);

    // Process conversion in transaction with serializable isolation
    const result = await prisma.$transaction(async (tx) => {
      // 🔒 CRITICAL: Check for duplicate INSIDE transaction to prevent race conditions
      const existingConversion = await tx.conversion.findUnique({
        where: { reference }
      });

      if (existingConversion) {
        const err: any = new Error('DUPLICATE_REFERENCE');
        err.reference = reference;
        throw err;
      }
      // 1. Create conversion record
      const conversion = await tx.conversion.create({
        data: {
          reference,
          userId: parsedUserId,
          productId: parsedProductId,
          amount: parsedAmount,
          commission: commission,
          status: 'confirmed'
        }
      });

      // 2. Find or create Wallet (capital W model)
      let wallet = await tx.wallet.findUnique({
        where: { userId: parsedUserId }
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: parsedUserId,
            balance: commission
          }
        });
        console.log('✅ CONVERSION WEBHOOK V2 - Wallet created');
      } else {
        await tx.wallet.update({
          where: { userId: parsedUserId },
          data: {
            balance: { increment: commission }
          }
        });
        console.log('✅ CONVERSION WEBHOOK V2 - Wallet updated');
      }

      // 3. Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: parsedUserId,
          amount: commission,
          type: 'credit',
          source: 'conversion',
          referenceId: conversion.id
        }
      });

      // Update wallet reference to get latest balance
      wallet = await tx.wallet.findUnique({
        where: { userId: parsedUserId }
      });

      return { conversion, wallet, transaction };
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ CONVERSION WEBHOOK V2 - SUCCESS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 CONVERSION DETAILS:', {
      conversion_id: result.conversion.id,
      user_id: parsedUserId,
      user_email: user.email,
      product_id: parsedProductId,
      product_name: product.name,
      amount: parsedAmount,
      commission: commission,
      reference: reference,
      wallet_balance: result.wallet.balance,
      transaction_id: result.transaction.id
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    res.json({ 
      success: true,
      conversion: result.conversion,
      walletBalance: result.wallet.balance,
      transactionId: result.transaction.id
    });

  } catch (err: any) {
    // Handle duplicate reference error (race condition or unique constraint violation)
    if (err.message === 'DUPLICATE_REFERENCE' || err.code === 'P2002') {
      console.log('⚠️ CONVERSION WEBHOOK V2 - Duplicate detected');
      const refToCheck = err.reference || reference;
      const existing = await prisma.conversion.findUnique({
        where: { reference: refToCheck }
      });
      return res.status(200).json({ 
        success: true,
        message: 'Already processed',
        conversion: existing
      });
    }

    console.error('❌ CONVERSION WEBHOOK V2 - Error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process conversion',
      details: err.message
    });
  }
});

export default router;
