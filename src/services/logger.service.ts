/**
 * PERSISTENT LOGGER SERVICE
 * Replaces console.log with file-based logging
 * Prevents log loss after restart
 */

import fs from 'fs';
import path from 'path';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  event: string;
  data: any;
  ip?: string;
  userId?: string;
  sessionId?: string;
}

class LoggerService {
  private logDir: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private maxFiles: number = 5;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
    this.setupLogRotation();
    
    console.log('📝 Persistent logger service initialized');
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('❌ Failed to create log directory:', error);
    }
  }

  /**
   * Setup log rotation
   */
  private setupLogRotation(): void {
    // Check and rotate logs every hour
    setInterval(() => {
      this.rotateLogs();
    }, 60 * 60 * 1000);
  }

  /**
   * Write log entry to file
   */
  private writeLog(entry: LogEntry): void {
    try {
      const logFile = path.join(this.logDir, 'events.log');
      const logLine = JSON.stringify(entry) + '\n';
      
      // Check file size and rotate if needed
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        if (stats.size > this.maxFileSize) {
          this.rotateLog('events.log');
        }
      }
      
      fs.appendFileSync(logFile, logLine, 'utf8');
    } catch (error) {
      console.error('❌ Failed to write log:', error);
    }
  }

  /**
   * Rotate log files
   */
  private rotateLog(filename: string): void {
    try {
      const logFile = path.join(this.logDir, filename);
      
      // Shift existing log files
      for (let i = this.maxFiles - 1; i > 0; i--) {
        const oldFile = path.join(this.logDir, `${filename}.${i}`);
        const newFile = path.join(this.logDir, `${filename}.${i + 1}`);
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            fs.unlinkSync(oldFile); // Delete oldest
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }
      
      // Move current log to .1
      if (fs.existsSync(logFile)) {
        fs.renameSync(logFile, path.join(this.logDir, `${filename}.1`));
      }
    } catch (error) {
      console.error('❌ Failed to rotate log:', error);
    }
  }

  /**
   * Rotate all log files
   */
  private rotateLogs(): void {
    this.rotateLog('events.log');
    this.rotateLog('errors.log');
    this.rotateLog('clicks.log');
    this.rotateLog('conversions.log');
  }

  /**
   * Create log entry
   */
  private createLogEntry(level: LogEntry['level'], event: string, data: any, additional?: Partial<LogEntry>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      event,
      data,
      ...additional
    };
  }

  /**
   * Info level logging
   */
  info(event: string, data: any, additional?: Partial<LogEntry>): void {
    const entry = this.createLogEntry('info', event, data, additional);
    this.writeLog(entry);
    
    // Also log to console for development
    console.log(`📝 [INFO] ${event}:`, data);
  }

  /**
   * Warning level logging
   */
  warn(event: string, data: any, additional?: Partial<LogEntry>): void {
    const entry = this.createLogEntry('warn', event, data, additional);
    this.writeLog(entry);
    
    console.warn(`⚠️ [WARN] ${event}:`, data);
  }

  /**
   * Error level logging
   */
  error(event: string, data: any, additional?: Partial<LogEntry>): void {
    const entry = this.createLogEntry('error', event, data, additional);
    
    // Write to both general log and error log
    this.writeLog(entry);
    
    try {
      const errorLogFile = path.join(this.logDir, 'errors.log');
      const errorLogLine = JSON.stringify(entry) + '\n';
      
      if (fs.existsSync(errorLogFile)) {
        const stats = fs.statSync(errorLogFile);
        if (stats.size > this.maxFileSize) {
          this.rotateLog('errors.log');
        }
      }
      
      fs.appendFileSync(errorLogFile, errorLogLine, 'utf8');
    } catch (error) {
      console.error('❌ Failed to write error log:', error);
    }
    
    console.error(`❌ [ERROR] ${event}:`, data);
  }

  /**
   * Debug level logging
   */
  debug(event: string, data: any, additional?: Partial<LogEntry>): void {
    if (process.env.NODE_ENV === 'development') {
      const entry = this.createLogEntry('debug', event, data, additional);
      this.writeLog(entry);
      
      console.debug(`🐛 [DEBUG] ${event}:`, data);
    }
  }

  /**
   * Specialized logging methods for common events
   */

  /**
   * Log click events
   */
  logClick(productId: number, ip: string, fingerprint: string, unique: boolean, additional?: any): void {
    const clickData = {
      productId,
      ip: ip.substring(0, 10) + '...', // Truncate for privacy
      fingerprint: fingerprint.substring(0, 20) + '...',
      unique,
      ...additional
    };

    this.info('click', clickData, { ip });
    
    // Also write to dedicated click log
    try {
      const clickLogFile = path.join(this.logDir, 'clicks.log');
      const clickEntry = this.createLogEntry('info', 'click', clickData, { ip });
      const clickLogLine = JSON.stringify(clickEntry) + '\n';
      
      fs.appendFileSync(clickLogFile, clickLogLine, 'utf8');
    } catch (error) {
      console.error('❌ Failed to write click log:', error);
    }
  }

  /**
   * Log conversion events
   */
  logConversion(productId: number, revenue: number, network: string, additional?: any): void {
    const conversionData = {
      productId,
      revenue,
      network,
      ...additional
    };

    this.info('conversion', conversionData);
    
    // Also write to dedicated conversion log
    try {
      const conversionLogFile = path.join(this.logDir, 'conversions.log');
      const conversionEntry = this.createLogEntry('info', 'conversion', conversionData);
      const conversionLogLine = JSON.stringify(conversionEntry) + '\n';
      
      fs.appendFileSync(conversionLogFile, conversionLogLine, 'utf8');
    } catch (error) {
      console.error('❌ Failed to write conversion log:', error);
    }
  }

  /**
   * Log API requests
   */
  logRequest(method: string, url: string, ip: string, statusCode: number, responseTime: number): void {
    const requestData = {
      method,
      url,
      statusCode,
      responseTime,
      ip: ip.substring(0, 10) + '...'
    };

    this.info('api_request', requestData, { ip });
  }

  /**
   * Log security events
   */
  logSecurity(event: string, ip: string, details: any): void {
    const securityData = {
      event,
      ip: ip.substring(0, 10) + '...',
      details,
      timestamp: new Date().toISOString()
    };

    this.warn('security', securityData, { ip });
    
    // Also write to dedicated security log
    try {
      const securityLogFile = path.join(this.logDir, 'security.log');
      const securityEntry = this.createLogEntry('warn', 'security', securityData, { ip });
      const securityLogLine = JSON.stringify(securityEntry) + '\n';
      
      fs.appendFileSync(securityLogFile, securityLogLine, 'utf8');
    } catch (error) {
      console.error('❌ Failed to write security log:', error);
    }
  }

  /**
   * Get recent logs (for debugging)
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    try {
      const logFile = path.join(this.logDir, 'events.log');
      if (!fs.existsSync(logFile)) {
        return [];
      }

      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      const recentLines = lines.slice(-count);
      
      return recentLines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(entry => entry !== null);
    } catch (error) {
      console.error('❌ Failed to read recent logs:', error);
      return [];
    }
  }

  /**
   * Get log statistics
   */
  getLogStats(): any {
    try {
      const logFiles = ['events.log', 'errors.log', 'clicks.log', 'conversions.log', 'security.log'];
      const stats: any = {};

      for (const file of logFiles) {
        const filePath = path.join(this.logDir, file);
        if (fs.existsSync(filePath)) {
          const fileStats = fs.statSync(filePath);
          stats[file] = {
            size: fileStats.size,
            modified: fileStats.mtime,
            lines: this.countLines(filePath)
          };
        } else {
          stats[file] = { size: 0, lines: 0 };
        }
      }

      return stats;
    } catch (error) {
      console.error('❌ Failed to get log stats:', error);
      return {};
    }
  }

  /**
   * Count lines in a file
   */
  private countLines(filePath: string): number {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n').filter(line => line.length > 0).length;
    } catch {
      return 0;
    }
  }
}

// Export singleton instance
export const logger = new LoggerService();

// Export types
export type { LogEntry };
