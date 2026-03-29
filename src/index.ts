import dotenv from 'dotenv';
import path from 'path';

console.log('🚀 CORRECT SERVER FILE RUNNING');
console.log('🚀 MAIN SERVER FILE LOADED');

// FORCE LOAD DOTENV FROM CORRECT PATH
dotenv.config({
  path: path.resolve(__dirname, '../.env')
});

// VALIDATE ENVIRONMENT VARIABLES ON STARTUP
import { validateEnvVariables } from './utils/envValidator';
validateEnvVariables();

import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import prisma from './prisma'
import productSyncService from './services/productSyncService'

// Prisma client initialization

// Core routes that exist and work
import { authMiddleware, AuthRequest } from './middleware/auth'
import authRoutes from './routes/auth'
import momoRoutes from './routes/momo'
import adminDepositRoutes from './routes/admin-deposit'
import adminRevenueRoutes from './routes/admin-revenue'
import adminRefundRoutes from './routes/admin-refund'
import healthFinancialRoutes from './routes/health-financial'
import adminRoutes from './routes/admin.routes'
// REMOVED DUPLICATE: import newAuthRoutes from './routes/auth.routes'
import devRoutes from './routes/dev'
import dashboardRoutes from './routes/dashboard'
import contentRoutes from './routes/content'
import adminControlRoutes from './routes/admin-control'
import adminSyncRoutes from './routes/admin-sync'
import adminSimpleRoutes from './routes/admin-simple'
import adminWithdrawalsRoutes from './routes/admin-withdrawals-audit'
import { startProductSyncJob } from './jobs/productSync.job';
// import { scheduleSubscriptionCleanup } from './jobs/subscription-cleanup';
// import { scheduleMonetizationCron } from './jobs/monetization-cron';


import queueRoutes from './routes/queue'
import postRoutes from './routes/post'
import publishRoutes from './routes/publish'
import distributionRoutes from './routes/distribution'

// AI routes
import aiRoutes from './routes/ai.routes'
import aiGenerateRoutes from './routes/ai-generate'
import aiMonetizedRoutes from './routes/ai-monetized'
import aiAutoMonetizedRoutes from './routes/ai-auto-monetized'
import aiViralRoutes from './routes/ai-viral'
import aiConversionOptimizedRoutes from './routes/ai-conversion-optimized'

// Financial routes
import financialRoutes from './routes/financial'
import financialAdminRoutes from './routes/financial-admin'
import coinbaseWebhookRoutes from './routes/coinbase-webhook'
import paymentsRoutes from './routes/payments'

// Marketplace routes
import propertiesSimpleRoutes from './routes/properties-simple'
import automobilesSimpleRoutes from './routes/automobiles-simple'
import automobilesRoutes from './routes/automobiles'
import bookingsRoutes from './routes/bookings'
import offersRoutes from './routes/offers'
import affiliateRoutes from './routes/affiliate'
import revenueRoutes from './routes/revenue'
import analyticsRoutes from './routes/analytics'
import marketplaceRoutes from './routes/marketplace'

// Product routes
import productsMonetizationRoutes from './routes/products-monetization'
import productsSyncRoutes from './routes/products-sync'
import productsImportRoutes from './routes/products-import'
import userProductsRoutes from './routes/user-products'
// REMOVED: import productsDirectRoutes from './routes/products-direct'
import productsRealRoutes from './routes/products-real'
import productsSimpleRoutes from './routes/products-simple'
import productsCreateRoutes from './routes/products-create'
import productsClickRoutes from './routes/products-click'

// Creator marketplace routes
import trackingRoutes from './routes/tracking'
import creatorStatsRoutes from './routes/creator-stats'

// Affiliate routes
import affiliateClicksRoutes from './routes/affiliate-clicks'
import affiliateProductsRoutes from './routes/affiliate-products'
import clickRoutes from './routes/click'
import redirectRoutes from './routes/redirect'
import earningsRoutes from './routes/earnings'
import commissionsRoutes from './routes/commissions'
import analyticsDashboardRoutes from './routes/analytics-dashboard'
import earningsAnalyticsRoutes from './routes/earningsAnalytics'
import analyticsPublicRoutes from './routes/analytics-public'
import testRoutes from './routes/test';

// Growth system routes
import growthRoutes from './routes/growth'

// Referral system
import referralsRoutes from './routes/referrals'

// Stability & Pipeline routes
import financeAuditRoutes from './routes/finance-audit'
import contentPipelineRoutes from './routes/content-pipeline'

// Conversion tracking
import conversionRoutes from './routes/conversion'
import trackRoutes from './routes/track'
// REMOVED DUPLICATE: import trackClickRoutes from './routes/track-click'

// Webhook routes
import webhooksRoutes from './routes/webhooks'
import affiliateWebhookRoutes from './routes/affiliate-webhook'

// Utility routes
import tokenRoutes from './routes/token.routes'
import internalRoutes from './routes/internal.routes'
import internalSystemRoutes from './routes/internal'  // System-level internal routes

// AI System routes
import aiSystemRoutes from './core/ai/routes/ai-system.routes'
import aiUserRoutes from './core/ai/routes/ai.routes'

// Token routes
import tokenRoutesNew from './routes/tokens'
import tokenPricingRoutes from './routes/token-pricing'

// Wallet routes
import walletRoutes from './routes/wallet'

// Withdrawal routes
import withdrawalRoutes from './routes/withdrawals'

// Messages routes
import messagesRoutes from './routes/messages'

import { aiRateLimiter, globalLimiter, webhookLimiter, authLimiter, clickTrackingLimiter } from './middleware/rateLimiter'
import { errorHandler } from './middleware/errorHandler'

// Routes imported

const app = express()
export default app

app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      ...(process.env.FRONTEND_URL || '').split(',').map((s) => s.trim()).filter(Boolean)
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(cookieParser())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Request tracing middleware (for debugging and observability)
import requestTracingMiddleware from './middleware/requestTracing';
app.use(requestTracingMiddleware);

// Fraud Protection Middleware
// Fraud protection setup

// Bot filtering middleware
app.use((req, res, next) => {
  // BYPASS BOT DETECTION IN DEVELOPMENT ENVIRONMENT
  if (process.env.NODE_ENV !== 'production') {
    console.log("🔓 BOT DETECTION BYPASSED (DEV MODE)");
    console.log("📥 Incoming request allowed (DEV MODE)");
    return next();
  }

  // EXCLUDE WEBHOOK ENDPOINTS from bot detection
  const webhookPaths = [
    '/api/webhooks/',
    '/api/conversion/webhook',
    '/api/track'
  ];
  
  const isWebhookPath = webhookPaths.some(path => req.path.startsWith(path));
  
  if (isWebhookPath) {
    return next();
  }
  
  const userAgent = req.headers['user-agent']?.toLowerCase() || '';
  
  // Block suspicious user agents
  const botPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 
    'python-requests', 'java', 'node', 'axios', 'httpie',
    'postman', 'insomnia', 'swagger', 'harvest', 'extract',
    'grab', 'slurp', 'scoop', 'indexer', 'seek', 'find'
  ];
  
  const isBot = botPatterns.some(pattern => userAgent.includes(pattern));
  
  if (isBot && !userAgent.includes('chrome') && !userAgent.includes('firefox') && !userAgent.includes('safari')) {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'Bot activity detected'
    });
  }
  
  next();
});

// Rate limiting for redirect endpoints
const redirectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Fraud protection configured

// Health check
app.get('/api', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Lonaat Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// HEALTH CHECK ENDPOINT
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbCheck = await prisma.$queryRaw`SELECT 1 as result`;
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbCheck ? 'connected' : 'disconnected',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      },
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(200).json(health);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      uptime: process.uptime()
    });
  }
});

// REMOVED: test webhook debug routes

// GET /api/properties - Simple properties endpoint
app.get("/api/properties", async (req, res) => {
  try {
    const data: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM properties ORDER BY created_at DESC LIMIT 50`)
    return res.json(data || [])
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Failed to fetch properties" })
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    console.error('❌ HEALTH CHECK FAILED:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Database connection failed'
    });
  }
});

// Mount routes
app.use('/api/auth', authLimiter, authRoutes)
console.log('🔥 AUTH ROUTES REGISTERED at /api/auth');
console.log('🔥 AUTH ROUTES REGISTERED - UNCONDITIONAL');
// REMOVED DUPLICATE: app.use('/api/auth', newAuthRoutes) — auth.ts already handles register/login/me
app.use('/api/dev', devRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/content', contentRoutes)
// app.use('/api/schedule', scheduleRoutes)
app.use('/api/queue', queueRoutes)
app.use('/api/post', postRoutes)
app.use('/api/publish', publishRoutes)
app.use('/api/distribution', distributionRoutes)

// AI routes
app.use('/api/ai', aiGenerateRoutes) // Unified endpoint - mount first
app.use('/api/ai', aiRoutes)
app.use('/api/ai', aiMonetizedRoutes)
app.use('/api/ai', aiAutoMonetizedRoutes)
app.use('/api/ai', aiViralRoutes)
app.use('/api/ai', aiConversionOptimizedRoutes)

// Admin control routes
app.use('/api/admin', adminRoutes)
app.use('/api/admin', adminSimpleRoutes)
app.use('/api/admin', adminDepositRoutes)
app.use('/api/admin', adminRevenueRoutes)
app.use('/api/admin', adminRefundRoutes)
app.use('/api/admin', healthFinancialRoutes)
app.use('/api/admin', adminWithdrawalsRoutes)
app.use('/api/admin', adminControlRoutes)
app.use('/api/admin', adminSyncRoutes)
app.use('/api/financial/admin', financialAdminRoutes)
app.use('/api/webhooks', coinbaseWebhookRoutes)
app.use('/api/payments', paymentsRoutes)

// Marketplace routes
app.use('/api/properties-simple', propertiesSimpleRoutes)
app.use('/api/automobiles-simple', automobilesSimpleRoutes)
app.use('/api/automobiles', automobilesRoutes)
app.use('/api/bookings', bookingsRoutes)
app.use('/api/offers', offersRoutes)
app.use('/api/products', productsSimpleRoutes) // Simple working products endpoint
app.use('/api/products', productsCreateRoutes) // Creator product creation
app.use('/api/products', productsClickRoutes) // Product click tracking
app.use('/api/track', clickTrackingLimiter, trackingRoutes) // Product tracking and click redirect
app.use('/api/creator', creatorStatsRoutes) // Creator dashboard stats
// app.use('/api/affiliate', affiliateProductsRoutes) // DISABLED: Broken prisma import
app.use('/api/affiliate', affiliateRoutes)
app.use('/api/affiliate', affiliateClicksRoutes)
app.use('/api', clickRoutes)
app.use('/redirect', redirectLimiter, redirectRoutes)
app.use('/api/earnings', earningsRoutes)
app.use('/api/commissions', commissionsRoutes)  // Commission management
app.use('/api/test', testRoutes)  // Test routes for development
// DISABLED: analytics-dashboard uses non-existent Prisma models (clicks, commissions, offers)
// app.use('/api/analytics', analyticsDashboardRoutes)
app.use('/api/revenue', revenueRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/analytics', earningsAnalyticsRoutes)
app.use('/analytics', analyticsPublicRoutes)  // Public analytics routes (no /api prefix)
app.use('/api/marketplace', marketplaceRoutes)

// Growth system routes
app.use('/api/growth', growthRoutes)
app.use('/r', growthRoutes)  // Short redirect URLs for click tracking

// Stability & Pipeline routes
app.use('/api/finance', financeAuditRoutes)
app.use('/api/content-pipeline', contentPipelineRoutes)

// REMOVED DUPLICATE: trackClickRoutes GET /click already handled by trackingRoutes

// Product routes
app.use('/api/products/real', productsRealRoutes)  // REAL products only - NO MOCK
// app.use('/api/products', productsDirectRoutes)  // DISABLED: Conflicts with productsSimpleRoutes
// app.use('/api/products', productsSyncRoutes)  // DISABLED: Conflicts with productsSimpleRoutes
// app.use('/api/products', productsImportRoutes)  // DISABLED: Conflicts with productsSimpleRoutes
// app.use('/api/products', productsMonetizationRoutes)  // DISABLED: Conflicts with productsSimpleRoutes
app.use('/api/user-products', userProductsRoutes)

// Webhook routes (MUST BE BEFORE OTHER ROUTES - NO AUTH)
app.use('/api/webhooks', webhookLimiter, affiliateWebhookRoutes)
app.use('/api/webhooks', webhookLimiter, webhooksRoutes)

// Conversion tracking
app.use('/api/conversion', conversionRoutes)
// DISABLED: track.ts uses non-existent Prisma models (offer, click, etc)
// app.use('/api/track/conversion', trackRoutes)

// Utility routes
app.use('/', tokenRoutes)
app.use('/', internalRoutes)
app.use('/api/internal', internalSystemRoutes)

// Wallet routes
app.use('/api/wallet', walletRoutes)

// MTN MOMO routes - Cameroon payment integration
app.use('/api/momo', momoRoutes)

// User behavior tracking routes
import userBehaviorRoutes from './routes/user-behavior'
// Debug routes for product verification
import debugRoutes from './routes/debug'
//   // Disabled old wallet routes
// app.use('/wallet', walletWithdrawalRoutes)  // Public wallet routes (no /api prefix) - COMMENTED OUT: route not imported

// Token routes
app.use('/api/tokens', tokenRoutesNew)
app.use('/api/tokens', tokenPricingRoutes)
app.use('/tokens', tokenRoutesNew)  // Public token routes (no /api prefix)

// Withdrawal routes
app.use('/api/withdrawals', withdrawalRoutes)
app.use('/withdrawals', withdrawalRoutes)  // Public withdrawal routes (no /api prefix)

// Referral routes
app.use('/api/referrals', referralsRoutes)
// User behavior tracking routes
app.use('/api/user-behavior', userBehaviorRoutes)

// AI System routes (require auth middleware)
app.use('/api/ai-system', aiSystemRoutes)  // Admin-only internal AI routes
app.use('/api/ai', aiUserRoutes)           // Premium user AI features

// AI Ad Generation routes
import aiAdsRoutes from './routes/ai-ads'
app.use('/api/ai', aiAdsRoutes)            // AI ad generation endpoints

// Admin routes
import { startExpireWithdrawalsJob } from './jobs/expireWithdrawals'
import paymentWebhooks from './routes/payment-webhooks'
import { startReconciliationJob } from './jobs/reconcilePayments'
import { startPayoutRetryJob } from './services/payoutRetry'
app.use('/api/admin', adminSimpleRoutes)
app.use('/api/admin/withdrawals', adminWithdrawalsRoutes)

// MTN MoMo routes
import mtnRoutes from './routes/mtn'
app.use('/api/mtn', mtnRoutes)

// Debug routes for product verification
app.use('/api/debug', debugRoutes)

// GET /api/vehicles - Real vehicles from database only
app.get("/api/vehicles", async (req, res) => {
  try {
    const vehicles: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM automobiles WHERE is_active = true ORDER BY created_at DESC LIMIT 20`
    );
    return res.json(vehicles);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch vehicles" });
  }
});

// 404 handler (MUST BE AFTER ALL ROUTES)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler (MUST BE AFTER 404)
app.use(errorHandler)

// GLOBAL ERROR HANDLER (MUST BE LAST)
app.use((err: any, req: any, res: any, next: any) => {
  console.error(`❌ GLOBAL ERROR [${req.id || 'NO-ID'}]:`, err);
  console.error('❌ ERROR STACK:', err.stack);
  console.error('❌ REQUEST:', {
    id: req.id,
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query
  });

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    requestId: req.id, // Include request ID in response for client-side debugging
  });
});

const PORT = process.env.PORT || 4000;

// Request logging disabled for cleaner console

app.listen(PORT, async () => {
  console.log('\n🚀 SERVER RUNNING ON PORT 4000');
  console.log(`✅ API: http://localhost:${PORT}\n`);
  
  // Verify database connection
  try {
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected - ${userCount} users\n`);
    
    // Start background jobs
    startPayoutRetryJob();
    console.log('✅ Payout retry job started\n');
    
    // Start product sync cron job
    startProductSyncJob();
    console.log('✅ Product sync cron job started\n');
    
    // Start product import cron job
    const { startProductImportCron } = await import('./jobs/productImportCron');
    startProductImportCron();
    console.log('✅ Product import cron job started\n');
    
    // Start automated product import (every 10 minutes)
    const { startProductImportAutomation } = await import('./jobs/productImportAutomation');
    startProductImportAutomation();
    console.log('✅ Automated product import started\n');
    
    // Start automated ad generation (every 30 minutes)
    const { startAutoAdGeneration } = await import('./jobs/autoAdGeneration');
    startAutoAdGeneration();
    console.log('✅ Auto ad generation started\n');
  } catch (error: any) {
    console.error('❌ DATABASE ERROR:', error.message);
  }
});
