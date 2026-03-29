// Affiliate Network Connector System - PRODUCTION VERSION
// Uses REAL database data - NO MOCK DATA

import prisma from '../prisma';

interface AffiliateProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  commission: number;
  image: string;
  affiliate_link: string;
  network: string;
  category?: string;
  rating?: number;
  reviews?: number;
}

interface NetworkConfig {
  name: string;
  hasKey: boolean;
  active: boolean;
  lastChecked?: string;
  productCount?: number;
  error?: string;
}

class AffiliateConnector {
  private networks: Map<string, NetworkConfig> = new Map();
  private products: AffiliateProduct[] = [];

  constructor() {
    this.detectNetworks();
  }

  // 1. DETECT ALL AVAILABLE NETWORKS
  private detectNetworks() {
    console.log('🔍 Detecting affiliate networks...');
    
    const detectedNetworks: string[] = [];

    // Check each network for API keys
    const networkChecks = [
      { name: 'JVZoo', key: process.env.JVZOO_API_KEY || process.env.JVZOO_API_SECRET },
      { name: 'WarriorPlus', key: process.env.WARRIORPLUS_API_KEY || process.env.WARRIORPLUS_API_SECRET },
      { name: 'ClickBank', key: process.env.CLICKBANK_API_KEY },
      { name: 'Digistore24', key: process.env.DIGISTORE_API_KEY || process.env.DIGISTORE_API_SECRET },
      { name: 'Impact', key: process.env.IMPACT_API_TOKEN || process.env.IMPACT_API_SID },
      { name: 'AWIN', key: process.env.AWIN_TOKEN || process.env.AWIN_API_KEY },
      { name: 'Admitad', key: process.env.ADMITAD_CLIENT_SECRET || process.env.ADMITAD_API_KEY },
      { name: 'MyLead', key: process.env.MYLEAD_API_PASSWORD || process.env.MYLEAD_API_KEY },
      { name: 'AliExpress', key: process.env.ALIEXPRESS_APP_KEY || process.env.ALIEXPRESS_API_KEY }
    ];

    networkChecks.forEach(({ name, key }) => {
      const hasKey = !!key && key.length > 10; // Basic validation
      this.networks.set(name, {
        name,
        hasKey,
        active: false
      });
      
      if (hasKey) {
        detectedNetworks.push(name);
        console.log(`✅ ${name}: API key detected`);
      } else {
        console.log(`❌ ${name}: No API key found`);
      }
    });

    console.log('📊 Detected networks:', detectedNetworks);
    console.log(`🔑 Total networks with keys: ${detectedNetworks.length}/${networkChecks.length}`);
  }

  // 2. FETCH PRODUCTS FROM ALL NETWORKS
  async fetchAllProducts(): Promise<{ products: AffiliateProduct[], networks: NetworkConfig[] }> {
    console.log('🚀 Starting affiliate product fetch from all networks...');
    
    const fetchPromises: Promise<AffiliateProduct[]>[] = [];

    // Add fetch promises for each network that has keys
    if (this.networks.get('JVZoo')?.hasKey) {
      fetchPromises.push(this.fetchJVZooProducts());
    }
    if (this.networks.get('WarriorPlus')?.hasKey) {
      fetchPromises.push(this.fetchWarriorPlusProducts());
    }
    if (this.networks.get('ClickBank')?.hasKey) {
      fetchPromises.push(this.fetchClickBankProducts());
    }
    if (this.networks.get('Digistore24')?.hasKey) {
      fetchPromises.push(this.fetchDigistoreProducts());
    }
    if (this.networks.get('Impact')?.hasKey) {
      fetchPromises.push(this.fetchImpactProducts());
    }
    if (this.networks.get('AWIN')?.hasKey) {
      fetchPromises.push(this.fetchAWINProducts());
    }
    if (this.networks.get('Admitad')?.hasKey) {
      fetchPromises.push(this.fetchAdmitadProducts());
    }
    if (this.networks.get('MyLead')?.hasKey) {
      fetchPromises.push(this.fetchMyLeadProducts());
    }
    if (this.networks.get('AliExpress')?.hasKey) {
      fetchPromises.push(this.fetchAliExpressProducts());
    }

    // Execute all fetches in parallel
    try {
      const results = await Promise.allSettled(fetchPromises);
      this.products = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.products.push(...result.value);
        } else {
          console.error(`❌ Network fetch failed:`, result.reason);
        }
      });

      console.log(`✅ Fetched ${this.products.length} total products from ${this.products.length > 0 ? 'active' : 'no'} networks`);
      
      return {
        products: this.products,
        networks: Array.from(this.networks.values())
      };

    } catch (error) {
      console.error('❌ Error in fetchAllProducts:', error);
      return {
        products: [],
        networks: Array.from(this.networks.values())
      };
    }
  }

  // 3. INDIVIDUAL NETWORK FETCHERS

  private async fetchJVZooProducts(): Promise<AffiliateProduct[]> {
    console.log('📡 Fetching JVZoo products from DATABASE...');
    const config = this.networks.get('JVZoo')!;
    
    try {
      // PRODUCTION: Fetch real products from database
      const dbProducts = await prisma.product.findMany({
        where: { network: 'JVZoo' },
        take: 50
      });

      const products: AffiliateProduct[] = dbProducts.map(p => ({
        id: String(p.id),
        title: p.name,
        description: p.description || '',
        price: Number(p.price) || 0,
        commission: 50, // Default commission, should be in DB
        image: p.image_url || '',
        affiliate_link: p.affiliate_link || '',
        network: 'JVZoo',
        category: p.category || undefined
      }));

      config.active = true;
      config.productCount = products.length;
      config.lastChecked = new Date().toISOString();
      
      console.log(`✅ JVZoo: ${products.length} products fetched from DB`);
      return products;

    } catch (error) {
      config.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ JVZoo DB fetch failed:`, error);
      throw new Error(`Failed to fetch JVZoo products from database: ${error}`);
    }
  }

  private async fetchWarriorPlusProducts(): Promise<AffiliateProduct[]> {
    console.log('📡 Fetching WarriorPlus products from DATABASE...');
    const config = this.networks.get('WarriorPlus')!;
    
    try {
      const dbProducts = await prisma.product.findMany({
        where: { network: 'WarriorPlus' },
        take: 50
      });

      const products: AffiliateProduct[] = dbProducts.map(p => ({
        id: String(p.id),
        title: p.name,
        description: p.description || '',
        price: Number(p.price) || 0,
        commission: 65,
        image: p.image_url || '',
        affiliate_link: p.affiliate_link || '',
        network: 'WarriorPlus',
        category: p.category || undefined
      }));

      config.active = true;
      config.productCount = products.length;
      config.lastChecked = new Date().toISOString();
      
      console.log(`✅ WarriorPlus: ${products.length} products fetched from DB`);
      return products;

    } catch (error) {
      config.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ WarriorPlus DB fetch failed:`, error);
      throw new Error(`Failed to fetch WarriorPlus products from database: ${error}`);
    }
  }

  private async fetchClickBankProducts(): Promise<AffiliateProduct[]> {
    console.log('📡 Fetching ClickBank products from DATABASE...');
    const config = this.networks.get('ClickBank')!;
    
    try {
      const dbProducts = await prisma.product.findMany({
        where: { network: 'ClickBank' },
        take: 50
      });

      const products: AffiliateProduct[] = dbProducts.map(p => ({
        id: String(p.id),
        title: p.name,
        description: p.description || '',
        price: Number(p.price) || 0,
        commission: 75,
        image: p.image_url || '',
        affiliate_link: p.affiliate_link || '',
        network: 'ClickBank',
        category: p.category || undefined
      }));

      config.active = true;
      config.productCount = products.length;
      config.lastChecked = new Date().toISOString();
      
      console.log(`✅ ClickBank: ${products.length} products fetched from DB`);
      return products;

    } catch (error) {
      config.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ ClickBank DB fetch failed:`, error);
      throw new Error(`Failed to fetch ClickBank products from database: ${error}`);
    }
  }

  private async fetchDigistoreProducts(): Promise<AffiliateProduct[]> {
    console.log('📡 Fetching Digistore24 products from DATABASE...');
    const config = this.networks.get('Digistore24')!;
    
    try {
      const dbProducts = await prisma.product.findMany({
        where: { network: 'Digistore24' },
        take: 50
      });

      const products: AffiliateProduct[] = dbProducts.map(p => ({
        id: String(p.id),
        title: p.name,
        description: p.description || '',
        price: Number(p.price) || 0,
        commission: 60,
        image: p.image_url || '',
        affiliate_link: p.affiliate_link || '',
        network: 'Digistore24',
        category: p.category || undefined
      }));

      config.active = true;
      config.productCount = products.length;
      config.lastChecked = new Date().toISOString();
      
      console.log(`✅ Digistore24: ${products.length} products fetched from DB`);
      return products;

    } catch (error) {
      config.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Digistore24 DB fetch failed:`, error);
      throw new Error(`Failed to fetch Digistore24 products from database: ${error}`);
    }
  }

  private async fetchImpactProducts(): Promise<AffiliateProduct[]> {
    console.log('📡 Fetching Impact products from DATABASE...');
    const config = this.networks.get('Impact')!;
    
    try {
      const dbProducts = await prisma.product.findMany({
        where: { network: 'Impact' },
        take: 50
      });

      const products: AffiliateProduct[] = dbProducts.map(p => ({
        id: String(p.id),
        title: p.name,
        description: p.description || '',
        price: Number(p.price) || 0,
        commission: 15,
        image: p.image_url || '',
        affiliate_link: p.affiliate_link || '',
        network: 'Impact',
        category: p.category || undefined
      }));

      config.active = true;
      config.productCount = products.length;
      config.lastChecked = new Date().toISOString();
      
      console.log(`✅ Impact: ${products.length} products fetched from DB`);
      return products;

    } catch (error) {
      config.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Impact DB fetch failed:`, error);
      throw new Error(`Failed to fetch Impact products from database: ${error}`);
    }
  }

  private async fetchAWINProducts(): Promise<AffiliateProduct[]> {
    console.log('📡 Fetching AWIN products from DATABASE...');
    const config = this.networks.get('AWIN')!;
    
    try {
      const dbProducts = await prisma.product.findMany({
        where: { network: 'AWIN' },
        take: 50
      });

      const products: AffiliateProduct[] = dbProducts.map(p => ({
        id: String(p.id),
        title: p.name,
        description: p.description || '',
        price: Number(p.price) || 0,
        commission: 8,
        image: p.image_url || '',
        affiliate_link: p.affiliate_link || '',
        network: 'AWIN',
        category: p.category || undefined
      }));

      config.active = true;
      config.productCount = products.length;
      config.lastChecked = new Date().toISOString();
      
      console.log(`✅ AWIN: ${products.length} products fetched from DB`);
      return products;

    } catch (error) {
      config.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ AWIN DB fetch failed:`, error);
      throw new Error(`Failed to fetch AWIN products from database: ${error}`);
    }
  }

  private async fetchAdmitadProducts(): Promise<AffiliateProduct[]> {
    console.log('📡 Fetching Admitad products from DATABASE...');
    const config = this.networks.get('Admitad')!;
    
    try {
      const dbProducts = await prisma.product.findMany({
        where: { network: 'Admitad' },
        take: 50
      });

      const products: AffiliateProduct[] = dbProducts.map(p => ({
        id: String(p.id),
        title: p.name,
        description: p.description || '',
        price: Number(p.price) || 0,
        commission: 12,
        image: p.image_url || '',
        affiliate_link: p.affiliate_link || '',
        network: 'Admitad',
        category: p.category || undefined
      }));

      config.active = true;
      config.productCount = products.length;
      config.lastChecked = new Date().toISOString();
      
      console.log(`✅ Admitad: ${products.length} products fetched from DB`);
      return products;

    } catch (error) {
      config.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Admitad DB fetch failed:`, error);
      throw new Error(`Failed to fetch Admitad products from database: ${error}`);
    }
  }

  private async fetchMyLeadProducts(): Promise<AffiliateProduct[]> {
    console.log('📡 Fetching MyLead products from DATABASE...');
    const config = this.networks.get('MyLead')!;
    
    try {
      const dbProducts = await prisma.product.findMany({
        where: { network: 'MyLead' },
        take: 50
      });

      const products: AffiliateProduct[] = dbProducts.map(p => ({
        id: String(p.id),
        title: p.name,
        description: p.description || '',
        price: Number(p.price) || 0,
        commission: 40,
        image: p.image_url || '',
        affiliate_link: p.affiliate_link || '',
        network: 'MyLead',
        category: p.category || undefined
      }));

      config.active = true;
      config.productCount = products.length;
      config.lastChecked = new Date().toISOString();
      
      console.log(`✅ MyLead: ${products.length} products fetched from DB`);
      return products;

    } catch (error) {
      config.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ MyLead DB fetch failed:`, error);
      throw new Error(`Failed to fetch MyLead products from database: ${error}`);
    }
  }

  private async fetchAliExpressProducts(): Promise<AffiliateProduct[]> {
    console.log('📡 Fetching AliExpress products from DATABASE...');
    const config = this.networks.get('AliExpress')!;
    
    try {
      const dbProducts = await prisma.product.findMany({
        where: { network: 'AliExpress' },
        take: 50
      });

      const products: AffiliateProduct[] = dbProducts.map(p => ({
        id: String(p.id),
        title: p.name,
        description: p.description || '',
        price: Number(p.price) || 0,
        commission: 8,
        image: p.image_url || '',
        affiliate_link: p.affiliate_link || '',
        network: 'AliExpress',
        category: p.category || undefined
      }));

      config.active = true;
      config.productCount = products.length;
      config.lastChecked = new Date().toISOString();
      
      console.log(`✅ AliExpress: ${products.length} products fetched from DB`);
      return products;

    } catch (error) {
      config.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ AliExpress DB fetch failed:`, error);
      throw new Error(`Failed to fetch AliExpress products from database: ${error}`);
    }
  }

  // 4. GET NETWORK STATUS
  getNetworkStatus(): NetworkConfig[] {
    return Array.from(this.networks.values());
  }

  // 5. GET PRODUCTS BY NETWORK
  getProductsByNetwork(networkName: string): AffiliateProduct[] {
    return this.products.filter(product => product.network === networkName);
  }

  // 6. GET ALL UNIQUE NETWORKS
  getActiveNetworks(): string[] {
    const activeNetworks = new Set(this.products.map(product => product.network));
    return Array.from(activeNetworks);
  }
}

export default AffiliateConnector;
export { AffiliateProduct, NetworkConfig };
