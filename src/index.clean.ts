import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import prisma from './prisma'

console.log('🔗 DATABASE CONNECTION INFO:');
console.log('📦 DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('🌐 NODE_ENV:', process.env.NODE_ENV || 'development');

console.log('🔧 Creating Prisma client...');
console.log('✅ Prisma client created');

console.log('📦 Importing routes...');

// Core routes that exist and work
import authRoutes from './routes/auth'
import devRoutes from './routes/dev'
import dashboardRoutes from './routes/dashboard'
import contentRoutes from './routes/content'
import scheduleRoutes from './routes/schedule'
import queueRoutes from './routes/queue'
import postRoutes from './routes/post'
import publishRoutes from './routes/publish'
import distributionRoutes from './routes/distribution'

// AI routes
import aiRoutes from './routes/ai.routes'
import aiMonetizedRoutes from './routes/ai-monetized'
import aiAutoMonetizedRoutes from './routes/ai-auto-monetized'
import aiViralRoutes from './routes/ai-viral'
import aiConversionOptimizedRoutes from './routes/ai-conversion-optimized'

// Financial routes
import financialRoutes from './routes/financial'
import financialAdminRoutes from './routes/financial-admin'
import coinbaseWebhookRoutes from './routes/coinbase-webhook'

// Marketplace routes
import propertiesSimpleRoutes from './routes/properties-simple'
import automobilesSimpleRoutes from './routes/automobiles-simple'

// Product routes
import productsMonetizationRoutes from './routes/products-monetization'

// Conversion tracking
import conversionRoutes from './routes/conversion'

// Utility routes
import tokenRoutes from './routes/token.routes'
import internalRoutes from './routes/internal.routes'

import { aiRateLimiter, globalLimiter } from './middleware/rateLimiter'
import { errorHandler } from './middleware/errorHandler'

console.log('✅ All routes imported');

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

// Health check
app.get('/api', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Lonaat Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

// Mount routes
app.use('/api/auth', authRoutes)
app.use('/api/dev', devRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/schedule', scheduleRoutes)
app.use('/api/queue', queueRoutes)
app.use('/api/post', postRoutes)
app.use('/api/publish', publishRoutes)
app.use('/api/distribution', distributionRoutes)

// AI routes
app.use('/api/ai', aiRoutes)
app.use('/api/ai', aiMonetizedRoutes)
app.use('/api/ai', aiAutoMonetizedRoutes)
app.use('/api/ai', aiViralRoutes)
app.use('/api/ai', aiConversionOptimizedRoutes)

// Financial routes
app.use('/api/financial', financialRoutes)
app.use('/api/financial/admin', financialAdminRoutes)
app.use('/api/webhooks', coinbaseWebhookRoutes)

// Marketplace routes
app.use('/api/properties-simple', propertiesSimpleRoutes)
app.use('/api/automobiles-simple', automobilesSimpleRoutes)

// Product routes
app.use('/api/products', productsMonetizationRoutes)

// Conversion tracking
app.use('/api/conversion', conversionRoutes)

// Utility routes
app.use('/', tokenRoutes)
app.use('/', internalRoutes)

// Error handler
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 API available at http://localhost:${PORT}/api`);
});

export { app };
