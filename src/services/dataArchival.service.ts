/**
 * DATA ARCHIVAL SERVICE - Analytics storage growth management
 * Archives old data to prevent database bloat and maintain performance
 */

import prisma from '../prisma';
import { logger } from './logger.service';
import fs from 'fs';
import path from 'path';

interface ArchivalResult {
  table: string;
  archivedCount: number;
  deletedCount: number;
  archiveFile: string;
  dateRange: {
    from: Date;
    to: Date;
  };
}

interface ArchivalStats {
  totalTables: number;
  totalArchived: number;
  totalDeleted: number;
  archiveSize: string;
  lastArchival: Date | null;
}

class DataArchivalService {
  private readonly ARCHIVAL_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly RETENTION_DAYS = {
    clicks: 90,      // Keep clicks for 90 days
    conversions: 365, // Keep conversions for 1 year
    errors: 30,       // Keep errors for 30 days
    health: 60        // Keep health logs for 60 days
  };
  private readonly ARCHIVE_DIR = path.join(process.cwd(), 'archives');

  constructor() {
    // Ensure archive directory exists
    this.ensureArchiveDirectory();
    
    // Start periodic archival
    setInterval(() => {
      this.runArchival();
    }, this.ARCHIVAL_INTERVAL);
    
    console.log('📁 Data archival service initialized');
  }

  /**
   * Run archival process for all tables
   */
  async runArchival(): Promise<ArchivalResult[]> {
    try {
      console.log('📁 Starting data archival...');
      
      const startTime = Date.now();
      const results: ArchivalResult[] = [];
      
      // Archive each table type
      const archivalTasks = [
        () => this.archiveClicks(),
        () => this.archiveConversions(),
        () => this.archiveErrors(),
        () => this.archiveHealthLogs()
      ];

      for (const task of archivalTasks) {
        try {
          const result = await task();
          if (result) {
            results.push(result);
          }
        } catch (error: any) {
          console.error('❌ Archival task failed:', error);
          logger.error('archival_task_failed', { error: error.message });
        }
      }

      // Log archival results
      const totalArchived = results.reduce((sum, r) => sum + r.archivedCount, 0);
      const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);
      
      logger.info('data_archival', {
        duration: Date.now() - startTime,
        totalArchived,
        totalDeleted,
        tablesProcessed: results.length,
        results: results.map(r => ({
          table: r.table,
          archivedCount: r.archivedCount,
          deletedCount: r.deletedCount,
          archiveFile: r.archiveFile
        }))
      });

      console.log(`✅ Data archival complete: ${totalArchived} archived, ${totalDeleted} deleted`);
      
      return results;

    } catch (error: any) {
      console.error('❌ Data archival failed:', error);
      logger.error('data_archival_failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Archive click data
   */
  private async archiveClicks(): Promise<ArchivalResult | null> {
    const cutoffDate = new Date(Date.now() - this.RETENTION_DAYS.clicks * 24 * 60 * 60 * 1000);
    
    // Get old clicks to archive
    const oldClicks = await prisma.product_clicks.findMany({
      where: {
        created_at: {
          lt: cutoffDate
        }
      },
      select: {
        id: true,
        product_id: true,
        user_id: true,
        ip_address: true,
        user_agent: true,
        referrer: true,
        fingerprint: true,
        unique_click: true,
        created_at: true
      },
      orderBy: { created_at: 'asc' }
    });

    if (oldClicks.length === 0) {
      return null;
    }

    // Create archive file
    const archiveFile = this.createArchiveFile('clicks', oldClicks);
    
    // Delete archived records
    const deletedCount = await prisma.product_clicks.deleteMany({
      where: {
        created_at: {
          lt: cutoffDate
        }
      }
    });

    return {
      table: 'product_clicks',
      archivedCount: oldClicks.length,
      deletedCount: deletedCount.count,
      archiveFile,
      dateRange: {
        from: oldClicks[0]?.created_at || cutoffDate,
        to: oldClicks[oldClicks.length - 1]?.created_at || cutoffDate
      }
    };
  }

  /**
   * Archive conversion data
   */
  private async archiveConversions(): Promise<ArchivalResult | null> {
    const cutoffDate = new Date(Date.now() - this.RETENTION_DAYS.conversions * 24 * 60 * 60 * 1000);
    
    // Get old conversions to archive
    const oldConversions = await prisma.product_conversions.findMany({
      where: {
        created_at: {
          lt: cutoffDate
        }
      },
      select: {
        id: true,
        product_id: true,
        user_id: true,
        amount: true,
        commission: true,
        revenue: true,
        network: true,
        transaction_id: true,
        source: true,
        ip_address: true,
        created_at: true
      },
      orderBy: { created_at: 'asc' }
    });

    if (oldConversions.length === 0) {
      return null;
    }

    // Create archive file
    const archiveFile = this.createArchiveFile('conversions', oldConversions);
    
    // Delete archived records
    const deletedCount = await prisma.product_conversions.deleteMany({
      where: {
        created_at: {
          lt: cutoffDate
        }
      }
    });

    return {
      table: 'product_conversions',
      archivedCount: oldConversions.length,
      deletedCount: deletedCount.count,
      archiveFile,
      dateRange: {
        from: oldConversions[0]?.created_at || cutoffDate,
        to: oldConversions[oldConversions.length - 1]?.created_at || cutoffDate
      }
    };
  }

  /**
   * Archive error logs (from file system)
   */
  private async archiveErrors(): Promise<ArchivalResult | null> {
    const cutoffDate = new Date(Date.now() - this.RETENTION_DAYS.errors * 24 * 60 * 60 * 1000);
    
    // Read error log file
    const errorLogFile = path.join(process.cwd(), 'logs', 'errors.log');
    
    if (!fs.existsSync(errorLogFile)) {
      return null;
    }

    const errorContent = fs.readFileSync(errorLogFile, 'utf8');
    const errorLines = errorContent.trim().split('\n').filter(line => line.length > 0);
    
    // Filter old errors
    const oldErrors: any[] = [];
    const recentErrors: string[] = [];
    
    for (const line of errorLines) {
      try {
        const logEntry = JSON.parse(line);
        const logDate = new Date(logEntry.timestamp);
        
        if (logDate < cutoffDate) {
          oldErrors.push(logEntry);
        } else {
          recentErrors.push(line);
        }
      } catch {
        // Keep malformed lines in recent logs
        recentErrors.push(line);
      }
    }

    if (oldErrors.length === 0) {
      return null;
    }

    // Create archive file
    const archiveFile = this.createArchiveFile('errors', oldErrors);
    
    // Update error log file with recent errors only
    fs.writeFileSync(errorLogFile, recentErrors.join('\n'), 'utf8');

    return {
      table: 'error_logs',
      archivedCount: oldErrors.length,
      deletedCount: oldErrors.length,
      archiveFile,
      dateRange: {
        from: oldErrors[0]?.timestamp ? new Date(oldErrors[0].timestamp) : cutoffDate,
        to: oldErrors[oldErrors.length - 1]?.timestamp ? new Date(oldErrors[oldErrors.length - 1].timestamp) : cutoffDate
      }
    };
  }

  /**
   * Archive health logs (from file system)
   */
  private async archiveHealthLogs(): Promise<ArchivalResult | null> {
    const cutoffDate = new Date(Date.now() - this.RETENTION_DAYS.health * 24 * 60 * 60 * 1000);
    
    // Read health log file
    const healthLogFile = path.join(process.cwd(), 'logs', 'health.log');
    
    if (!fs.existsSync(healthLogFile)) {
      return null;
    }

    const healthContent = fs.readFileSync(healthLogFile, 'utf8');
    const healthLines = healthContent.trim().split('\n').filter(line => line.length > 0);
    
    // Filter old health logs
    const oldHealthLogs: any[] = [];
    const recentHealthLogs: string[] = [];
    
    for (const line of healthLines) {
      try {
        const logEntry = JSON.parse(line);
        const logDate = new Date(logEntry.timestamp);
        
        if (logDate < cutoffDate) {
          oldHealthLogs.push(logEntry);
        } else {
          recentHealthLogs.push(line);
        }
      } catch {
        // Keep malformed lines in recent logs
        recentHealthLogs.push(line);
      }
    }

    if (oldHealthLogs.length === 0) {
      return null;
    }

    // Create archive file
    const archiveFile = this.createArchiveFile('health', oldHealthLogs);
    
    // Update health log file with recent logs only
    fs.writeFileSync(healthLogFile, recentHealthLogs.join('\n'), 'utf8');

    return {
      table: 'health_logs',
      archivedCount: oldHealthLogs.length,
      deletedCount: oldHealthLogs.length,
      archiveFile,
      dateRange: {
        from: oldHealthLogs[0]?.timestamp ? new Date(oldHealthLogs[0].timestamp) : cutoffDate,
        to: oldHealthLogs[oldHealthLogs.length - 1]?.timestamp ? new Date(oldHealthLogs[oldHealthLogs.length - 1].timestamp) : cutoffDate
      }
    };
  }

  /**
   * Create archive file with data
   */
  private createArchiveFile(type: string, data: any[]): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${type}-archive-${timestamp}.json`;
    const filepath = path.join(this.ARCHIVE_DIR, filename);
    
    const archiveData = {
      metadata: {
        type,
        archivedAt: new Date().toISOString(),
        recordCount: data.length,
        dateRange: {
          from: data[0]?.created_at || data[0]?.timestamp,
          to: data[data.length - 1]?.created_at || data[data.length - 1]?.timestamp
        }
      },
      data
    };
    
    fs.writeFileSync(filepath, JSON.stringify(archiveData, null, 2), 'utf8');
    
    // Compress the file (optional - requires gzip)
    this.compressFile(filepath);
    
    return filename;
  }

  /**
   * Compress archive file
   */
  private compressFile(filepath: string): void {
    // TODO: Implement file compression
    // For now, just log that compression would happen
    console.log(`🗜️ Would compress: ${filepath}`);
  }

  /**
   * Ensure archive directory exists
   */
  private ensureArchiveDirectory(): void {
    try {
      if (!fs.existsSync(this.ARCHIVE_DIR)) {
        fs.mkdirSync(this.ARCHIVE_DIR, { recursive: true });
      }
    } catch (error) {
      console.error('❌ Failed to create archive directory:', error);
    }
  }

  /**
   * Get archival statistics
   */
  async getArchivalStats(): Promise<ArchivalStats> {
    try {
      // Count archive files
      const archiveFiles = fs.readdirSync(this.ARCHIVE_DIR);
      const totalArchiveSize = archiveFiles.reduce((total, file) => {
        const filepath = path.join(this.ARCHIVE_DIR, file);
        const stats = fs.statSync(filepath);
        return total + stats.size;
      }, 0);

      // Get table counts
      const [clicks, conversions] = await Promise.all([
        prisma.product_clicks.count(),
        prisma.product_conversions.count()
      ]);

      // Get last archival time from archive files
      let lastArchival: Date | null = null;
      if (archiveFiles.length > 0) {
        const latestFile = archiveFiles
          .map(file => ({
            file,
            time: fs.statSync(path.join(this.ARCHIVE_DIR, file)).mtime
          }))
          .sort((a, b) => b.time.getTime() - a.time.getTime())[0];
        
        lastArchival = latestFile.time;
      }

      return {
        totalTables: 4, // clicks, conversions, errors, health
        totalArchived: archiveFiles.length,
        totalDeleted: clicks + conversions, // Approximate
        archiveSize: this.formatBytes(totalArchiveSize),
        lastArchival
      };

    } catch (error: any) {
      console.error('❌ Failed to get archival stats:', error);
      return {
        totalTables: 0,
        totalArchived: 0,
        totalDeleted: 0,
        archiveSize: '0 B',
        lastArchival: null
      };
    }
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Manual archival for specific table
   */
  async archiveTable(table: string, daysToKeep?: number): Promise<ArchivalResult | null> {
    try {
      console.log(`📁 Starting manual archival for ${table}...`);
      
      switch (table) {
        case 'clicks':
          return await this.archiveClicks();
        case 'conversions':
          return await this.archiveConversions();
        case 'errors':
          return await this.archiveErrors();
        case 'health':
          return await this.archiveHealthLogs();
        default:
          throw new Error(`Unknown table: ${table}`);
      }
      
    } catch (error: any) {
      console.error(`❌ Manual archival failed for ${table}:`, error);
      logger.error('manual_archival_failed', { table, error: error.message });
      return null;
    }
  }
}

// Export singleton instance
export const dataArchivalService = new DataArchivalService();

// Export types
export type { ArchivalResult, ArchivalStats };
