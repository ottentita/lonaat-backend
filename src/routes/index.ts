/**
 * MAIN ROUTES INDEX
 * Mount all API routes with proper organization
 */

import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import walletRoutes from './wallet';
import financialRoutes from './financial';
import withdrawalRoutes from './withdrawals';
import tokenRoutes from './tokens';
import momoRoutes from './momo';
import adminRoutes from './admin';
import adminControlRoutes from './admin-control';
import testRoutes from './test';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/wallet', walletRoutes);
router.use('/financial', financialRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/tokens', tokenRoutes);
router.use('/momo', momoRoutes);
router.use('/admin', adminRoutes);
router.use('/admin-control', adminControlRoutes);
router.use('/test', testRoutes);

export default router;
