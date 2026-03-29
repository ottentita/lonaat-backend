/**
 * FINANCIAL HEALTH CHECK ENDPOINT
 * Real-time system health monitoring for financial operations
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

/**
 * GET /api/health/financial - Financial system health check
 */
router.get('/financial', async (req: AuthRequest, res: Response) => {
  try {
    console.log('🏥 FINANCIAL HEALTH CHECK REQUESTED');

    // Check ledger integrity
    const totalDebits = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        type: 'debit'
      }
    });

    const totalCredits = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        type: 'credit'
      }
    });

    const ledgerIntegrity = Math.abs((totalDebits._sum.amount || 0) - (totalCredits._sum.amount || 0)) < 0.01;

    // Check for negative balances
    const negativeWallets = await prisma.wallet.count({
      where: {
        balance: { lt: 0 }
      }
    });

    const negativeTokens = await prisma.wallet.count({
      where: {
        tokens: { lt: 0 }
      }
    });

    // Check pending transactions
    const pendingTransactions = await prisma.transaction.count({
      where: {
        status: 'pending'
      }
    });

    // Check failed transactions in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentFailedTransactions = await prisma.transaction.count({
      where: {
        status: 'failed',
        createdAt: { gte: oneHourAgo }
      }
    });

    // Check wallet consistency
    const walletSum = await prisma.wallet.aggregate({
      _sum: { balance: true },
      _count: { id: true }
    });

    // Check token consistency
    const tokenSum = await prisma.wallet.aggregate({
      _sum: { tokens: true },
      _count: { id: true }
    });

    // Check database connection
    let dbConnection = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbConnection = true;
    } catch (error) {
      dbConnection = false;
    }

    // Calculate health score
    const healthChecks = [
      ledgerIntegrity,
      negativeWallets === 0,
      negativeTokens === 0,
      pendingTransactions < 10, // Less than 10 pending is OK
      recentFailedTransactions < 5, // Less than 5 failed in last hour is OK
      dbConnection
    ];

    const healthScore = Math.round((healthChecks.filter(Boolean).length / healthChecks.length) * 100);

    const healthStatus = healthScore >= 90 ? 'healthy' : 
                       healthScore >= 70 ? 'warning' : 'critical';

    const healthData = {
      status: healthStatus,
      score: healthScore,
      timestamp: new Date().toISOString(),
      checks: {
        ledgerIntegrity,
        negativeBalances: negativeWallets + negativeTokens,
        pendingTransactions,
        recentFailedTransactions,
        dbConnection
      },
      metrics: {
        totalDebits: totalDebits._sum.amount || 0,
        totalCredits: totalCredits._sum.amount || 0,
        ledgerDifference: Math.abs((totalDebits._sum.amount || 0) - (totalCredits._sum.amount || 0)),
        totalWalletBalance: walletSum._sum.balance || 0,
        totalTokens: tokenSum._sum.tokens || 0,
        activeWallets: walletSum._count.id || 0,
        negativeWallets,
        negativeTokens,
        pendingTransactions,
        recentFailedTransactions
      },
      alerts: []
    };

    // Add alerts for critical issues
    if (negativeWallets > 0) {
      healthData.alerts.push({
        level: 'critical',
        type: 'negative_wallets',
        message: `${negativeWallets} wallets have negative balance`,
        count: negativeWallets
      });
    }

    if (negativeTokens > 0) {
      healthData.alerts.push({
        level: 'critical',
        type: 'negative_tokens',
        message: `${negativeTokens} wallets have negative tokens`,
        count: negativeTokens
      });
    }

    if (!ledgerIntegrity) {
      healthData.alerts.push({
        level: 'critical',
        type: 'ledger_mismatch',
        message: 'Ledger integrity check failed - debits and credits do not match',
        difference: healthData.metrics.ledgerDifference
      });
    }

    if (pendingTransactions > 50) {
      healthData.alerts.push({
        level: 'warning',
        type: 'high_pending',
        message: `${pendingTransactions} pending transactions - system may be overloaded`,
        count: pendingTransactions
      });
    }

    if (recentFailedTransactions > 10) {
      healthData.alerts.push({
        level: 'warning',
        type: 'high_failure_rate',
        message: `${recentFailedTransactions} failed transactions in last hour`,
        count: recentFailedTransactions
      });
    }

    if (!dbConnection) {
      healthData.alerts.push({
        level: 'critical',
        type: 'db_connection',
        message: 'Database connection failed'
      });
    }

    console.log('🏥 FINANCIAL HEALTH CHECK RESULTS:', {
      status: healthStatus,
      score: healthScore,
      alerts: healthData.alerts.length,
      ledgerIntegrity,
      negativeBalances: negativeWallets + negativeTokens,
      pendingTransactions
    });

    // Return appropriate HTTP status based on health
    const httpStatus = healthStatus === 'healthy' ? 200 : 
                     healthStatus === 'warning' ? 200 : 503;

    res.status(httpStatus).json({
      success: true,
      data: healthData
    });

  } catch (error: any) {
    console.error('❌ FINANCIAL HEALTH CHECK ERROR:', error);
    
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      data: {
        status: 'critical',
        score: 0,
        timestamp: new Date().toISOString(),
        error: error.message,
        checks: {
          ledgerIntegrity: false,
          dbConnection: false
        }
      }
    });
  }
});

/**
 * GET /api/health/financial/simple - Simple health check for load balancers
 */
router.get('/financial/simple', async (req: AuthRequest, res: Response) => {
  try {
    // Quick database check
    await prisma.$queryRaw`SELECT 1`;
    
    // Quick negative balance check
    const negativeCount = await prisma.wallet.count({
      where: {
        OR: [
          { balance: { lt: 0 } },
          { tokens: { lt: 0 } }
        ]
      }
    });

    const isHealthy = negativeCount === 0;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      negativeBalances: negativeCount
    });

  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

export default router;
