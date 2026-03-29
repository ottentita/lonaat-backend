/**
 * ENHANCED MONITORING SERVICE - Basic monitoring for marketplace
 * Tracks key metrics: clicks/min, errors/min, conversion rate
 */

interface MonitoringMetrics {
  clicksPerMinute: number;
  errorsPerMinute: number;
  conversionRate: number;
  totalClicks: number;
  totalConversions: number;
  totalErrors: number;
  uptime: number;
  lastReset: number;
}

class MonitoringService {
  private metrics: MonitoringMetrics = {
    clicksPerMinute: 0,
    errorsPerMinute: 0,
    conversionRate: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalErrors: 0,
    uptime: Date.now(),
    lastReset: Date.now()
  };

  private clickTimestamps: number[] = [];
  private errorTimestamps: number[] = [];
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute
  private readonly RESET_INTERVAL = 300000; // 5 minutes for rate calculations

  constructor() {
    // Start cleanup interval
    setInterval(() => {
      this.cleanupOldTimestamps();
      this.calculateRates();
    }, this.CLEANUP_INTERVAL);

    // Start reset interval for rate calculations
    setInterval(() => {
      this.resetRateCounters();
    }, this.RESET_INTERVAL);

    console.log('📊 Enhanced monitoring service initialized');
  }

  /**
   * Track a click event
   */
  trackClick(productId: number, ip: string, unique: boolean): void {
    const now = Date.now();
    this.clickTimestamps.push(now);
    this.metrics.totalClicks++;

    // 📊 BASIC MONITORING LOGS
    console.log({
      event: 'click',
      productId,
      ip: ip.substring(0, 10) + '...',
      unique,
      time: now,
      totalClicks: this.metrics.totalClicks
    });
  }

  /**
   * Track a conversion event
   */
  trackConversion(productId: number, revenue: number, network: string): void {
    const now = Date.now();
    this.metrics.totalConversions++;

    // 📊 BASIC MONITORING LOGS
    console.log({
      event: 'conversion',
      productId,
      revenue,
      network,
      time: now,
      totalConversions: this.metrics.totalConversions,
      conversionRate: this.calculateConversionRate()
    });

    // Update conversion rate immediately
    this.calculateRates();
  }

  /**
   * Track an error event
   */
  trackError(error: string, context?: string): void {
    const now = Date.now();
    this.errorTimestamps.push(now);
    this.metrics.totalErrors++;

    // 📊 BASIC MONITORING LOGS
    console.log({
      event: 'error',
      error: error.substring(0, 100),
      context,
      time: now,
      totalErrors: this.metrics.totalErrors
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): MonitoringMetrics {
    this.calculateRates();
    return { ...this.metrics };
  }

  /**
   * Get detailed monitoring report
   */
  getMonitoringReport(): any {
    const now = Date.now();
    const uptime = now - this.metrics.uptime;

    return {
      timestamp: now,
      uptime: uptime,
      uptimeFormatted: this.formatUptime(uptime),
      rates: {
        clicksPerMinute: this.metrics.clicksPerMinute,
        errorsPerMinute: this.metrics.errorsPerMinute,
        conversionRate: this.metrics.conversionRate
      },
      totals: {
        clicks: this.metrics.totalClicks,
        conversions: this.metrics.totalConversions,
        errors: this.metrics.totalErrors
      },
      performance: {
        avgClicksPerMinute: this.metrics.totalClicks / (uptime / 60000),
        avgErrorsPerMinute: this.metrics.totalErrors / (uptime / 60000),
        overallConversionRate: this.calculateConversionRate()
      },
      health: {
        status: this.getHealthStatus(),
        score: this.calculateHealthScore()
      }
    };
  }

  /**
   * Cleanup old timestamps (older than 1 minute)
   */
  private cleanupOldTimestamps(): void {
    const now = Date.now();
    const oneMinuteAgo = now - this.CLEANUP_INTERVAL;

    this.clickTimestamps = this.clickTimestamps.filter(timestamp => timestamp > oneMinuteAgo);
    this.errorTimestamps = this.errorTimestamps.filter(timestamp => timestamp > oneMinuteAgo);
  }

  /**
   * Calculate current rates
   */
  private calculateRates(): void {
    this.metrics.clicksPerMinute = this.clickTimestamps.length;
    this.metrics.errorsPerMinute = this.errorTimestamps.length;
    this.metrics.conversionRate = this.calculateConversionRate();
  }

  /**
   * Calculate conversion rate
   */
  private calculateConversionRate(): number {
    if (this.metrics.totalClicks === 0) return 0;
    return Math.round((this.metrics.totalConversions / this.metrics.totalClicks) * 10000) / 100; // 2 decimal places
  }

  /**
   * Reset rate counters
   */
  private resetRateCounters(): void {
    this.metrics.lastReset = Date.now();
    
    // Log periodic summary
    console.log('📊 MONITORING SUMMARY:', {
      clicksPerMinute: this.metrics.clicksPerMinute,
      errorsPerMinute: this.metrics.errorsPerMinute,
      conversionRate: this.metrics.conversionRate,
      totalClicks: this.metrics.totalClicks,
      totalConversions: this.metrics.totalConversions,
      totalErrors: this.metrics.totalErrors
    });
  }

  /**
   * Get health status
   */
  private getHealthStatus(): string {
    if (this.metrics.errorsPerMinute > 10) return 'critical';
    if (this.metrics.errorsPerMinute > 5) return 'warning';
    if (this.metrics.conversionRate === 0 && this.metrics.totalClicks > 100) return 'warning';
    return 'healthy';
  }

  /**
   * Calculate health score (0-100)
   */
  private calculateHealthScore(): number {
    let score = 100;

    // Deduct points for errors
    if (this.metrics.errorsPerMinute > 10) score -= 30;
    else if (this.metrics.errorsPerMinute > 5) score -= 15;
    else if (this.metrics.errorsPerMinute > 1) score -= 5;

    // Deduct points for zero conversion rate (if we have clicks)
    if (this.metrics.conversionRate === 0 && this.metrics.totalClicks > 50) score -= 20;

    // Bonus points for good conversion rate
    if (this.metrics.conversionRate > 5) score += 10;
    else if (this.metrics.conversionRate > 2) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Format uptime for human readable output
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Reset all metrics (for testing or manual reset)
   */
  resetMetrics(): void {
    this.metrics = {
      clicksPerMinute: 0,
      errorsPerMinute: 0,
      conversionRate: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalErrors: 0,
      uptime: Date.now(),
      lastReset: Date.now()
    };
    this.clickTimestamps = [];
    this.errorTimestamps = [];
    console.log('📊 Enhanced monitoring metrics reset');
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();

// Export types
export type { MonitoringMetrics };
