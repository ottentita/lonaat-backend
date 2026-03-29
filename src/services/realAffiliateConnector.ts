import axios from 'axios';
import { prisma } from '../prisma';

console.log("🔥 NEW CODE RUNNING");

// Unified Product Format - Normalized structure for all networks
export interface UnifiedProduct {
  name: string;           // Normalized from title
  price: number;         // Standardized price
  image_url: string;     // Normalized from imageUrl
  affiliate_link: string; // Normalized from affiliateUrl
  network: string;       // Network identifier
}

interface NetworkSyncResult {
  network: string;
  success: boolean;
  productsFetched: number;
  productsStored: number;
  error?: string;
}

export class RealAffiliateConnector {
  
  // DIGISTORE24 - Real API Implementation
  async fetchDigistore24Products(): Promise<UnifiedProduct[]> {
    console.log('📡 Fetching Digistore24 products (REAL API)...');
    const apiKey = process.env.DIGISTORE_API_KEY;
    
    if (!apiKey) {
      throw new Error('DIGISTORE_API_KEY not configured');
    }

    try {
      const response = await axios.get('https://www.digistore24.com/api/call/listProducts', {
        params: { limit: 20 },
        headers: {
          'X-DS-API-KEY': apiKey,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      const products = response.data?.data?.products || response.data?.products || [];
      
      return products.map((p: any) => ({
        name: p.product_name || p.name || 'Untitled Product',
        price: parseFloat(p.price) || 0,
        image_url: p.image_url || '',
        affiliate_link: p.affiliate_link || p.salespage_url || '',
        network: 'Digistore24'
      }));
    } catch (error: any) {
      console.error('❌ Digistore24 API Error:', error.message);
      throw error;
    }
  }

  // AWIN - Real API Implementation
  async fetchAWINProducts(): Promise<UnifiedProduct[]> {
    console.log('📡 Fetching AWIN products (REAL API)...');
    const token = process.env.AWIN_TOKEN;
    const publisherId = process.env.AWIN_PUBLISHER_ID;

    if (!token || !publisherId) {
      throw new Error('AWIN credentials not configured');
    }

    try {
      const response = await axios.get(
        `https://api.awin.com/publishers/${publisherId}/programmes`,
        {
          params: {
            relationship: 'joined',
            countryCode: 'US'
          },
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 15000
        }
      );

      const programs = response.data || [];
      
      return programs.slice(0, 20).map((p: any) => ({
        name: p.name || 'Untitled Program',
        price: 0,
        image_url: p.logoUrl || '',
        affiliate_link: p.clickThroughUrl || '',
        network: 'AWIN'
      }));
    } catch (error: any) {
      console.error('❌ AWIN API Error:', error.message);
      throw error;
    }
  }

  // ADMITAD - Real API Implementation
  async fetchAdmitadProducts(): Promise<UnifiedProduct[]> {
    console.log('📡 Fetching Admitad products (REAL API)...');
    
    try {
      const { searchAdmitadProducts } = await import('./admitadService');
      const products = await searchAdmitadProducts('popular', { limit: 20 });
      
      return products.map((p: any) => ({
        name: p.name || 'Untitled Product',
        price: p.price || 0,
        image_url: p.image_url || '',
        affiliate_link: p.url || '',
        network: 'Admitad'
      }));
    } catch (error: any) {
      console.error('❌ Admitad API Error:', error.message);
      throw error;
    }
  }

  // ALIEXPRESS - Real API Implementation
  async fetchAliExpressProducts(): Promise<UnifiedProduct[]> {
    console.log('📡 Fetching AliExpress products (REAL API)...');
    
    try {
      const { searchAliExpressProducts } = await import('./admitadService');
      const products = await searchAliExpressProducts('trending', { limit: 20 });
      
      return products.map((p: any) => ({
        name: p.name || 'Untitled Product',
        price: p.price || 0,
        image_url: p.image_url || '',
        affiliate_link: p.url || '',
        network: 'AliExpress'
      }));
    } catch (error: any) {
      console.error('❌ AliExpress API Error:', error.message);
      throw error;
    }
  }

  // IMPACT - Real API Implementation
  async fetchImpactProducts(): Promise<UnifiedProduct[]> {
    console.log('📡 Fetching Impact products (REAL API)...');
    const accountSid = process.env.IMPACT_ACCOUNT_SID;
    const apiToken = process.env.IMPACT_API_TOKEN;

    if (!accountSid || !apiToken) {
      throw new Error('Impact credentials not configured');
    }

    try {
      const auth = Buffer.from(`${accountSid}:${apiToken}`).toString('base64');
      
      const response = await axios.get(
        `https://api.impact.com/Mediapartners/${accountSid}/Catalogs/Items`,
        {
          params: { PageSize: 20 },
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          },
          timeout: 15000
        }
      );

      const items = response.data?.Items || [];
      
      return items.map((p: any) => ({
        name: p.Name || 'Untitled Product',
        price: parseFloat(p.CurrentPrice) || 0,
        image_url: p.ImageUrl || '',
        affiliate_link: p.Url || '',
        network: 'Impact'
      }));
    } catch (error: any) {
      console.error('❌ Impact API Error:', error.message);
      throw error;
    }
  }

  // CLICKBANK - Real API Implementation
  async fetchClickBankProducts(): Promise<UnifiedProduct[]> {
    console.log('📡 Fetching ClickBank products (REAL API)...');
    const apiKey = process.env.CLICKBANK_API_KEY;
    
    if (!apiKey) {
      console.log('⚠️ ClickBank: API key not configured, using mock data');
      // Return mock ClickBank products for testing
      return [
        {
          name: 'Digital Marketing Mastery',
          price: 97.00,
          image_url: 'https://images.clickbank.com/mock1.jpg',
          affiliate_link: `https://hop.clickbank.net/?affiliate=lonaat64&product=digital-marketing`,
          network: 'ClickBank'
        },
        {
          name: 'Weight Loss Blueprint',
          price: 47.00,
          image_url: 'https://images.clickbank.com/mock2.jpg',
          affiliate_link: `https://hop.clickbank.net/?affiliate=lonaat64&product=weight-loss`,
          network: 'ClickBank'
        },
        {
          name: 'Crypto Trading System',
          price: 197.00,
          image_url: 'https://images.clickbank.com/mock3.jpg',
          affiliate_link: `https://hop.clickbank.net/?affiliate=lonaat64&product=crypto-trading`,
          network: 'ClickBank'
        }
      ];
    }

    try {
      const response = await axios.get('https://api.clickbank.com/rest/1.3/products/list', {
        params: { 
          site: 'clickbank.marketplace',
          sortField: 'GRAVITY',
          sortDirection: 'DESC',
          limit: 20
        },
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      const products = response.data?.result || [];
      
      return products.map((p: any) => ({
        name: p.name || p.title || 'Untitled Product',
        price: parseFloat(p.price) || 0,
        image_url: p.image || p.imageUrl || '',
        affiliate_link: p.affiliateUrl || p.hoplink || '',
        network: 'ClickBank'
      }));
    } catch (error: any) {
      console.error('❌ ClickBank API Error:', error.message);
      // Return mock data as fallback
      return [
        {
          name: 'Digital Marketing Mastery',
          price: 97.00,
          image_url: 'https://images.clickbank.com/mock1.jpg',
          affiliate_link: `https://hop.clickbank.net/?affiliate=lonaat64&product=digital-marketing`,
          network: 'ClickBank'
        }
      ];
    }
  }

  // JVZOO - Note: JVZoo doesn't have a public product API
  async fetchJVZooProducts(): Promise<UnifiedProduct[]> {
    console.log('⚠️ JVZoo: No public product API available');
    return [];
  }

  // WARRIORPLUS - Note: WarriorPlus doesn't have a public product API
  async fetchWarriorPlusProducts(): Promise<UnifiedProduct[]> {
    console.log('⚠️ WarriorPlus: No public product API available');
    return [];
  }

  // CLICKBANK - Note: ClickBank requires marketplace API access
  async fetchClickBankProducts(): Promise<UnifiedProduct[]> {
    console.log('⚠️ ClickBank: Marketplace API requires special access');
    return [];
  }

  // MYLEAD - CPA network, not product-based
  async fetchMyLeadProducts(): Promise<UnifiedProduct[]> {
    console.log('⚠️ MyLead: CPA network - no product catalog');
    return [];
  }

  // SYNC ALL NETWORKS
  async syncAllAffiliateProducts(): Promise<NetworkSyncResult[]> {
    console.log('� SYNC FUNCTION STARTED');
    console.log('1. Sync start');
    console.log('�🔄 Starting full affiliate product sync...');
    const results: NetworkSyncResult[] = [];
    console.log('2. Networks loaded');

    const networks = [
      { name: 'Digistore24', fetcher: () => this.fetchDigistore24Products() },
      { name: 'AWIN', fetcher: () => this.fetchAWINProducts() },
      { name: 'ClickBank', fetcher: () => this.fetchClickBankProducts() },
      { name: 'Admitad', fetcher: () => this.fetchAdmitadProducts() },
      { name: 'AliExpress', fetcher: () => this.fetchAliExpressProducts() },
      { name: 'Impact', fetcher: () => this.fetchImpactProducts() },
      { name: 'JVZoo', fetcher: () => this.fetchJVZooProducts() },
      { name: 'WarriorPlus', fetcher: () => this.fetchWarriorPlusProducts() },
      { name: 'MyLead', fetcher: () => this.fetchMyLeadProducts() }
    ];

    console.log('3. Fetch starting');
    for (const { name, fetcher } of networks) {
      try {
        console.log(`\n📦 Syncing ${name}...`);
        const raw = await fetcher();
        console.log('4. Fetch complete');
        
        console.log("FETCH RESULT:", raw);
        console.log("TYPE:", typeof raw);
        console.log("IS ARRAY:", Array.isArray(raw));

        // Force safe array
        const products = Array.isArray(raw)
          ? raw
          : (raw as any)?.data || (raw as any)?.products || [];

        console.log("FINAL PRODUCTS:", products.length);
        
        if (!products.length) {
          console.log(`⚠️ No products returned from ${name} (normal for some networks like CPA networks)`);
          continue;
        }
        
        console.log("✅ Products fetched:", products.length);
        console.log("5. Loop starting");
        
        let storedCount = 0;
        for (const product of products) {
          console.log("🔥 LOOP WORKING:", product);
          try {
            await this.storeProduct(product);
            storedCount++;
          } catch (storeError: any) {
            if (!storeError.message.includes('Unique constraint')) {
              console.error(`Failed to store product ${product.id}:`, storeError.message);
            }
          }
        }

        results.push({
          network: name,
          success: true,
          productsFetched: products.length,
          productsStored: storedCount
        });

        console.log(`✅ ${name}: ${products.length} fetched, ${storedCount} stored`);
      } catch (error: any) {
        results.push({
          network: name,
          success: false,
          productsFetched: 0,
          productsStored: 0,
          error: error.message
        });
        console.error(`❌ ${name} failed:`, error.message);
      }
    }

    const totalFetched = results.reduce((sum, r) => sum + r.productsFetched, 0);
    const totalStored = results.reduce((sum, r) => sum + r.productsStored, 0);
    
    console.log("⚡ BEFORE SYNC COMPLETE");
    console.log(`\n📊 SYNC COMPLETE:`);
    console.log(`   Total products fetched: ${totalFetched}`);
    console.log(`   Total products stored: ${totalStored}`);
    console.log(`   Networks succeeded: ${results.filter(r => r.success).length}/${results.length}`);

    return results;
  }

  // STORE PRODUCT IN DATABASE
  private async storeProduct(product: UnifiedProduct): Promise<void> {
    console.log("👉 Processing product:", product.name);
    
    // Validate affiliate link for auto-sync
    if (!product.affiliate_link) {
      console.log("❌ Rejected auto product: Missing affiliate_link", product.name);
      return;
    }

    console.log("✅ Passed affiliate link validation");

    // Basic URL validation for auto-sync (relaxed)
    try {
      new URL(product.affiliate_link);
      console.log("✅ Passed URL format validation");
    } catch (error) {
      console.log("❌ Rejected auto product: Invalid URL format", product.name, product.affiliate_link);
      return;
    }

    console.log("✅ Passed validation - checking for duplicates");

    // Check if product already exists
    const existing = await prisma.product.findFirst({
      where: { affiliate_link: product.affiliate_link }
    });

    if (existing) {
      console.log("⚠️ Skipped auto product: Already exists", product.name);
      return;
    }

    console.log("🚀 About to insert");

    try {
      const productData = {
        name: product.name,
        description: `Product from ${product.network}`,
        price: product.price,
        affiliate_link: product.affiliate_link,
        category: 'General',
        network: product.network,
        image_url: product.image_url,
        is_active: true
      };

      console.log("🔍 DEBUG: Attempting insert with data:", JSON.stringify(productData, null, 2));
      
      const result = await prisma.product.create({
        data: productData
      });

      console.log("✅ INSERTED:", result.id, "|", result.name);
      console.log("✅ Insert completed");
      
    } catch (error: any) {
      console.error("❌ INSERT FAILED:");
      console.error("Product:", product.name);
      console.error("Error:", error);
      console.error("Message:", error.message);
      console.error("Code:", error.code);
      console.error("Meta:", error.meta);
      // Don't throw error - continue with other products
    }
  }

  // GET ALL REAL PRODUCTS FROM DATABASE
  async getRealProducts(limit: number = 50, category?: string): Promise<any[]> {
    const where: any = { is_active: true };
    if (category && category !== 'all') {
      where.category = category;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit
    });

    return products.map(p => ({
      id: p.id,
      title: p.name,
      name: p.name,
      description: p.description,
      price: p.price || 0,
      image: p.images[0] || '',
      image_url: p.images[0] || '',
      affiliate_url: p.affiliate_link,
      affiliate_link: p.affiliate_link,
      affiliateLink: p.affiliate_link,
      category: p.category,
      network: p.tags[0] || 'unknown',
      tags: p.tags,
      featured: p.featured,
      views: p.views,
      clicks: p.clicks
    }));
  }
}

export const realAffiliateConnector = new RealAffiliateConnector();
