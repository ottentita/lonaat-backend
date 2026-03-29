/**
 * PRODUCT CACHE SERVICE - Lightweight caching for performance
 * Simple in-memory cache to improve API response times
 */

interface CachedProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  affiliateLink: string;
  network: string;
  category: string;
  imageUrl: string;
  isActive: boolean;
  isApproved: boolean;
  commission: number;
  createdAt: Date;
}

interface CacheData {
  products: CachedProduct[];
  timestamp: number;
  count: number;
}

class ProductCacheService {
  private cache: CacheData | null = null;
  private lastKnownProducts: CachedProduct[] | null = null;
  private readonly CACHE_TTL = 60000; // 1 minute cache
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

  constructor() {
    // ⚡ CACHE MEMORY LEAK PREVENTION
    setInterval(() => {
      this.cleanupCache();
    }, this.CLEANUP_INTERVAL);
    
    console.log('🗑️ Cache cleanup interval set: 10 minutes');
  }

  /**
   * Get products from cache or database with fail-safe
   */
  async getProducts(forceRefresh = false): Promise<CachedProduct[]> {
    const now = Date.now();

    // Check if cache is valid
    if (!forceRefresh && this.cache && (now - this.cache.timestamp) < this.CACHE_TTL) {
      console.log('📦 Serving products from cache (' + this.cache.products.length + ' items)');
      return this.cache.products;
    }

    // Cache miss or expired - fetch from database
    console.log('🔄 Refreshing product cache...');
    
    let products: CachedProduct[] = [];
    try {
      products = await this.fetchFromDatabase();
      
      // ⚡ CACHE HARDENING - Fail-safe check
      if (!products || products.length === 0) {
        console.log('⚠️ No products from DB, using last known products');
        if (this.lastKnownProducts && this.lastKnownProducts.length > 0) {
          return this.lastKnownProducts;
        }
        // If no last known products, return empty array
        return [];
      }

      // Store as last known products for fail-safe
      this.lastKnownProducts = products;
      
    } catch (error) {
      console.error('❌ Failed to fetch products from DB:', error);
      // ⚡ CACHE HARDENING - Return last known products on error
      if (this.lastKnownProducts && this.lastKnownProducts.length > 0) {
        console.log('🛡️ Using fail-safe last known products');
        return this.lastKnownProducts;
      }
      throw error; // Re-throw if no fail-safe available
    }
    
    // Update cache
    this.cache = {
      products,
      timestamp: now,
      count: products.length
    };

    console.log('✅ Product cache updated (' + products.length + ' items)');
    return products;
  }

  /**
   * Fetch products from database
   */
  private async fetchFromDatabase(): Promise<CachedProduct[]> {
    const { prisma } = await import('../prisma');

    const products = await prisma.products.findMany({
      where: {
        isActive: true,
        isApproved: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        affiliateLink: true,
        network: true,
        category: true,
        imageUrl: true,
        isActive: true,
        isApproved: true,
        commission: true,
        createdAt: true
      },
      orderBy: [
        { commission: 'desc' },
        { createdAt: 'desc' }
      ],
      take: this.MAX_CACHE_SIZE
    });

    return products.map(p => ({
      ...p,
      price: Number(p.price) || 0,
      commission: p.commission || 0
    }));
  }

  /**
   * Invalidate cache (call after product updates)
   */
  invalidateCache(): void {
    console.log('🗑️ Product cache invalidated');
    this.cache = null;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      hasCache: this.cache !== null,
      cacheAge: this.cache ? Date.now() - this.cache.timestamp : 0,
      cacheSize: this.cache?.count || 0,
      ttl: this.CACHE_TTL
    };
  }

  /**
   * Warm up cache on startup
   */
  async warmUpCache(): Promise<void> {
    console.log('🔥 Warming up product cache...');
    await this.getProducts();
    console.log('✅ Product cache warmed up');
  }

  /**
   * Get single product from cache
   */
  async getProductById(id: number): Promise<CachedProduct | null> {
    const products = await this.getProducts();
    return products.find(p => p.id === id) || null;
  }

  /**
   * Search products in cache
   */
  async searchProducts(query: string): Promise<CachedProduct[]> {
    const products = await this.getProducts();
    const lowercaseQuery = query.toLowerCase();
    
    return products.filter(p => 
      p.name.toLowerCase().includes(lowercaseQuery) ||
      p.description.toLowerCase().includes(lowercaseQuery) ||
      p.category.toLowerCase().includes(lowercaseQuery) ||
      p.network.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Get products by network
   */
  async getProductsByNetwork(network: string): Promise<CachedProduct[]> {
    const products = await this.getProducts();
    return products.filter(p => p.network.toLowerCase() === network.toLowerCase());
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string): Promise<CachedProduct[]> {
    const products = await this.getProducts();
    return products.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  /**
   * Get top products by commission
   */
  async getTopProductsByCommission(limit = 10): Promise<CachedProduct[]> {
    const products = await this.getProducts();
    return products
      .filter(p => p.commission > 0)
      .slice(0, limit);
  }

  /**
   * Cleanup cache to prevent memory leaks
   */
  private cleanupCache(): void {
    const now = Date.now();
    
    // Clear main cache if it's older than 2x TTL
    if (this.cache && (now - this.cache.timestamp) > (this.CACHE_TTL * 2)) {
      console.log('🗑️ Cleaning up expired cache');
      this.cache = null;
    }
    
    // Clear last known products if very old (older than 1 hour)
    if (this.lastKnownProducts && this.cache && (now - this.cache.timestamp) > 3600000) {
      console.log('🗑️ Cleaning up old last known products');
      this.lastKnownProducts = null;
    }
    
    // Force garbage collection hint
    if (global.gc) {
      global.gc();
    }
  }
}

// Export singleton instance
export const productCacheService = new ProductCacheService();

// Export types
export type { CachedProduct };
