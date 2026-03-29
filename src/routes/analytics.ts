import express, { Request, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/analytics/summary - Get overall summary
router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    console.log('📊 ANALYTICS - Get summary');

    // SAFE SIMPLE QUERIES
    const clicks = await prisma.clicks.count();
    const products = await prisma.products.count({ where: { is_active: true } });

    return res.json({
      success: true,
      data: {
        totalClicks: clicks || 0,
        totalProducts: products || 0,
        clicksToday: 0,
        clicksThisWeek: 0,
        uniqueProducts: 0,
        uniqueNetworks: 0
      }
    });
  } catch (error: any) {
    console.error('🔥 ANALYTICS SUMMARY ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error
    });
  }
});

// GET /api/analytics/top-products - Get top performing products
router.get('/top-products', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    console.log('📊 ANALYTICS - Get top products');

    const topProducts = await prisma.products.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        clicks: true,
        views: true,
        category: true
      },
      orderBy: { clicks: 'desc' },
      take: 10
    });

    return res.json({
      success: true,
      data: topProducts || []
    });
  } catch (error: any) {
    console.error('🔥 ANALYTICS TOP-PRODUCTS ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error
    });
  }
});

// GET /api/analytics/networks - Get network performance
router.get('/networks', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    console.log('📊 ANALYTICS - Get networks');

    // SAFE FALLBACK - return empty array
    return res.json({
      success: true,
      data: []
    });
  } catch (error: any) {
    console.error('🔥 ANALYTICS NETWORKS ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error
    });
  }
});

// GET /api/analytics/trends - Get click trends over time
router.get('/trends', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    console.log('📊 ANALYTICS - Get trends');

    // SAFE FALLBACK - return empty array
    return res.json({
      success: true,
      data: []
    });
  } catch (error: any) {
    console.error('🔥 ANALYTICS TRENDS ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error
    });
  }
});

// GET /api/analytics/clicks - Get all clicks with filtering
router.get('/clicks', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    console.log('📊 ANALYTICS - Get clicks');

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const totalClicks = await prisma.clicks.count();
    const clicks = await prisma.clicks.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip
    });

    return res.json({
      success: true,
      clicks: clicks || [],
      pagination: {
        page,
        limit,
        total: totalClicks,
        pages: Math.ceil(totalClicks / limit)
      }
    });
  } catch (error: any) {
    console.error('🔥 ANALYTICS CLICKS ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error
    });
  }
});

export default router;
