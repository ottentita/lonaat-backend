// Hybrid Affiliate Service
// Combines API connectors, public data, and manual products
// Ensures marketplace is NEVER empty

import { fetchFromAPIConnectors, getConnectorStatus } from './affiliateConnectors';
import { publicProducts, getPublicNetworks } from './affiliatePublicData';
import { manualProductService, ManualProductInput } from './affiliateManualService';
import { AffiliateProduct } from './affiliateConnectors';
import { prisma } from '../prisma';

export class AffiliateHybridService {
  // Get all products from all sources with priority
  async getAllProducts(options: {
    page?: number;
    limit?: number;
    category?: string;
    network?: string;
    source?: 'api' | 'public' | 'manual';
    userId?: number;
  } = {}): Promise<{
    products: AffiliateProduct[];
    total: number;
    sources: {
      api: number;
      public: number;
      manual: number;
    };
    networks: Array<{
      name: string;
      productCount: number;
      source: string;
    }>;
  }> {
    const { page = 1, limit = 20, category, network, source, userId } = options;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = { is_active: true };
    if (category) where.category = category;
    if (network) where.network = { equals: network, mode: 'insensitive' };
    if (source) where.source = source;
    if (userId) where.user_id = userId;

    // Get products from database (includes synced API and public products)
    let dbProducts: any[] = [];
    let total = 0;

    try {
      [dbProducts, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            image_url: true,
            affiliate_link: true,
            network: true,
            category: true,
            source: true,
            external_id: true,
            extra_data: true,
            created_at: true
          }
        }),
        prisma.product.count({ where })
      ]);
    } catch (error) {
      console.error('Database query error:', error);
      // Fallback to basic query if new columns don't exist yet
      [dbProducts, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.product.count({ where })
      ]);
    }

    // Format products
    const formattedProducts = dbProducts.map(p => this.formatProduct(p));

    // If no products found, ensure we have fallback data
    if (formattedProducts.length === 0) {
      await this.ensureMinimumProducts();
      // Retry after ensuring products
      return this.getAllProducts(options);
    }

    // Count by source
    const sourceCounts = await prisma.product.groupBy({
      by: ['source'],
      where: { is_active: true },
      _count: true
    });

    const sources = {
      api: sourceCounts.find(s => s.source === 'api')?._count ?? 0,
      public: sourceCounts.find(s => s.source === 'public')?._count ?? 0,
      manual: sourceCounts.find(s => s.source === 'manual')?._count ?? 0
    };

    // Get networks with product counts
    const networkData = await prisma.product.groupBy({
      by: ['network', 'source'],
      where: { is_active: true },
      _count: true
    });

    const networks = networkData.map(n => ({
      name: n.network || 'unknown',
      productCount: n?._count ?? 0,
      source: n.source
    }));

    return {
      products: formattedProducts,
      total,
      sources,
      networks
    };
  }

  // Ensure minimum products exist (marketplace never empty)
  async ensureMinimumProducts(): Promise<void> {
    const productCount = await prisma.product.count({ 
      where: { is_active: true } 
    });

    if (productCount === 0) {
      console.log('No products found, adding fallback products...');
      
      // Add public products as fallback
      const synced = await manualProductService.syncPublicProducts(publicProducts);
      console.log(`Synced ${synced} public products as fallback`);
    }
  }

  // Sync products from all sources
  async syncAllSources(): Promise<{
    api: number;
    public: number;
    total: number;
  }> {
    const results = { api: 0, public: 0, total: 0 };

    // Sync API products
    try {
      const apiProducts = await fetchFromAPIConnectors();
      if (apiProducts.length > 0) {
        results.api = await manualProductService.syncAPIProducts(apiProducts);
        console.log(`Synced ${results.api} API products`);
      }
    } catch (error) {
      console.error('Failed to sync API products:', error);
    }

    // Sync public products
    try {
      results.public = await manualProductService.syncPublicProducts(publicProducts);
      console.log(`Synced ${results.public} public products`);
    } catch (error) {
      console.error('Failed to sync public products:', error);
    }

    results.total = results.api + results.public;

    // Ensure we have minimum products
    await this.ensureMinimumProducts();

    return results;
  }

  // Add manual product
  async addManualProduct(
    data: ManualProductInput,
    userId?: number
  ): Promise<AffiliateProduct> {
    const product = await manualProductService.addManualProduct(data, userId);
    
    // Refresh any public data if needed
    await this.ensureMinimumProducts();
    
    return product;
  }

  // Get networks status
  async getNetworksStatus(): Promise<{
    connectors: Array<{
      name: string;
      is_active: boolean;
      hasApiKey: boolean;
    }>;
    publicNetworks: Array<{
      name: string;
      slug: string;
      productCount: number;
    }>;
    totalNetworks: number;
  }> {
    const connectors = getConnectorStatus();
    const publicNetworks = getPublicNetworks();
    
    // Get actual product counts from database
    const dbNetworks = await prisma.product.groupBy({
      by: ['network'],
      where: { is_active: true },
      _count: true
    });

    const networksWithCounts = publicNetworks.map(pn => ({
      ...pn,
      productCount: dbNetworks.find(n => n.network === pn.name)?._count ?? 0
    }));

    return {
      connectors,
      publicNetworks: networksWithCounts,
      totalNetworks: dbNetworks.length
    };
  }

  // Search products across all sources
  async searchProducts(query: string, options: {
    limit?: number;
    source?: 'api' | 'public' | 'manual';
    category?: string;
    network?: string;
  } = {}): Promise<AffiliateProduct[]> {
    const { limit = 50, source, category, network } = options;

    const where: any = {
      is_active: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } }
      ]
    };

    if (source) where.source = source;
    if (category) where.category = category;
    if (network) where.network = { equals: network, mode: 'insensitive' };

    const products = await prisma.product.findMany({
      where,
      take: limit,
      orderBy: { created_at: 'desc' }
    });

    return products.map(p => this.formatProduct(p));
  }

  // Get products by source
  async getProductsBySource(source: 'api' | 'public' | 'manual', limit = 20): Promise<AffiliateProduct[]> {
    const products = await prisma.product.findMany({
      where: { source, is_active: true },
      take: limit,
      orderBy: { created_at: 'desc' }
    });

    return products.map(p => this.formatProduct(p));
  }

  // Format product from database
  private formatProduct(product: any): AffiliateProduct {
    const extraData = product.extra_data ? JSON.parse(product.extra_data) : {};
    
    return {
      id: product.id.toString(),
      title: product.name,
      description: product.description || '',
      price: Number(product.price || 0),
      commission: extraData.commission,
      affiliate_link: product.affiliate_link || '',
      image: product.image_url || '',
      category: product.category || 'General',
      network: product.network || 'unknown',
      source: product.source,
      external_id: product.external_id,
      currency: extraData.currency || 'USD'
    };
  }
}

export const affiliateHybridService = new AffiliateHybridService();
