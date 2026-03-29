/**
 * MONITORING SERVICE - REAL ALERTS
 * Tracks critical metrics and triggers alerts when thresholds exceeded
 */

import { prisma } from '../prisma';

interface MetricData {
  metric: string;
  value?: number;
  userId?: number;
  details?: any;
}

interface AlertThreshold {
  metric: string;
  threshold: number;
  windowMinutes: number;
  condition: 'gt' | 'lt' | 'eq';
}

class MonitoringService {
  private alertThresholds: AlertThreshold[] = [
    // Token balance fallback rate > 5% over 5 minutes
    { metric: 'token_balance_fallback', threshold: 5, windowMinutes: 5, condition: 'gt' },
    
    // Withdrawal failure rate > 10% over 5 minutes  
    { metric: 'wallet_withdraw_fail', threshold: 10, windowMinutes: 5, condition: 'gt' },
    
    // Idempotency hit rate > 20% over 5 minutes (indicates retries)
    { metric: 'idempotency_hit', threshold: 20, windowMinutes: 5, condition: 'gt' },
    
    // API error rate > 15% over 5 minutes
    { metric: 'api_error', threshold: 15, windowMinutes: 5, condition: 'gt' },
    
    // Rate limit hits > 50 per minute
    { metric: 'rate_limit_hit', threshold: 50, windowMinutes: 1, condition: 'gt' }
  ];

  /**
   * Increment metric counter
   */
  async incrementMetric(metric: string, userId?: number, details?: any): Promise<void> {
    try {
      await prisma.monitoringMetrics.create({
        data: {
          metric,
          value: 1,
          userId,
          details: details ? JSON.stringify(details) : null,
          createdAt: new Date()
        }
      });

      // Check for alerts
      await this.checkAlerts(metric);
    } catch (error) {
      console.error('❌ Failed to increment metric:', error);
    }
  }

  /**
   * Check if any alert thresholds are exceeded
   */
  private async checkAlerts(metric: string): Promise<void> {
    for (const threshold of this.alertThresholds) {
      if (threshold.metric === metric) {
        const isAlert = await this.evaluateThreshold(threshold);
        if (isAlert) {
          await this.triggerAlert(threshold);
        }
      }
    }
  }

  /**
   * Evaluate if threshold is exceeded
   */
  private async evaluateThreshold(threshold: AlertThreshold): Promise<boolean> {
    try {
      const since = new Date(Date.now() - threshold.windowMinutes * 60 * 1000);
      
      const result = await prisma.monitoringMetrics.aggregate({
        where: {
          metric: threshold.metric,
          createdAt: { gte: since }
        },
        _sum: { value: true },
        _count: { id: true }
      });

      const totalCount = result._count.id || 0;
      const totalValue = result._sum.value || 0;
      
      // Calculate rate if we have total requests
      const rate = totalCount > 0 ? (totalValue / totalCount) * 100 : totalValue;

      switch (threshold.condition) {
        case 'gt':
          return rate > threshold.threshold;
        case 'lt':
          return rate < threshold.threshold;
        case 'eq':
          return rate === threshold.threshold;
        default:
          return false;
      }
    } catch (error) {
      console.error('❌ Failed to evaluate threshold:', error);
      return false;
    }
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(threshold: AlertThreshold): Promise<void> {
    const alertKey = `alert_${threshold.metric}_${threshold.windowMinutes}min`;
    
    // Prevent alert spam - only alert once per 10 minutes
    const recentAlert = await prisma.monitoringMetrics.findFirst({
      where: {
        metric: alertKey,
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }
      }
    });

    if (recentAlert) return; // Already alerted recently

    console.error(`🚨 ALERT TRIGGERED: ${threshold.metric} threshold exceeded!`);
    console.error(`   Threshold: ${threshold.threshold}% over ${threshold.windowMinutes} minutes`);
    
    // Log alert for monitoring
    await prisma.monitoringMetrics.create({
      data: {
        metric: alertKey,
        value: 1,
        details: JSON.stringify({
          threshold,
          triggeredAt: new Date().toISOString()
        })
      }
    });

    // In production, send to monitoring service
    // await this.sendToAlertingService(threshold);
  }

  /**
   * Get metrics for dashboard
   */
  async getMetrics(minutes: number = 60): Promise<any> {
    try {
      const since = new Date(Date.now() - minutes * 60 * 1000);
      
      const metrics = await prisma.monitoringMetrics.groupBy({
        by: ['metric'],
        where: {
          createdAt: { gte: since }
        },
        _sum: { value: true },
        _count: { id: true }
      });

      return metrics.map(m => ({
        metric: m.metric,
        count: m._count.id,
        totalValue: m._sum.value || 0,
        rate: m._count.id > 0 ? ((m._sum.value || 0) / m._count.id) * 100 : 0
      }));
    } catch (error) {
      console.error('❌ Failed to get metrics:', error);
      return [];
    }
  }

  /**
   * Get user-specific metrics
   */
  async getUserMetrics(userId: number, minutes: number = 60): Promise<any> {
    try {
      const since = new Date(Date.now() - minutes * 60 * 1000);
      
      const metrics = await prisma.monitoringMetrics.groupBy({
        by: ['metric'],
        where: {
          userId,
          createdAt: { gte: since }
        },
        _sum: { value: true },
        _count: { id: true }
      });

      return metrics.map(m => ({
        metric: m.metric,
        count: m._count.id,
        totalValue: m._sum.value || 0
      }));
    } catch (error) {
      console.error('❌ Failed to get user metrics:', error);
      return [];
    }
  }

  /**
   * Clean up old metrics (run via cron)
   */
  async cleanupOldMetrics(days: number = 7): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const result = await prisma.monitoringMetrics.deleteMany({
        where: {
          createdAt: { lt: cutoff }
        }
      });

      console.log(`🧹 Cleaned up ${result.count} old monitoring metrics`);
    } catch (error) {
      console.error('❌ Metric cleanup error:', error);
    }
  }
}

// Singleton instance
export const monitoringService = new MonitoringService();

// Convenience functions
export const logTokenFallback = (userId?: number, details?: any) => 
  monitoringService.incrementMetric('token_balance_fallback', userId, details);

export const logWithdrawFail = (userId?: number, details?: any) => 
  monitoringService.incrementMetric('wallet_withdraw_fail', userId, details);

export const logIdempotencyHit = (userId?: number, details?: any) => 
  monitoringService.incrementMetric('idempotency_hit', userId, details);

export const logApiError = (endpoint: string, userId?: number, details?: any) => 
  monitoringService.incrementMetric('api_error', userId, { endpoint, ...details });

export const logRateLimitHit = (userId?: number, details?: any) => 
  monitoringService.incrementMetric('rate_limit_hit', userId, details);
