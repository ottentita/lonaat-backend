import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import campaignRoutes from './routes/campaigns';
import adminRoutes from './routes/admin';
import commissionRoutes from './routes/commissions';
import paymentRoutes from './routes/payments';
import subscriptionRoutes from './routes/subscriptions';
import walletRoutes from './routes/wallet';
import webhookRoutes from './routes/webhooks';
import propertyRoutes from './routes/properties';
import marketplaceRoutes from './routes/marketplace';
import productImportRoutes from './routes/productImport';
import networkStatusRoutes from './routes/networkStatus';
import landRegistryRoutes from './routes/landRegistry';
import leadsRoutes from './routes/leads';
import realEstateAnalyticsRoutes from './routes/realEstateAnalytics';
import { initPostGIS } from './services/gpsVerification';
import { initializeAdmitadNetworks } from './services/admitadService';
import affiliateRoutes from './routes/affiliate';
import mobileRoutes from './routes/mobile';
import { startFeedSyncScheduler } from './services/admitadFeedService';

dotenv.config();

console.log("ENV:", process.env.NODE_ENV);

const app = express();
const prisma = new PrismaClient();
const PORT = parseInt(process.env.PORT || '8000', 10);

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productImportRoutes);
app.use('/api/products', productRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/postback', webhookRoutes);
app.use('/postback', webhookRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/networks', networkStatusRoutes);
app.use('/api/land-registry', landRegistryRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/real-estate/analytics', realEstateAnalyticsRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/track', affiliateRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/uploads', express.static('uploads'));

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Lonaat API v2.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      products: '/api/products',
      marketplace: '/api/marketplace',
      campaigns: '/api/campaigns',
      commissions: '/api/commissions',
      payments: '/api/payments',
      subscriptions: '/api/subscriptions',
      wallet: '/api/wallet',
      webhooks: '/api/webhooks',
      properties: '/api/properties',
      admin: '/api/admin'
    }
  });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  try {
    await initPostGIS();
    console.log('PostGIS spatial database initialized');
  } catch (error) {
    console.warn('PostGIS initialization warning:', error);
  }

  try {
    await initializeAdmitadNetworks();
    console.log('Admitad/AliExpress networks initialized');
  } catch (error) {
    console.warn('Admitad initialization warning:', error);
  }

  if (process.env.ADMITAD_FEED_URL) {
    startFeedSyncScheduler(6);
    console.log('Admitad feed sync scheduler started (6-hour interval)');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Lonaat API v2.0 running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();

export { prisma };
