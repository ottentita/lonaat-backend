/**
 * Production Logger with Persistence
 * For monitoring fallback frequency, failed API calls, and unusual patterns
 */

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: 'token-balance-fallback' | 'rate-limit' | 'api-failure' | 'unusual-pattern';
  userId?: string;
  ip?: string;
  message: string;
  details?: any;
  userAgent?: string;
}

class ProductionLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory
  
  // In production, this would write to database or external service
  async log(entry: Omit<LogEntry, 'timestamp'>): Promise<void> {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      ...entry
    };
    
    // Add to memory buffer
    this.logs.push(logEntry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Console output for now
    const emoji = this.getEmoji(entry.level);
    console.log(`${emoji} [${entry.category.toUpperCase()}] ${entry.message}`, {
      userId: entry.userId,
      ip: entry.ip,
      details: entry.details
    });
    
    // In production, send to external service
    // await this.sendToMonitoring(logEntry);
  }
  
  async info(category: LogEntry['category'], message: string, details?: any, context?: Partial<Pick<LogEntry, 'userId' | 'ip' | 'userAgent'>>): Promise<void> {
    await this.log({ level: 'info', category, message, details, ...context });
  }
  
  async warn(category: LogEntry['category'], message: string, details?: any, context?: Partial<Pick<LogEntry, 'userId' | 'ip' | 'userAgent'>>): Promise<void> {
    await this.log({ level: 'warn', category, message, details, ...context });
  }
  
  async error(category: LogEntry['category'], message: string, details?: any, context?: Partial<Pick<LogEntry, 'userId' | 'ip' | 'userAgent'>>): Promise<void> {
    await this.log({ level: 'error', category, message, details, ...context });
  }
  
  // Get recent logs for monitoring
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }
  
  // Get logs by category
  getLogsByCategory(category: LogEntry['category'], count: number = 50): LogEntry[] {
    return this.logs
      .filter(log => log.category === category)
      .slice(-count);
  }
  
  // Get fallback frequency (for monitoring)
  getFallbackFrequency(minutes: number = 60): number {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    const fallbackLogs = this.logs.filter(log => 
      log.category === 'token-balance-fallback' && 
      new Date(log.timestamp) > since
    );
    return fallbackLogs.length;
  }
  
  private getEmoji(level: LogEntry['level']): string {
    switch (level) {
      case 'info': return 'ℹ️';
      case 'warn': return '⚠️';
      case 'error': return '❌';
      default: return '📝';
    }
  }
  
  // In production, this would send to external monitoring service
  private async sendToMonitoring(logEntry: LogEntry): Promise<void> {
    // Example implementations:
    // - Send to Datadog, New Relic, etc.
    // - Write to database table
    // - Send to webhook
    // console.log('📊 Sending to monitoring service:', logEntry);
  }
}

export const productionLogger = new ProductionLogger();

// Convenience functions
export const logFallback = (userId: string, reason: string, details?: any) => 
  productionLogger.warn('token-balance-fallback', 'Backend fallback triggered', { reason, ...details }, { userId });

export const logRateLimit = (userId: string, ip: string, userAgent?: string) => 
  productionLogger.warn('rate-limit', 'Rate limit exceeded', undefined, { userId, ip, userAgent });

export const logApiFailure = (endpoint: string, error: any, userId?: string) => 
  productionLogger.error('api-failure', `API failure: ${endpoint}`, { error }, { userId });

export const logUnusualPattern = (pattern: string, details: any, userId?: string) => 
  productionLogger.warn('unusual-pattern', `Unusual pattern detected: ${pattern}`, details, { userId });
