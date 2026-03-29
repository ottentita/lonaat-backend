/**
 * CLICK MONITORING SERVICE
 * Real-time monitoring and alerting for suspicious click activity
 */

import prisma from '../prisma';
import { logger } from './logger.service';

interface ClickStats {
  totalClicks: number;
  uniqueClicks: number;
  duplicateAttempts: number;
  clicksPerSecond: number;
  topProducts: Array<{ productId: number; clicks: number }>;
  suspiciousIPs: Array<{ ip: string; clicks: number; reason: string }>;
}

interface SuspiciousActivity {
  type: 'high_frequency' | 'duplicate_spam' | 'bot_pattern' | 'ip_rotation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip?: string;
  productId?: number;
  fingerprint?: string;
  details: string;
  timestamp: Date;
}

class ClickMonitoringService {
  private suspiciousActivities: SuspiciousActivity[] = [];
  private clickRates: Map<string, number[]> = new Map();
  
  /**
   * Get real-time click statistics
   */
  async getClickStats(timeWindowMinutes: number = 60): Promise<ClickStats> {
    const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    try {
      // Total clicks in window
      const totalClicks = await prisma.product_clicks.count({
        where: {
          created_at: {
            gte: since
          }
        }
      });

      // Unique clicks (unique_click = true)
      const uniqueClicks = await prisma.product_clicks.count({
        where: {
          created_at: {
            gte: since
          },
          unique_click: true
        }
      });

      // Duplicate attempts (total - unique)
      const duplicateAttempts = totalClicks - uniqueClicks;

      // Clicks per second
      const clicksPerSecond = totalClicks / (timeWindowMinutes * 60);

      // Top products by clicks
      const topProductsRaw = await prisma.product_clicks.groupBy({
        by: ['product_id'],
        where: {
          created_at: {
            gte: since
          }
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      });

      const topProducts = topProductsRaw.map(p => ({
        productId: p.product_id,
        clicks: p._count.id
      }));

      // Suspicious IPs (more than 50 clicks in window)
      const suspiciousIPsRaw = await prisma.product_clicks.groupBy({
        by: ['ip_address'],
        where: {
          created_at: {
            gte: since
          },
          ip_address: {
            not: null
          }
        },
        _count: {
          id: true
        },
        having: {
          id: {
            _count: {
              gt: 50
            }
          }
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      });

      const suspiciousIPs = suspiciousIPsRaw.map(ip => ({
        ip: ip.ip_address || 'unknown',
        clicks: ip._count.id,
        reason: ip._count.id > 100 ? 'Very high frequency' : 'High frequency'
      }));

      return {
        totalClicks,
        uniqueClicks,
        duplicateAttempts,
        clicksPerSecond: Math.round(clicksPerSecond * 100) / 100,
        topProducts,
        suspiciousIPs
      };

    } catch (error) {
      console.error('Error getting click stats:', error);
      throw error;
    }
  }

  /**
   * Detect suspicious patterns in real-time
   */
  async detectSuspiciousActivity(productId: number, ip: string, fingerprint: string): Promise<SuspiciousActivity | null> {
    const now = Date.now();
    const oneMinuteAgo = new Date(now - 60 * 1000);

    try {
      // Check 1: High frequency from same IP
      const recentClicksFromIP = await prisma.product_clicks.count({
        where: {
          ip_address: ip,
          created_at: {
            gte: oneMinuteAgo
          }
        }
      });

      if (recentClicksFromIP > 10) {
        return {
          type: 'high_frequency',
          severity: recentClicksFromIP > 20 ? 'critical' : 'high',
          ip,
          productId,
          details: `${recentClicksFromIP} clicks from same IP in 1 minute`,
          timestamp: new Date()
        };
      }

      // Check 2: Duplicate spam on same product
      const recentClicksOnProduct = await prisma.product_clicks.count({
        where: {
          product_id: productId,
          fingerprint: fingerprint,
          created_at: {
            gte: oneMinuteAgo
          }
        }
      });

      if (recentClicksOnProduct > 1) {
        return {
          type: 'duplicate_spam',
          severity: 'medium',
          ip,
          productId,
          fingerprint,
          details: `${recentClicksOnProduct} duplicate attempts on product ${productId}`,
          timestamp: new Date()
        };
      }

      // Check 3: IP rotation pattern (same fingerprint, different IPs)
      const recentIPsForFingerprint = await prisma.product_clicks.groupBy({
        by: ['ip_address'],
        where: {
          fingerprint: fingerprint,
          created_at: {
            gte: new Date(now - 5 * 60 * 1000) // 5 minutes
          }
        },
        _count: {
          id: true
        }
      });

      if (recentIPsForFingerprint.length > 3) {
        return {
          type: 'ip_rotation',
          severity: 'high',
          fingerprint,
          details: `Same fingerprint from ${recentIPsForFingerprint.length} different IPs`,
          timestamp: new Date()
        };
      }

      return null;

    } catch (error) {
      console.error('Error detecting suspicious activity:', error);
      return null;
    }
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(activity: SuspiciousActivity) {
    this.suspiciousActivities.push(activity);

    // Keep only last 1000 activities
    if (this.suspiciousActivities.length > 1000) {
      this.suspiciousActivities = this.suspiciousActivities.slice(-1000);
    }

    // Log to persistent logger
    logger.warn('suspicious_click_activity', {
      type: activity.type,
      severity: activity.severity,
      ip: activity.ip,
      productId: activity.productId,
      fingerprint: activity.fingerprint?.substring(0, 8),
      details: activity.details,
      timestamp: activity.timestamp
    });

    // Alert on critical severity
    if (activity.severity === 'critical') {
      this.alertCriticalActivity(activity);
    }
  }

  /**
   * Alert on critical suspicious activity
   */
  private alertCriticalActivity(activity: SuspiciousActivity) {
    console.error('🚨 CRITICAL SUSPICIOUS ACTIVITY DETECTED:', {
      type: activity.type,
      ip: activity.ip,
      productId: activity.productId,
      details: activity.details
    });

    // TODO: Send alert to admin (email, Slack, etc.)
    // TODO: Consider auto-blocking IP
  }

  /**
   * Get recent suspicious activities
   */
  getRecentSuspiciousActivities(limit: number = 100): SuspiciousActivity[] {
    return this.suspiciousActivities.slice(-limit).reverse();
  }

  /**
   * Get conversion attribution integrity report
   */
  async getConversionIntegrityReport(): Promise<any> {
    try {
      // Total conversions
      const totalConversions = await prisma.product_conversions.count();

      // Conversions with click attribution
      const conversionsWithClick = await prisma.product_conversions.count({
        where: {
          click_id: {
            not: null
          }
        }
      });

      // Conversions without click (suspicious)
      const conversionsWithoutClick = totalConversions - conversionsWithClick;

      // Orphaned conversions (click_id doesn't exist)
      const orphanedConversions = await prisma.product_conversions.count({
        where: {
          click_id: {
            not: null
          },
          click: null
        }
      });

      return {
        totalConversions,
        conversionsWithClick,
        conversionsWithoutClick,
        orphanedConversions,
        attributionRate: totalConversions > 0 
          ? Math.round((conversionsWithClick / totalConversions) * 100) 
          : 0,
        integrity: orphanedConversions === 0 && conversionsWithoutClick === 0 
          ? 'Good' 
          : orphanedConversions > 0 
            ? 'Poor' 
            : 'Fair'
      };

    } catch (error) {
      console.error('Error getting conversion integrity report:', error);
      throw error;
    }
  }

  /**
   * Get click fraud detection summary
   */
  async getFraudDetectionSummary(hours: number = 24): Promise<any> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      const stats = await this.getClickStats(hours * 60);
      
      const fraudScore = this.calculateFraudScore(stats);
      
      return {
        timeWindow: `${hours} hours`,
        totalClicks: stats.totalClicks,
        uniqueClicks: stats.uniqueClicks,
        duplicateAttempts: stats.duplicateAttempts,
        duplicateRate: stats.totalClicks > 0 
          ? Math.round((stats.duplicateAttempts / stats.totalClicks) * 100) 
          : 0,
        clicksPerSecond: stats.clicksPerSecond,
        suspiciousIPs: stats.suspiciousIPs.length,
        fraudScore: fraudScore,
        fraudLevel: this.getFraudLevel(fraudScore),
        recentSuspiciousActivities: this.getRecentSuspiciousActivities(10)
      };

    } catch (error) {
      console.error('Error getting fraud detection summary:', error);
      throw error;
    }
  }

  /**
   * Calculate fraud score (0-100)
   */
  private calculateFraudScore(stats: ClickStats): number {
    let score = 0;

    // High duplicate rate
    const duplicateRate = stats.totalClicks > 0 
      ? (stats.duplicateAttempts / stats.totalClicks) * 100 
      : 0;
    
    if (duplicateRate > 50) score += 40;
    else if (duplicateRate > 30) score += 25;
    else if (duplicateRate > 10) score += 10;

    // High clicks per second
    if (stats.clicksPerSecond > 10) score += 30;
    else if (stats.clicksPerSecond > 5) score += 20;
    else if (stats.clicksPerSecond > 2) score += 10;

    // Suspicious IPs
    if (stats.suspiciousIPs.length > 10) score += 30;
    else if (stats.suspiciousIPs.length > 5) score += 20;
    else if (stats.suspiciousIPs.length > 2) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Get fraud level from score
   */
  private getFraudLevel(score: number): string {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Low';
    return 'Minimal';
  }
}

// Export singleton instance
export const clickMonitoringService = new ClickMonitoringService();

export default clickMonitoringService;
