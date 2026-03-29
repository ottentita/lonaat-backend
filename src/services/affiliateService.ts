import axios from 'axios';

// Standard product format - ALL networks must return this
export interface StandardProduct {
  id: string;
  title: string;
  price: number;
  commission: number;
  network: string;
  category: string;
  image?: string;
  link: string;
  description?: string;
  vendor?: string;
}

// External API response types
interface AliExpressProductRaw {
  product_id?: string;
  product_title?: string;
  target_sale_price?: string;
  commission_rate?: string;
  product_main_image_url?: string;
  promotion_link?: string;
  first_level_category_name?: string;
  shop_title?: string;
}

interface MyLeadProductRaw {
  id?: number;
  name?: string;
  payout?: number;
  category?: string;
  image?: string;
  url?: string;
  description?: string;
}

interface AdmitadProductRaw {
  id?: string;
  name?: string;
  price?: number;
  category?: string;
  picture?: string;
  url?: string;
  description?: string;
}

interface AWINProductRaw {
  product_id?: string;
  product_name?: string;
  search_price?: number;
  commission_amount?: number;
  merchant_image_url?: string;
  aw_deep_link?: string;
  merchant_category?: string;
  merchant_name?: string;
}

// Normalization functions for external API responses
function normalizeAliExpress(raw: AliExpressProductRaw): StandardProduct {
  return {
    id: `ali_${raw.product_id ?? Date.now()}`,
    title: raw.product_title ?? 'Untitled Product',
    price: parseFloat(raw.target_sale_price ?? '0') || 0,
    commission: parseFloat(raw.commission_rate ?? '0') || 0,
    network: 'AliExpress',
    category: raw.first_level_category_name ?? 'General',
    image: raw.product_main_image_url,
    link: raw.promotion_link ?? '',
    description: raw.product_title,
    vendor: raw.shop_title ?? 'AliExpress Seller'
  };
}

function normalizeMyLead(raw: MyLeadProductRaw): StandardProduct {
  return {
    id: `ml_${raw.id ?? Date.now()}`,
    title: raw.name ?? 'Untitled Product',
    price: raw.payout ?? 0,
    commission: (raw.payout ?? 0) * 0.4, // Assume 40% commission
    network: 'MyLead',
    category: raw.category ?? 'General',
    image: raw.image,
    link: raw.url ?? '',
    description: raw.description,
    vendor: 'MyLead'
  };
}

function normalizeAdmitad(raw: AdmitadProductRaw): StandardProduct {
  return {
    id: `adm_${raw.id ?? Date.now()}`,
    title: raw.name ?? 'Untitled Product',
    price: raw.price ?? 0,
    commission: (raw.price ?? 0) * 0.2, // Assume 20% commission
    network: 'Admitad',
    category: raw.category ?? 'General',
    image: raw.picture,
    link: raw.url ?? '',
    description: raw.description,
    vendor: 'Admitad'
  };
}

function normalizeAWIN(raw: AWINProductRaw): StandardProduct {
  return {
    id: `awin_${raw.product_id ?? Date.now()}`,
    title: raw.product_name ?? 'Untitled Product',
    price: raw.search_price ?? 0,
    commission: raw.commission_amount ?? 0,
    network: 'AWIN',
    category: raw.merchant_category ?? 'General',
    image: raw.merchant_image_url,
    link: raw.aw_deep_link ?? '',
    description: raw.product_name,
    vendor: raw.merchant_name ?? 'AWIN Merchant'
  };
}

// ==================== JVZOO ====================
async function fetchJVZooProducts(limit: number = 50): Promise<StandardProduct[]> {
  try {
    const apiKey = process.env.JVZOO_API_KEY;
    const apiSecret = process.env.JVZOO_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      console.log('⚠️ JVZoo API keys not configured');
      return [];
    }

    console.log('📡 Fetching JVZoo products...');
    
    // JVZoo API endpoint (placeholder - update with actual endpoint)
    // Note: JVZoo doesn't have a public product API
    console.warn('⚠️ JVZoo API not implemented - returning empty array (NO MOCK DATA)');
    return [];
  } catch (error) {
    console.error('❌ JVZoo fetch error:', error);
    return [];
  }
}

// ==================== DIGISTORE24 ====================
async function fetchDigistore24Products(limit: number = 50): Promise<StandardProduct[]> {
  try {
    const apiKey = process.env.DIGISTORE_API_KEY;
    const vendorKey = process.env.DIGISTORE_VENDOR_KEY;
    
    if (!apiKey || !vendorKey) {
      console.log('⚠️ Digistore24 API keys not configured');
      return [];
    }

    console.log('📡 Fetching Digistore24 products...');
    
    // Digistore24 API integration would go here
    console.warn('⚠️ Digistore24 API not fully implemented - returning empty array (NO MOCK DATA)');
    return [];
  } catch (error) {
    console.error('❌ Digistore24 fetch error:', error);
    return [];
  }
}

// ==================== WARRIORPLUS ====================
async function fetchWarriorPlusProducts(limit: number = 50): Promise<StandardProduct[]> {
  try {
    const apiKey = process.env.WARRIORPLUS_API_KEY;
    
    if (!apiKey) {
      console.log('⚠️ WarriorPlus API keys not configured');
      return [];
    }

    console.log('📡 Fetching WarriorPlus products...');
    
    // WarriorPlus API integration would go here
    console.warn('⚠️ WarriorPlus API not implemented - returning empty array (NO MOCK DATA)');
    return [];
  } catch (error) {
    console.error('❌ WarriorPlus fetch error:', error);
    return [];
  }
}

// ==================== MYLEAD ====================
async function fetchMyLeadProducts(limit: number = 50): Promise<StandardProduct[]> {
  try {
    const email = process.env.MYLEAD_API_EMAIL;
    const password = process.env.MYLEAD_API_PASSWORD;
    const baseUrl = process.env.MYLEAD_API_BASE;
    
    if (!email || !password || !baseUrl) {
      console.log('⚠️ MyLead API credentials not configured');
      return [];
    }

    console.log('📡 Fetching MyLead products...');
    
    // MyLead API integration would go here
    console.warn('⚠️ MyLead API not implemented - returning empty array (NO MOCK DATA)');
    return [];
  } catch (error) {
    console.error('❌ MyLead fetch error:', error);
    return [];
  }
}

// ==================== ALIEXPRESS ====================
async function fetchAliExpressProducts(limit: number = 50): Promise<StandardProduct[]> {
  try {
    const appKey = process.env.ALIEXPRESS_APP_KEY;
    const appSecret = process.env.ALIEXPRESS_APP_SECRET;
    const trackingId = process.env.ALIEXPRESS_TRACKING_ID;
    
    if (!appKey || !appSecret || !trackingId) {
      console.log('⚠️ AliExpress API credentials not configured');
      return [];
    }

    console.log('📡 Fetching AliExpress products...');
    
    // AliExpress API integration would go here
    console.warn('⚠️ AliExpress API not implemented - returning empty array (NO MOCK DATA)');
    return [];
  } catch (error) {
    console.error('❌ AliExpress fetch error:', error);
    return [];
  }
}

// ==================== ADMITAD ====================
async function fetchAdmitadProducts(limit: number = 50): Promise<StandardProduct[]> {
  try {
    const clientId = process.env.ADMITAD_CLIENT_ID;
    const clientSecret = process.env.ADMITAD_CLIENT_SECRET;
    const feedUrl = process.env.ADMITAD_FEED_URL;
    
    if (!clientId || !clientSecret) {
      console.log('⚠️ Admitad API credentials not configured');
      return [];
    }

    console.log('📡 Fetching Admitad products...');
    
    // Admitad API integration would go here
    console.warn('⚠️ Admitad API not implemented - returning empty array (NO MOCK DATA)');
    return [];
  } catch (error) {
    console.error('❌ Admitad fetch error:', error);
    return [];
  }
}

// ==================== AWIN ====================
async function fetchAWINProducts(limit: number = 50): Promise<StandardProduct[]> {
  try {
    const publisherId = process.env.AWIN_PUBLISHER_ID;
    const token = process.env.AWIN_TOKEN;
    
    if (!publisherId || !token) {
      console.log('⚠️ AWIN API credentials not configured');
      return [];
    }

    console.log('📡 Fetching AWIN products...');
    
    // AWIN API integration would go here
    console.warn('⚠️ AWIN API not implemented - returning empty array (NO MOCK DATA)');
    return [];
  } catch (error) {
    console.error('❌ AWIN fetch error:', error);
    return [];
  }
}

// ==================== IMPACT ====================
async function fetchImpactProducts(limit: number = 50): Promise<StandardProduct[]> {
  try {
    const accountSid = process.env.IMPACT_ACCOUNT_SID;
    const apiToken = process.env.IMPACT_API_TOKEN;
    
    if (!accountSid || !apiToken) {
      console.log('⚠️ Impact API credentials not configured');
      return [];
    }

    console.log('📡 Fetching Impact products...');
    
    // Impact API integration would go here
    console.warn('⚠️ Impact API not implemented - returning empty array (NO MOCK DATA)');
    return [];
  } catch (error) {
    console.error('❌ Impact fetch error:', error);
    return [];
  }
}

// ==================== UNIFIED SEARCH ====================
export async function searchAffiliateOffers(
  network?: string,
  category?: string,
  limit: number = 50
): Promise<StandardProduct[]> {
  console.log('🔍 AFFILIATE SERVICE - Searching products:', { network, category, limit });
  
  try {
    let allProducts: StandardProduct[] = [];

    // Fetch from all networks or specific network
    if (!network || network === 'all') {
      console.log('📡 Fetching from ALL networks...');
      const [jvzoo, digistore, warrior, mylead, aliexpress, admitad, awin, impact] = await Promise.all([
        fetchJVZooProducts(limit),
        fetchDigistore24Products(limit),
        fetchWarriorPlusProducts(limit),
        fetchMyLeadProducts(limit),
        fetchAliExpressProducts(limit),
        fetchAdmitadProducts(limit),
        fetchAWINProducts(limit),
        fetchImpactProducts(limit)
      ]);
      
      allProducts = [...jvzoo, ...digistore, ...warrior, ...mylead, ...aliexpress, ...admitad, ...awin, ...impact];
    } else {
      // Fetch from specific network
      console.log(`📡 Fetching from ${network}...`);
      switch (network.toLowerCase()) {
        case 'jvzoo':
          allProducts = await fetchJVZooProducts(limit);
          break;
        case 'digistore24':
          allProducts = await fetchDigistore24Products(limit);
          break;
        case 'warriorplus':
          allProducts = await fetchWarriorPlusProducts(limit);
          break;
        case 'mylead':
          allProducts = await fetchMyLeadProducts(limit);
          break;
        case 'aliexpress':
          allProducts = await fetchAliExpressProducts(limit);
          break;
        case 'admitad':
          allProducts = await fetchAdmitadProducts(limit);
          break;
        case 'awin':
          allProducts = await fetchAWINProducts(limit);
          break;
        case 'impact':
          allProducts = await fetchImpactProducts(limit);
          break;
        default:
          console.log(`⚠️ Unknown network: ${network}`);
      }
    }

    // Filter by category if specified
    if (category && category !== 'all') {
      allProducts = allProducts.filter(p => 
        p.category.toLowerCase() === category.toLowerCase()
      );
    }

    console.log(`✅ AFFILIATE SERVICE - Returning ${allProducts.length} products`);
    return allProducts.slice(0, limit);
  } catch (error) {
    console.error('❌ AFFILIATE SERVICE ERROR:', error);
    return [];
  }
}

// Get available networks
export function getAvailableNetworks(): string[] {
  const networks = [];
  
  if (process.env.JVZOO_API_KEY) networks.push('JVZoo');
  if (process.env.DIGISTORE_API_KEY) networks.push('Digistore24');
  if (process.env.WARRIORPLUS_API_KEY) networks.push('WarriorPlus');
  if (process.env.MYLEAD_API_EMAIL) networks.push('MyLead');
  if (process.env.ALIEXPRESS_APP_KEY) networks.push('AliExpress');
  if (process.env.ADMITAD_CLIENT_ID) networks.push('Admitad');
  if (process.env.AWIN_TOKEN) networks.push('AWIN');
  if (process.env.IMPACT_API_TOKEN) networks.push('Impact');
  
  return networks;
}
