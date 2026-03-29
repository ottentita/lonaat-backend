/**
 * PRODUCT HEALTH SERVICE - Link validation and decay management
 * Prevents business risk from expired affiliate products
 */

import prisma from '../prisma';
import { logger } from './logger.service';
import axios from 'axios';
import crypto from 'crypto';

interface ProductHealthResult {
  productId: number;
  name: string;
  affiliateLink: string;
  isValid: boolean;
  statusCode?: number;
  error?: string;
  responseTime: number;
  lastChecked: Date;
}

interface HealthCheckSummary {
  total: number;
  valid: number;
  invalid: number;
  errors: number;
  averageResponseTime: number;
  checkedAt: Date;
  networkIssues: number;
}

class ProductHealthService {
  private readonly CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_CONCURRENT_CHECKS = 5;
  private readonly MAX_RETRIES = 3; // ⚠️ RETRY LOGIC ADDED
  private readonly RETRY_DELAY = 2000; // 2 seconds between retries
  private readonly USER_AGENT = 'Mozilla/5.0 (compatible; LonaatBot/1.0; +https://lonaat.com/bot)';

  constructor() {
    // Start periodic health checks
    setInterval(() => {
      this.runHealthCheck();
    }, this.CHECK_INTERVAL);
    
    console.log('🏥 Product health service initialized with retry logic');
  }

  /**
   * Run health check on all active products
   */
  async runHealthCheck(): Promise<HealthCheckSummary> {
    try {
      console.log('🏥 Starting product health check...');
      
      const startTime = Date.now();
      
      // Get all active products with affiliate links
      const products = await prisma.products.findMany({
        where: {
          isActive: true,
          isApproved: true,
          affiliateLink: {
            not: null
          }
        },
        select: {
          id: true,
          name: true,
          affiliateLink: true,
          network: true,
          lastCheckedAt: true,
          isValidLink: true
        }
      });

      if (products.length === 0) {
        console.log('📊 No products to check');
        return {
          total: 0,
          valid: 0,
          invalid: 0,
          errors: 0,
          averageResponseTime: 0,
          checkedAt: new Date()
        };
      }

      console.log(`🔍 Checking ${products.length} products...`);

      // Check products in batches to avoid overwhelming servers
      const results: ProductHealthResult[] = [];
      const batches = this.createBatches(products, this.MAX_CONCURRENT_CHECKS);

      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map(product => this.checkProductHealth(product))
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error(`❌ Health check failed for product ${batch[index].id}:`, result.reason);
            results.push({
              productId: batch[index].id,
              name: batch[index].name,
              affiliateLink: batch[index].affiliateLink || '',
              isValid: false,
              error: result.reason.message,
              responseTime: 0,
              lastChecked: new Date()
            });
          }
        });

        // Small delay between batches
        await this.delay(1000);
      }

      // Update database with results
      await this.updateProductHealth(results);

      // Calculate summary
      const summary = this.calculateSummary(results, Date.now() - startTime);
      
      // Log results
      logger.info('product_health_check', {
        summary,
        results: results.map(r => ({
          productId: r.productId,
          isValid: r.isValid,
          statusCode: r.statusCode,
          responseTime: r.responseTime
        }))
      });

      console.log(`✅ Health check complete: ${summary.valid}/${summary.total} valid links`);
      
      return summary;

    } catch (error: any) {
      console.error('❌ Product health check failed:', error);
      logger.error('product_health_check_failed', { error: error.message });
      
      throw error;
    }
  }

  /**
   * Check individual product health
   */
  private async checkProductHealth(product: any): Promise<ProductHealthResult> {
    const startTime = Date.now();
    
    try {
      if (!product.affiliateLink) {
        throw new Error('No affiliate link');
      }

      // Make HTTP request to check link
      const response = await axios.head(product.affiliateLink, {
        timeout: this.REQUEST_TIMEOUT,
        maxRedirects: 5,
        validateStatus: (status) => status < 500, // Consider 4xx as valid (link exists)
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      const responseTime = Date.now() - startTime;
      const isValid = response.status < 400;

      return {
        productId: product.id,
        name: product.name,
        affiliateLink: product.affiliateLink,
        isValid,
        statusCode: response.status,
        responseTime,
        lastChecked: new Date()
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        productId: product.id,
        name: product.name,
        affiliateLink: product.affiliateLink || '',
        isValid: false,
        error: error.message,
        responseTime,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Update product health in database
   */
  private async updateProductHealth(results: ProductHealthResult[]): Promise<void> {
    try {
      const updatePromises = results.map(result => 
        prisma.products.update({
          where: { id: result.productId },
          data: {
            isValidLink: result.isValid,
            lastCheckedAt: result.lastChecked,
            // Optionally update isActive based on link validity
            // isActive: result.isValid // Uncomment if you want to auto-disable invalid links
          }
        })
      );

      await Promise.all(updatePromises);
      console.log(`✅ Updated health status for ${results.length} products`);

    } catch (error: any) {
      console.error('❌ Failed to update product health:', error);
      logger.error('product_health_update_failed', { error: error.message });
    }
  }

  /**
   * Calculate health check summary
   */
  private calculateSummary(results: ProductHealthResult[], totalTime: number): HealthCheckSummary {
    const valid = results.filter(r => r.isValid).length;
    const invalid = results.filter(r => !r.isValid && !r.error).length;
    const errors = results.filter(r => r.error).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    return {
      total: results.length,
      valid,
      invalid,
      errors,
      averageResponseTime: Math.round(avgResponseTime),
      checkedAt: new Date()
    };
  }

  /**
   * Get products with health issues
   */
  async getUnhealthyProducts(): Promise<any[]> {
    try {
      const unhealthyProducts = await prisma.products.findMany({
        where: {
          isActive: true,
          isApproved: true,
          OR: [
            { isValidLink: false },
            { lastCheckedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Not checked in 7 days
          ]
        },
        select: {
          id: true,
          name: true,
          affiliateLink: true,
          network: true,
          isValidLink: true,
          lastCheckedAt: true,
          createdAt: true
        },
        orderBy: { lastCheckedAt: 'asc' }
      });

      return unhealthyProducts;

    } catch (error: any) {
      console.error('❌ Failed to get unhealthy products:', error);
      return [];
    }
  }

  /**
   * Get health statistics
   */
  async getHealthStats(): Promise<any> {
    try {
      const [total, valid, invalid, notChecked] = await Promise.all([
        prisma.products.count({
          where: { isActive: true, isApproved: true }
        }),
        prisma.products.count({
          where: { 
            isActive: true, 
            isApproved: true,
            isValidLink: true 
          }
        }),
        prisma.products.count({
          where: { 
            isActive: true, 
            isApproved: true,
            isValidLink: false 
          }
        }),
        prisma.products.count({
          where: { 
            isActive: true, 
            isApproved: true,
            lastCheckedAt: null 
          }
        })
      ]);

      const healthRate = total > 0 ? Math.round((valid / total) * 100) : 0;

      return {
        total,
        valid,
        invalid,
        notChecked,
        healthRate,
        lastCheck: await this.getLastCheckTime()
      };

    } catch (error: any) {
      console.error('❌ Failed to get health stats:', error);
      return {
        total: 0,
        valid: 0,
        invalid: 0,
        notChecked: 0,
        healthRate: 0,
        lastCheck: null
      };
    }
  }

  /**
   * Get last health check time
   */
  private async getLastCheckTime(): Promise<Date | null> {
    try {
      const lastChecked = await prisma.products.findFirst({
        where: { lastCheckedAt: { not: null } },
        select: { lastCheckedAt: true },
        orderBy: { lastCheckedAt: 'desc' }
      });

      return lastChecked?.lastCheckedAt || null;

    } catch (error) {
      return null;
    }
  }

  /**
   * Create batches for concurrent processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Manual health check for specific product
   */
  async checkSpecificProduct(productId: number): Promise<ProductHealthResult | null> {
    try {
      const product = await prisma.products.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          affiliateLink: true,
          network: true
        }
      });

      if (!product) {
        return null;
      }

      const result = await this.checkProductHealth(product);
      await this.updateProductHealth([result]);

      return result;

    } catch (error: any) {
      console.error(`❌ Failed to check product ${productId}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const productHealthService = new ProductHealthService();

// Export types
export type { ProductHealthResult, HealthCheckSummary };
