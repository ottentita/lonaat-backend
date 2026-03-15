

import express from 'express';
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

const app = express();
// prisma client is provided by src/prisma now
// const prisma = new PrismaClient();


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

const port = process.env.PORT || 4000;
app.listen(port, () => {
});

export default app;
