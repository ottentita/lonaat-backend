import 'dotenv/config'
import cron from 'node-cron';
import { applyMonthlyRollover } from './jobs/tokenRollover';
import startSubscriptionCleanup from './jobs/subscriptionCleanup';

// verify critical environment variables at startup (only enforce in production)
if (process.env.NODE_ENV === 'production') {
  const requiredEnvs = [
    'JWT_SECRET',
    'FRONTEND_URL',
    'DATABASE_URL',
    'DIGISTORE_WEBHOOK_SECRET',
  ];
  for (const key of requiredEnvs) {
    if (!process.env[key]) {
      console.error(`FATAL: missing required environment variable $${key}`);
      process.exit(1);
    }
  }
}

// discard any accidental debug logging of secrets in production

import express from 'express'
import path from 'path'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import cookieParser from 'cookie-parser';
import csrf from 'csurf';

const prisma = new PrismaClient()

import authRoutes from './routes/auth'
import { logger } from './middleware/logger'
import userRoutes from './routes/users'
import productRoutes from './routes/products'
import marketplaceRoutes from './routes/marketplace'
import offersRoutes from './routes/offers'
import categoriesRoutes from './routes/categories'
import listingsRoutes from './routes/listings'
import campaignRoutes from './routes/campaigns'
import adminRoutes from './routes/admin'
import adminConversionRoutes from './routes/adminConversionRoutes'
import trackRoutes from './routes/track'
import networkRoutes from './routes/networks'
import networkWebhook from './routes/webhooks/networkPostback'
import affiliateWebhookController from './controllers/affiliateWebhookController'
import { webhookLimiter } from './middleware/rateLimiter'
import commissionRoutes from './routes/commissions'
import paymentRoutes from './routes/payments'
import paymentRoutesV2 from './routes/payment'
import subscriptionRoutes from './routes/subscriptions'
import walletRoutes from './routes/wallet'
import webhookRoutes from './routes/webhooks'
import propertyRoutes from './routes/properties'
import postbackRoutes from './routes/postback'
import adminPostbackSecrets from './routes/adminPostbackSecrets'
import adsRoutes from './routes/ads'
import socialRoutes from './routes/social'
import affiliateRoutes from './routes/affiliate'
import clickRoutes from './routes/click'
import dashboardRoutes from './routes/dashboard'
import statsRoutes from './routes/stats'
import campaignStatusRoutes from './routes/campaign-status'
import leadsRoutes from './routes/leads'
import landRegistryRoutes from './routes/landRegistry'
import realEstateAnalyticsRoutes from './routes/realEstateAnalytics'
import automobilesRoutes from './routes/automobiles'
import aiRoutes from './routes/ai.routes'
import adminAiRoutes from './routes/adminAi'
import adminPricingRoutes from './routes/admin.pricing.routes'
import tokenRoutes from './routes/token.routes'
import internalRoutes from './routes/internal.routes'
import billingRoutes from './routes/billing'
import adsModuleRoutes from './modules/ads/ads.routes'
import conversionRoutes from './routes/conversions'
import { aiRateLimiter, globalLimiter } from './middleware/rateLimiter'
import { blockIfSuspicious } from './middleware/security'
import subscriptionGuard from './middleware/subscriptionGuard'
import { errorHandler } from './middleware/errorHandler'

const app = express()
export default app
app.use(helmet())
// only allow requests from our known frontend origin(s); undefined origin is permitted
const allowedOrigins = (process.env.FRONTEND_URL || '').split(',');
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow server-to-server or curl
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('CORS origin denied'));
    },
    credentials: true,
  }),
);
app.use(cookieParser())

// CSRF protection using cookies
const csrfProtection = csrf({ cookie: true });
// apply to unsafe methods later by adding middleware to specific routes

// Mount Coinbase webhook handler with raw JSON parsing BEFORE the JSON body parser
import paymentsRoutes, { webhookHandler as paymentsWebhookHandler } from './routes/payments'
// prefer router-mounted webhook validation in test mode so validation middleware returns structured errors
if (process.env.NODE_ENV !== 'test') {
  app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentsWebhookHandler)
}

// capture raw body for network webhooks (kept) before JSON parser runs
app.use('/api/webhooks/network', express.raw({ type: '*/*' }))

// new unified webhook endpoint for named networks
app.use('/webhooks', webhookLimiter, express.raw({ type: '*/*' }), affiliateWebhookController);

app.use(express.json())

// apply CSRF protection in production (skip during test/dev for convenience)
if (process.env.NODE_ENV === 'production') {
  app.use(csrfProtection);
  app.use((req, res, next) => {
    // make token available to SPA via cookie
    res.cookie('XSRF-TOKEN', req.csrfToken(), {
      httpOnly: false,
      sameSite: 'strict',
      secure: true,
    });
    next();
  });
}

// lightweight Digistore click conversion webhook (shortcut route)
app.post('/webhook/digistore', async (req, res) => {
  try {
    const secret = req.body.secret
    const subid = req.body.subid
    const amount = parseFloat(req.body.amount)

    if (!secret || secret !== process.env.DIGISTORE_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!subid) {
      return res.status(400).json({ error: 'Missing subid' })
    }

    const clickId = parseInt(subid)

    const updated = await prisma.click.update({
      where: { id: clickId },
      data: {
        converted: true,
        revenue: amount || 0
      }
    })

    return res.status(200).json({
      status: 'conversion-recorded',
      clickId: updated.id,
      revenue: updated.revenue
    })

  } catch (error) {
    console.error('Digistore webhook error:', error)
    return res.status(500).json({ error: 'Webhook failed' })
  }
})

// lightweight request logging (disabled in test mode)
app.use(logger)
// apply global rate limit to all incoming requests (test-mode uses very high limits)
app.use(globalLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
// compatibility alias for frontend (frontend uses `/user/...` in places)
app.use('/api/user', userRoutes)
app.use('/api/products', productRoutes)
app.use('/api/marketplace', marketplaceRoutes)
app.use('/api/market', marketplaceRoutes)
// compatibility alias: /api/market/listings -> /api/market/products
app.get('/api/market/listings', (req, res) => {
  const qs = new URLSearchParams(req.query as any).toString();
  res.redirect(307, `/api/market/products${qs ? '?' + qs : ''}`);
});
app.use('/api/categories', categoriesRoutes)
app.use('/api/offers', offersRoutes)
app.use('/api/listings', listingsRoutes)
app.use('/api/campaigns', campaignRoutes)
// expose ads routes at /api/ads (frontend uses /ads/*)
app.use('/api/ads', adsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin', adminConversionRoutes)
app.use('/api/track', trackRoutes)
app.use('/api/networks', networkRoutes)
app.use('/api/webhooks/network', networkWebhook)
app.use('/api/conversions', conversionRoutes)
app.use('/api/commissions', commissionRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/payment', paymentRoutesV2)
app.use('/api/subscriptions', subscriptionRoutes)
// compatibility aliases for frontend (some places use singular `subscription`)
app.use('/api/subscription', subscriptionRoutes)
app.get('/api/subscription/current', (req, res) => res.redirect(307, '/api/subscriptions/my-subscription'))
// compatibility alias used by frontend (public plans list)
app.get('/api/plans', (req, res) => res.redirect(307, '/api/subscriptions/plans'))

app.use('/api/wallet', walletRoutes)
app.use('/api/webhooks', webhookRoutes)
// alias without the "api" prefix (some external integrations post to /webhook/* )
app.use('/webhook', webhookRoutes)
app.use('/api/properties', propertyRoutes)
app.use('/api/postback', postbackRoutes)
app.use('/api/admin/postback-secrets', adminPostbackSecrets)

// Mount additional routes used by the frontend service wrapper
app.use('/api/social', socialRoutes)
app.use('/api/affiliate', affiliateRoutes)
app.use('/api/click', clickRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/campaign-status', campaignStatusRoutes)
// AI endpoints (rate-limited & basic suspicious IP blocking)
// Mount AI routes; individual routes perform their own auth/guards so
// validation middleware can run before authentication when appropriate.
app.use('/api/ai', aiRateLimiter, blockIfSuspicious, aiRoutes)

// token and internal utility routes
app.use('/', tokenRoutes)
app.use('/', internalRoutes)
app.use('/api/admin/ai', adminAiRoutes)
app.use('/admin/pricing', adminPricingRoutes)
// Billing endpoints
app.use('/api/billing', billingRoutes)
// Temporary test routes removed in Phase 1 cleanup
// internal ads module endpoints (token engine)
app.use('/api/ads/internal', adsModuleRoutes)
app.use('/api/leads', leadsRoutes)
app.use('/api/land-registry', landRegistryRoutes)
// real-estate analytics: mount at both `/real-estate` and `/real-estate/analytics` to match frontend
app.use('/api/real-estate', realEstateAnalyticsRoutes)
app.use('/api/real-estate/analytics', realEstateAnalyticsRoutes)
app.use('/api/automobiles', automobilesRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

// schedule monthly rollover at midnight on 1st of each month
cron.schedule('0 0 1 * *', async () => {
  
  try {
    await applyMonthlyRollover();
    
  } catch (error) {
    console.error('Rollover failed:', error);
  }
});

// start daily subscription cleanup (expires trials/subscriptions)
startSubscriptionCleanup();

// FRONTEND STATIC SERVING DISABLED (DEV MODE)
// const frontendDist = path.join(__dirname, '../../frontend/dist')
// app.use(express.static(frontendDist))

// SPA fallback for non-API routes (disabled in dev)
// app.get('*', (req, res) => {
//   if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' })
//   return res.sendFile(path.join(frontendDist, 'index.html'))
// })

// Health endpoint for quick checks (reports DB connection status)
app.get('/health', async (req, res) => {
  try {
    // quick ping to DB
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'connected' })
  } catch (e) {
    res.status(500).json({ status: 'error', database: 'disconnected' })
  }
})

// global error handler (should be registered after all routes)
app.use(errorHandler)

// Test click endpoint (creates a sample affiliateClick record)
app.get('/test-click', async (req, res) => {
  try {
    const now = Date.now()
    // ensure there is an Offer to reference (avoids FK constraint failures)
    // use raw SQL to avoid Prisma schema/DB mismatch for optional columns
    const offerRows: any = await prisma.$queryRawUnsafe(
      `INSERT INTO offers (title, url) VALUES ('test-offer-${now}', 'https://example.com') RETURNING *`
    )
    const offer = Array.isArray(offerRows) ? offerRows[0] : offerRows

    const click = await prisma.click.create({
      data: {
        offerId: offer.id,
        adId: 0,
        userId: 0,
        timeBucket: 0,
        clickId: `test_click_${now}`,
        clickToken: `test_token_${now}_${Math.random().toString(36).slice(2)}`,
        ip: '127.0.0.1',
        userAgent: 'manual-test',
        user_id: null
      }
    })

    res.json({ status: 'click-created', click })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'DB write failed' })
  }
})

const PORT = Number(process.env.PORT || 4000)

// Basic tracking endpoint: create a click record and redirect dynamically
//
// *Note*: digistore24 offers are treated specially – instead of using a stored
// trackingUrl we pull the product/affiliate ids from environment variables and
// construct the final URL on the fly.  The offer record may simply contain the
// literal string "digistore24" (see import logic) and we avoid logging the
// sensitive ENV values.
app.get('/track', async (req, res) => {
  try {
    const { network, offer, subid } = req.query

    // validate required query params
    if (!network || !offer) {
      return res.status(400).json({ error: 'Missing network or offer' })
    }

    const offerKey = String(offer)
    const offerRecord = await prisma.offer.findFirst({
      where: {
        network: String(network),
        isActive: true,
        OR: [
          { slug: offerKey },
          { externalOfferId: offerKey },
        ],
      },
      select: { id: true, network: true, trackingUrl: true, externalOfferId: true }
    })

    if (!offerRecord) {
      return res.status(404).json({ error: 'Offer not found' })
    }

    // Generate required fields for Click model
    const timeBucket = Math.floor(Date.now() / 5000)
    const clickToken = crypto.randomBytes(16).toString('hex')
    const clickId = `click_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    const hashIp = (str?: string) => {
      if (!str) return 0
      let n = 0
      for (let i = 0; i < str.length; i++) n = ((n << 5) - n) + str.charCodeAt(i) | 0
      return Math.abs(n)
    }
    const userKey = hashIp(req.ip)

    // store external subid if the user provided one (don't forward it to Digistore)
    const externalSub = req.query.subid ? String(req.query.subid) : null

    const click = await prisma.click.create({
      data: {
        network: offerRecord.network,
        adId: 0,
        userId: userKey,
        timeBucket,
        clickId,
        clickToken,
        ip: req.ip,
        userAgent: String(req.headers['user-agent'] || ''),
        externalSubId: externalSub,
        offer: { connect: { id: offerRecord.id } }
      }
    })

    // build redirect URL depending on network
    let redirectUrl = ''

    if (offerRecord.network === 'digistore24') {
      const { DIGISTORE_PRODUCT_ID, DIGISTORE_AFFILIATE_ID } = process.env
      if (!DIGISTORE_PRODUCT_ID || !DIGISTORE_AFFILIATE_ID) {
        return res.status(500).json({ error: 'Digistore ENV not configured' })
      }
      // Digistore must receive our internal click.id for attribution
      redirectUrl = `https://www.digistore24.com/redir/${DIGISTORE_PRODUCT_ID}/${DIGISTORE_AFFILIATE_ID}/?subid=${click.id}`
    } else {
      redirectUrl = `${offerRecord.trackingUrl}?click_id=${click.id}&ts=${Date.now()}`
      if (subid) {
        redirectUrl += `&subid=${encodeURIComponent(String(subid))}`
      }
    }

    return res.redirect(302, redirectUrl)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Tracking failed' })
  }
})

// lightweight click analytics
app.get('/stats', async (req, res) => {
  try {
    const totalClicks = await prisma.click.count()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const clicksToday = await prisma.click.count({ where: { createdAt: { gte: todayStart } } })

    // total revenue and conversions
    const revenueAgg = await prisma.click.aggregate({ _sum: { revenue: true } })
    const conversions = await prisma.click.count({ where: { converted: true } })
    const totalRevenue = revenueAgg._sum.revenue || 0

    // calculate metrics
    const epc = totalClicks > 0 ? (totalRevenue / totalClicks) : 0
    const conversionRate = totalClicks > 0 ? ((conversions / totalClicks) * 100) : 0

    const byOfferRaw = await prisma.click.groupBy({
      by: ['offerId'],
      _count: { offerId: true },
    })

    const byOffer = await Promise.all(
      byOfferRaw.map(async (r) => {
        try {
          const offer = await prisma.offer.findUnique({ where: { id: r.offerId } })
          return {
            offerId: r.offerId,
            offerName: offer?.name || offer?.title || null,
            count: r._count.offerId,
          }
        } catch (e) {
          // if the ORM fails to convert nullable DB fields, fall back to null name
          return { offerId: r.offerId, offerName: null, count: r._count.offerId }
        }
      })
    )

    res.json({ totalClicks, conversions, totalRevenue, epc, conversionRate, today: clicksToday, byOffer })
  } catch (err) {
    console.error('Stats error', err)
    res.status(500).json({ error: 'Failed to retrieve stats' })
  }
})

// Temporary GET route for testing payment charge endpoint
app.get('/create-test-charge', async (req, res) => {
  try {
    const response = await fetch('http://localhost:4000/api/payments/create-charge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: 10,
        userId: 'test-user-123'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return res.status(response.status).json({
        error: `Payment service returned ${response.status}`,
        details: errorData
      })
    }

    const data = await response.json()
    return res.json(data)
  } catch (error) {
    console.error('Test charge error:', error)
    return res.status(500).json({
      error: 'Failed to create test charge',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Print registered routes for audit (simple)
function logRoutes(stack:any[], prefix = '') {
  stack.forEach(layer => {
    if (layer.route && layer.route.path) {
      
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      
      logRoutes(layer.handle.stack, prefix);
    }
  });
}
logRoutes(app._router.stack);

// Only start the HTTP server when not running tests. Tests call `app.listen(0)` themselves.
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    // server started
  })
}
