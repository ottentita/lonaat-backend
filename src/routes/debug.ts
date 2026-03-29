import express from 'express';
import prisma from '../prisma';
import { importProducts, importFromNetwork } from '../services/productImport.service';

const router = express.Router();

// 🔍 DEBUG: Verify products exist in database
router.get('/products-count', async (req, res) => {
  try {
    const count = await prisma.products.count();
    const products = await prisma.products.findMany({ 
      take: 5,
      select: {
        id: true,
        name: true,
        price: true,
        network: true,
        isActive: true,
        isApproved: true,
        commission: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      count,
      sample: products,
      message: count === 0 
        ? '❌ NO PRODUCTS FOUND - Problem with product ingestion'
        : `✅ ${count} products found in database`
    });

  } catch (error: any) {
    console.error('❌ Debug products count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query products',
      details: error.message
    });
  }
});

// 🔍 DEBUG: Check product clicks
router.get('/clicks-count', async (req, res) => {
  try {
    const count = await prisma.product_clicks.count();
    const clicks = await prisma.product_clicks.findMany({ 
      take: 5,
      orderBy: { created_at: 'desc' }
    });

    res.json({
      success: true,
      count,
      sample: clicks,
      message: `${count} clicks recorded`
    });

  } catch (error: any) {
    console.error('❌ Debug clicks count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query clicks',
      details: error.message
    });
  }
});

// 🔍 DEBUG: Database health check
router.get('/health', async (req, res) => {
  try {
    const [
      productsCount,
      usersCount,
      clicksCount,
      conversionsCount
    ] = await Promise.all([
      prisma.products.count(),
      prisma.user.count(),
      prisma.product_clicks.count().catch(() => 0),
      prisma.product_conversions.count().catch(() => 0)
    ]);

    res.json({
      success: true,
      database: 'connected',
      tables: {
        products: productsCount,
        users: usersCount,
        clicks: clicksCount,
        conversions: conversionsCount
      },
      status: productsCount > 0 ? 'healthy' : 'no_products'
    });

  } catch (error: any) {
    console.error('❌ Debug health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Database health check failed',
      details: error.message
    });
  }
});

// 🔥 MANUAL TRIGGER: Import products from all networks
router.get('/import-products', async (req, res) => {
  try {
    console.log('🚀 Manual product import triggered...');
    
    const result = await importProducts();
    
    res.json({
      success: result.success,
      totalImported: result.totalImported,
      results: result.results,
      message: result.totalImported > 0 
        ? `✅ Successfully imported ${result.totalImported} products`
        : '⚠️ No products imported. Check network configurations.'
    });

  } catch (error: any) {
    console.error('❌ Product import error:', error);
    res.status(500).json({
      success: false,
      error: 'Product import failed',
      details: error.message
    });
  }
});

// 🔥 MANUAL TRIGGER: Import from specific network
router.get('/import-products/:network', async (req, res) => {
  try {
    const network = req.params.network;
    console.log(`🚀 Manual import from ${network} triggered...`);
    
    const result = await importFromNetwork(network);
    
    res.json({
      success: result.success,
      network: result.network,
      productsImported: result.productsImported,
      error: result.error,
      message: result.success 
        ? `✅ Imported ${result.productsImported} products from ${network}`
        : `❌ Failed to import from ${network}: ${result.error}`
    });

  } catch (error: any) {
    console.error('❌ Network import error:', error);
    res.status(500).json({
      success: false,
      error: 'Network import failed',
      details: error.message
    });
  }
});

// 🔥 SIMULATE CONVERSION: Test monetization flow
router.post('/simulate-conversion/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const { userId, amount = 500 } = req.body;

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }

    console.log(`💰 SIMULATING CONVERSION: Product ${productId}, Amount ${amount} XAF`);

    // Get product
    const product = await prisma.products.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const productOwnerId = userId || product.userId || 1;

    // Create conversion record
    const conversion = await prisma.product_conversions.create({
      data: {
        product_id: productId,
        user_id: productOwnerId,
        amount: amount,
        commission: amount * 0.5, // 50% commission
        status: 'completed',
        external_id: `sim_${Date.now()}`
      }
    });

    // Credit wallet
    await prisma.$transaction(async (tx) => {
      // Find or create wallet
      let wallet = await tx.wallet.findUnique({
        where: { userId: String(productOwnerId) }
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: String(productOwnerId),
            balance: 0,
            tokens: 0,
            currency: 'XAF'
          }
        });
      }

      // Credit wallet with commission
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: amount * 0.5
          }
        }
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: productOwnerId,
          amount: amount * 0.5,
          type: 'credit',
          source: 'affiliate_commission',
          status: 'completed',
          description: `Commission from ${product.name} (SIMULATED)`,
          referenceId: conversion.id.toString()
        }
      });
    });

    console.log(`✅ CONVERSION SIMULATED: ${amount * 0.5} XAF credited to user ${productOwnerId}`);

    res.json({
      success: true,
      conversion,
      commission: amount * 0.5,
      message: `Simulated conversion: ${amount * 0.5} XAF credited to wallet`
    });

  } catch (error: any) {
    console.error('❌ Conversion simulation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
