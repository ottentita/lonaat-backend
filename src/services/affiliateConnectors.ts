// Affiliate Connector Layer
// Activates API connectors only when API keys exist

export interface AffiliateProduct {
  id?: string;
  title: string;
  description: string;
  price: number;
  commission?: number;
  affiliate_link: string;
  image: string;
  category: string;
  network: string;
  source: 'api' | 'public' | 'manual';
  external_id?: string;
  currency?: string;
}

export interface ConnectorConfig {
  name: string;
  key: string;
  is_active: boolean;
  fetchProducts?: () => Promise<AffiliateProduct[]>;
}

// Check if API key exists for a network
function hasApiKey(network: string): boolean {
  const key = process.env[`${network.toUpperCase()}_API_KEY`];
  return !!key && key.length > 0;
}

// Digistore24 Connector
const digistoreConnector: ConnectorConfig = {
  name: 'digistore24',
  key: 'DIGISTORE24',
  is_active: hasApiKey('digistore24'),
  async fetchProducts(): Promise<AffiliateProduct[]> {
    if (!this.is_active) return [];
    
    // Mock API call - replace with real Digistore24 API
    return [
      {
        id: 'ds1',
        title: 'Keto Diet Complete Guide',
        description: 'Complete keto diet program with meal plans and recipes',
        price: 47.0,
        commission: 0.4,
        affiliate_link: 'https://digistore24.com/redir/12345/lonaat/',
        image: 'https://images.unsplash.com/photo-1490645935967-5a555bb7020d?w=400',
        category: 'Health',
        network: 'digistore24',
        source: 'api',
        external_id: 'ds_keto_123',
        currency: 'USD'
      },
      {
        id: 'ds2',
        title: 'Online Business Masterclass',
        description: 'Complete guide to starting and scaling an online business',
        price: 197.0,
        commission: 0.5,
        affiliate_link: 'https://digistore24.com/redir/67890/lonaat/',
        image: 'https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=400',
        category: 'Business',
        network: 'digistore24',
        source: 'api',
        external_id: 'ds_business_456',
        currency: 'USD'
      }
    ];
  }
};

// Impact Radius Connector
const impactConnector: ConnectorConfig = {
  name: 'impact',
  key: 'IMPACT',
  is_active: hasApiKey('impact'),
  async fetchProducts(): Promise<AffiliateProduct[]> {
    if (!this.is_active) return [];
    
    // Mock API call - replace with real Impact Radius API
    return [
      {
        id: 'im1',
        title: 'Premium Fitness Tracker',
        description: 'Advanced fitness tracker with GPS and heart rate monitoring',
        price: 129.99,
        commission: 0.15,
        affiliate_link: 'https://impact.com/click/123/lonaat',
        image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400',
        category: 'Electronics',
        network: 'impact',
        source: 'api',
        external_id: 'im_fitness_789',
        currency: 'USD'
      }
    ];
  }
};

// ClickBank Connector
const clickbankConnector: ConnectorConfig = {
  name: 'clickbank',
  key: 'CLICKBANK',
  is_active: hasApiKey('clickbank'),
  async fetchProducts(): Promise<AffiliateProduct[]> {
    if (!this.is_active) return [];
    
    // Mock API call - replace with real ClickBank API
    return [
      {
        id: 'cb1',
        title: 'Language Learning Premium',
        description: 'Learn any language fast with our proven method',
        price: 89.0,
        commission: 0.6,
        affiliate_link: 'https://clickbank.com/hop/456/lonaat',
        image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400',
        category: 'Education',
        network: 'clickbank',
        source: 'api',
        external_id: 'cb_lang_321',
        currency: 'USD'
      }
    ];
  }
};

const connectors: ConnectorConfig[] = [
  digistoreConnector,
  impactConnector,
  clickbankConnector
];

// Get active connectors
export function getActiveConnectors(): ConnectorConfig[] {
  return connectors.filter(c => c.is_active);
}

// Fetch products from all active API connectors
export async function fetchFromAPIConnectors(): Promise<AffiliateProduct[]> {
  const active = getActiveConnectors();
  const results = await Promise.allSettled(
    active.map(connector => connector.fetchProducts?.() || Promise.resolve([]))
  );
  
  return results
    .filter((result): result is PromiseFulfilledResult<AffiliateProduct[]> => result.status === 'fulfilled')
    .flatMap(result => result.value);
}

// Get connector status for frontend
export function getConnectorStatus() {
  return connectors.map(c => ({
    name: c.name,
    is_active: c.is_active,
    hasApiKey: hasApiKey(c.key)
  }));
}
