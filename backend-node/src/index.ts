import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import path from 'path'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import prisma from './prisma'

import authRoutes from './routes/auth'
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
import commissionRoutes from './routes/commissions'
import paymentRoutes from './routes/payments'
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
import aiRoutes from './routes/ai'
import adminAiRoutes from './routes/adminAi'
import adsModuleRoutes from './modules/ads/ads.routes'
import { aiRateLimiter } from './middleware/rateLimiter'
import { blockIfSuspicious } from './middleware/security'

const app = express()
export default app
app.use(helmet())
app.use(cors())
app.use(express.json())

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
app.use('/api/commissions', commissionRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/subscriptions', subscriptionRoutes)
// compatibility aliases for frontend (some places use singular `subscription`)
app.use('/api/subscription', subscriptionRoutes)
app.get('/api/subscription/current', (req, res) => res.redirect(307, '/api/subscriptions/my-subscription'))
// compatibility alias used by frontend (public plans list)
app.get('/api/plans', (req, res) => res.redirect(307, '/api/subscriptions/plans'))

app.use('/api/wallet', walletRoutes)
app.use('/api/webhooks', webhookRoutes)
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
app.use('/api/ai', aiRateLimiter, blockIfSuspicious, aiRoutes)
app.use('/api/admin/ai', adminAiRoutes)
// internal ads module endpoints (token engine)
app.use('/api/ads/internal', adsModuleRoutes)
app.use('/api/leads', leadsRoutes)
app.use('/api/land-registry', landRegistryRoutes)
// real-estate analytics: mount at both `/real-estate` and `/real-estate/analytics` to match frontend
app.use('/api/real-estate', realEstateAnalyticsRoutes)
app.use('/api/real-estate/analytics', realEstateAnalyticsRoutes)
app.use('/api/automobiles', automobilesRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

// Serve frontend static files (built output)
const frontendDist = path.join(__dirname, '../../frontend/dist')
app.use(express.static(frontendDist))

// SPA fallback for non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' })
  return res.sendFile(path.join(frontendDist, 'index.html'))
})

const port = Number(process.env.PORT || 4001)

async function start() {
  try {
    await prisma.$connect()
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`))
  } catch (err) {
    console.error('Failed to start server', err)
    process.exit(1)
  }
}

// only auto-start when run directly (prevents `start()` during test imports)
if (require.main === module) start();
