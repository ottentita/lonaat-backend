/**
 * COMMISSION SYNC SERVICE - Prevent commission drift
 * Periodic commission rate validation and sync with affiliate networks
 */

import prisma from '../prisma';
import { logger } from './logger.service';
import axios from 'axios';

interface CommissionSyncResult {
  productId: number;
  name: string;
  network: string;
  oldCommission: number;
  newCommission: number;
  synced: boolean;
  error?: string;
}

interface NetworkCommissionData {
  productId: string;
  commission: number;
  currency?: string;
  lastUpdated: string;
}

class CommissionSyncService {
  private readonly SYNC_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly API_TIMEOUT = 30000; // 30 seconds
  private readonly COMMISSION_DRIFT_THRESHOLD = 0.1; // 10% drift threshold

  constructor() {
    // Start periodic commission sync
    setInterval(() => {
      this.runCommissionSync();
    }, this.SYNC_INTERVAL);
    
    console.log('💰 Commission sync service initialized');
  }

  /**
   * Run commission sync for all products
   */
  async runCommissionSync(): Promise<void> {
    try {
      console.log('💰 Starting commission sync...');
      
      const startTime = Date.now();
      
      // Get all products with commission data
      const products = await prisma.products.findMany({
        where: {
          isActive: true,
          isApproved: true,
          commission: {
            not: null
          },
          network: {
            not: null
          },
          externalId: {
            not: null
          }
        },
        select: {
          id: true,
          name: true,
          network: true,
          commission: true,
          externalId: true,
          lastCheckedAt: true
        }
      });

      if (products.length === 0) {
        console.log('📊 No products with commission data to sync');
        return;
      }

      console.log(`🔍 Syncing commission for ${products.length} products...`);

      // Group products by network
      const productsByNetwork = this.groupByNetwork(products);
      
      let totalSynced = 0;
      let totalErrors = 0;
      const syncResults: CommissionSyncResult[] = [];

      // Sync each network
      for (const [network, networkProducts] of Object.entries(productsByNetwork)) {
        try {
          const networkResults = await this.syncNetworkCommission(network, networkProducts);
          syncResults.push(...networkResults);
          
          totalSynced += networkResults.filter(r => r.synced).length;
          totalErrors += networkResults.filter(r => r.error).length;
          
          console.log(`✅ ${network}: ${networkResults.filter(r => r.synced).length}/${networkProducts.length} synced`);
          
          // Delay between networks to avoid rate limiting
          await this.delay(2000);
          
        } catch (error: any) {
          console.error(`❌ Failed to sync ${network}:`, error);
          totalErrors += networkProducts.length;
          
          // Add error results for all products in this network
          networkProducts.forEach(product => {
            syncResults.push({
              productId: product.id,
              name: product.name,
              network: product.network!,
              oldCommission: product.commission || 0,
              newCommission: product.commission || 0,
              synced: false,
              error: error.message
            });
          });
        }
      }

      // Log sync results
      logger.info('commission_sync', {
        total: products.length,
        synced: totalSynced,
        errors: totalErrors,
        duration: Date.now() - startTime,
        results: syncResults.map(r => ({
          productId: r.productId,
          network: r.network,
          synced: r.synced,
          commissionChange: r.newCommission - r.oldCommission
        }))
      });

      console.log(`✅ Commission sync complete: ${totalSynced}/${products.length} synced`);
      
      // Notify about significant commission changes
      await this.notifyCommissionChanges(syncResults);

    } catch (error: any) {
      console.error('❌ Commission sync failed:', error);
      logger.error('commission_sync_failed', { error: error.message });
    }
  }

  /**
   * Sync commission for a specific network
   */
  private async syncNetworkCommission(network: string, products: any[]): Promise<CommissionSyncResult[]> {
    const results: CommissionSyncResult[] = [];
    
    try {
      // Get commission data from network API
      const networkData = await this.fetchNetworkCommissionData(network, products);
      
      for (const product of products) {
        try {
          const networkCommission = networkData.find(d => d.productId === product.externalId);
          
          if (!networkCommission) {
            results.push({
              productId: product.id,
              name: product.name,
              network: product.network!,
              oldCommission: product.commission || 0,
              newCommission: product.commission || 0,
              synced: false,
              error: 'Product not found in network data'
            });
            continue;
          }

          const oldCommission = product.commission || 0;
          const newCommission = networkCommission.commission;
          
          // Check if commission has drifted significantly
          const drift = Math.abs((newCommission - oldCommission) / oldCommission);
          
          if (drift > this.COMMISSION_DRIFT_THRESHOLD) {
            // Update commission in database
            await prisma.products.update({
              where: { id: product.id },
              data: {
                commission: newCommission,
                lastCheckedAt: new Date()
              }
            });
            
            results.push({
              productId: product.id,
              name: product.name,
              network: product.network!,
              oldCommission,
              newCommission,
              synced: true
            });
            
            console.log(`💰 Updated commission for ${product.name}: ${oldCommission} → ${newCommission}`);
            
          } else {
            // No significant change
            results.push({
              productId: product.id,
              name: product.name,
              network: product.network!,
              oldCommission,
              newCommission,
              synced: true
            });
          }
          
        } catch (error: any) {
          console.error(`❌ Failed to sync product ${product.id}:`, error);
          results.push({
            productId: product.id,
            name: product.name,
            network: product.network!,
            oldCommission: product.commission || 0,
            newCommission: product.commission || 0,
            synced: false,
            error: error.message
          });
        }
      }
      
    } catch (error: any) {
      console.error(`❌ Failed to fetch ${network} commission data:`, error);
      
      // Add error results for all products
      products.forEach(product => {
        results.push({
          productId: product.id,
          name: product.name,
          network: product.network!,
          oldCommission: product.commission || 0,
          newCommission: product.commission || 0,
          synced: false,
          error: error.message
        });
      });
    }
    
    return results;
  }

  /**
   * Fetch commission data from network API
   */
  private async fetchNetworkCommissionData(network: string, products: any[]): Promise<NetworkCommissionData[]> {
    switch (network.toLowerCase()) {
      case 'admitad':
        return this.fetchAdmitadCommissionData(products);
      case 'digistore24':
        return this.fetchDigistoreCommissionData(products);
      case 'jvzoo':
        return this.fetchJVZooCommissionData(products);
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  }

  /**
   * Fetch Admitad commission data
   */
  private async fetchAdmitadCommissionData(products: any[]): Promise<NetworkCommissionData[]> {
    // TODO: Implement Admitad API integration
    // For now, return mock data
    console.log('⚠️ Admitad commission sync not implemented - using mock data');
    
    return products.map(product => ({
      productId: product.externalId,
      commission: product.commission || Math.random() * 50, // Mock commission
      currency: 'USD',
      lastUpdated: new Date().toISOString()
    }));
  }

  /**
   * Fetch Digistore24 commission data
   */
  private async fetchDigistoreCommissionData(products: any[]): Promise<NetworkCommissionData[]> {
    // TODO: Implement Digistore24 API integration
    console.log('⚠️ Digistore24 commission sync not implemented - using mock data');
    
    return products.map(product => ({
      productId: product.externalId,
      commission: product.commission || Math.random() * 50, // Mock commission
      currency: 'EUR',
      lastUpdated: new Date().toISOString()
    }));
  }

  /**
   * Fetch JVZoo commission data
   */
  private async fetchJVZooCommissionData(products: any[]): Promise<NetworkCommissionData[]> {
    // TODO: Implement JVZoo API integration
    console.log('⚠️ JVZoo commission sync not implemented - using mock data');
    
    return products.map(product => ({
      productId: product.externalId,
      commission: product.commission || Math.random() * 50, // Mock commission
      currency: 'USD',
      lastUpdated: new Date().toISOString()
    }));
  }

  /**
   * Notify about significant commission changes
   */
  private async notifyCommissionChanges(results: CommissionSyncResult[]): Promise<void> {
    const significantChanges = results.filter(r => 
      r.synced && Math.abs(r.newCommission - r.oldCommission) > this.COMMISSION_DRIFT_THRESHOLD
    );

    if (significantChanges.length === 0) {
      return;
    }

    console.log(`📊 Found ${significantChanges.length} significant commission changes`);
    
    // Log significant changes
    logger.info('significant_commission_changes', {
      changes: significantChanges.map(r => ({
        productId: r.productId,
        name: r.name,
        network: r.network,
        oldCommission: r.oldCommission,
        newCommission: r.newCommission,
        change: r.newCommission - r.oldCommission,
        changePercent: ((r.newCommission - r.oldCommission) / r.oldCommission * 100).toFixed(2)
      }))
    });

    // TODO: Send email notification to admin
    // await this.sendCommissionChangeNotification(significantChanges);
  }

  /**
   * Get commission sync statistics
   */
  async getCommissionSyncStats(): Promise<any> {
    try {
      const [total, withCommission, recentlySynced] = await Promise.all([
        prisma.products.count({
          where: { isActive: true, isApproved: true }
        }),
        prisma.products.count({
          where: { 
            isActive: true, 
            isApproved: true,
            commission: { not: null }
          }
        }),
        prisma.products.count({
          where: { 
            isActive: true, 
            isApproved: true,
            lastCheckedAt: { 
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
            }
          }
        })
      ]);

      return {
        total,
        withCommission,
        recentlySynced,
        commissionRate: total > 0 ? Math.round((withCommission / total) * 100) : 0,
        syncRate: withCommission > 0 ? Math.round((recentlySynced / withCommission) * 100) : 0
      };

    } catch (error: any) {
      console.error('❌ Failed to get commission sync stats:', error);
      return {
        total: 0,
        withCommission: 0,
        recentlySynced: 0,
        commissionRate: 0,
        syncRate: 0
      };
    }
  }

  /**
   * Manual commission sync for specific product
   */
  async syncSpecificProduct(productId: number): Promise<CommissionSyncResult | null> {
    try {
      const product = await prisma.products.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          network: true,
          commission: true,
          externalId: true
        }
      });

      if (!product || !product.network || !product.externalId) {
        return null;
      }

      const results = await this.syncNetworkCommission(product.network, [product]);
      
      if (results.length > 0) {
        logger.info('manual_commission_sync', {
          productId,
          result: results[0]
        });
        
        return results[0];
      }

      return null;

    } catch (error: any) {
      console.error(`❌ Failed to sync product ${productId}:`, error);
      return null;
    }
  }

  /**
   * Group products by network
   */
  private groupByNetwork(products: any[]): Record<string, any[]> {
    return products.reduce((groups, product) => {
      const network = product.network || 'unknown';
      if (!groups[network]) {
        groups[network] = [];
      }
      groups[network].push(product);
      return groups;
    }, {} as Record<string, any[]>);
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const commissionSyncService = new CommissionSyncService();

// Export types
export type { CommissionSyncResult, NetworkCommissionData };
