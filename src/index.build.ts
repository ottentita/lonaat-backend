

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import campaignRoutes from './routes/campaigns';
import adminRoutes from './routes/admin';
import adminAiRoutes from './routes/adminAi';
import adminPricingRoutes from './routes/admin.pricing.routes';
import adminConversionRoutes from './routes/adminConversionRoutes';
import adminPostbackSecretsRoutes from './routes/adminPostbackSecrets';
import adsRoutes from './routes/ads';
import aiRoutes from './routes/ai.routes';
import aiLegacyRoutes from './routes/ai';
import affiliateRoutes from './routes/affiliate';
import dashboardRoutes from './routes/dashboard';
import realEstateAnalyticsRoutes from './routes/realEstateAnalytics';
import socialRoutes from './routes/social';
import statsRoutes from './routes/stats';
import subscriptionsRoutes from './routes/subscriptions';
import tokenRoutes from './routes/token.routes';
import trackRoutes from './routes/track';
import usersRoutes from './routes/users';
import walletRoutes from './routes/wallet';
import webhooksRoutes from './routes/webhooks';
import authRoutes from './routes/auth';
import paymentRoutes from './routes/payments';
import revenueRoutes from './routes/revenue';
import aiContentRoutes from './routes/aiContent';

const app = express();
app.use(helmet());
app.use(cookieParser());
app.use(express.json());

// CORS (allow frontend dev server by default)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // In non-production, allow any localhost / 127.0.0.1 origin (dev proxies, browser previews)
      if (process.env.NODE_ENV !== 'production' && origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS origin denied'));
    },
    credentials: true,
  }),
);


// Root endpoint for backend availability
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'lonaat-backend',
    message: 'API server running'
  });
});


// Health check endpoint for infrastructure monitoring
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'lonaat-backend',
    uptime: process.uptime()
  });
});

// Compatibility health endpoint expected by some clients
app.get('/api/health', (req, res) => {
  res.json({
    api: 'ok',
    database: 'connected',
    firebase: 'disabled'
  });
});



// Register all API routes
app.use('/api/campaign', campaignRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/ai', adminAiRoutes);
app.use('/api/admin/pricing', adminPricingRoutes);
app.use('/api/admin/conversion', adminConversionRoutes);
app.use('/api/admin/postback-secrets', adminPostbackSecretsRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-legacy', aiLegacyRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/real-estate', realEstateAnalyticsRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/ai-content', aiContentRoutes);

const PORT = process.env.PORT || 4000;

console.log('🔗 DATABASE CONNECTION INFO:');
console.log('📦 DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('🌐 NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('🔑 JWT SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');

// Only start the HTTP server when not running tests. Tests call `app.listen(0)` themselves.
if (process.env.NODE_ENV !== 'test') {
  console.log(`🚀 Starting server on port ${PORT}...`);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server started successfully on port ${PORT}`);
  })
}

export default app;
