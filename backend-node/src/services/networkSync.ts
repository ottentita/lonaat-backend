import { prisma } from '../prisma';
import { searchAliExpressProducts, getAdmitadStatus } from './admitadService';



interface SyncResult {
  network: string;
  success: boolean;
  products_synced: number;
  error?: string;
}

interface ProductData {
  name: string;
  description?: string;
  price?: string;
  affiliate_link?: string;
  category?: string;
  image_url?: string;
  extra_data?: any;
}

export async function syncDigistore24Products(userId?: number): Promise<SyncResult> {
  const { digistore } = require('../config/affiliateConfig');
  const apiKey = digistore.apiKey;
  
  if (!apiKey) {
    return { network: 'digistore24', success: false, products_synced: 0, error: 'API key not configured' };
  }

  try {
    const response = await fetch('https://www.digistore24.com/api/call/listProducts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `api_key=${apiKey}`
    });

    if (!response.ok) {
      throw new Error(`Digistore24 API error: ${response.status}`);
    }

    const data = await response.json() as { result: string; data?: { products?: any[] } };
    
    if (data.result !== 'success' || !data.data?.products) {
      return { network: 'digistore24', success: true, products_synced: 0, error: 'No products found' };
    }

    let synced = 0;
    for (const product of data.data.products) {
      const existing = await prisma.product.findFirst({
        where: {
          network: 'digistore24',
          affiliate_link: product.salespage_url || undefined
        }
      });

      if (!existing) {
        await prisma.product.create({
          data: {
            user_id: userId || null,
            name: product.name || 'Digistore24 Product',
            description: product.description || null,
            price: product.price?.toString() || null,
            affiliate_link: product.salespage_url || null,
            network: 'digistore24',
            category: product.category || null,
            image_url: product.image_url || null,
            extra_data: JSON.stringify({
              digistore_id: product.id,
              commission_rate: product.commission_rate,
              vendor: product.vendor_name,
              raw: product
            }),
            is_active: true
          }
        });
        synced++;
      }
    }

    return { network: 'digistore24', success: true, products_synced: synced };
  } catch (error: any) {
    console.error('Digistore24 sync error:', error);
    return { network: 'digistore24', success: false, products_synced: 0, error: error.message };
  }
}

export async function syncAwinProducts(userId?: number): Promise<SyncResult> {
  const token = process.env.AWIN_TOKEN;
  const publisherId = process.env.AWIN_PUBLISHER_ID;
  
  if (!token) {
    return { network: 'awin', success: false, products_synced: 0, error: 'API token not configured' };
  }

  if (!publisherId) {
    return { network: 'awin', success: false, products_synced: 0, error: 'Publisher ID not configured (AWIN_PUBLISHER_ID)' };
  }

  try {
    const response = await fetch(`https://api.awin.com/publishers/${publisherId}/programmes?relationship=joined`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Awin API error: ${response.status} - ${errorText}`);
    }

    const programmes = await response.json();
    
    if (!Array.isArray(programmes) || programmes.length === 0) {
      return { network: 'awin', success: true, products_synced: 0, error: 'No joined programmes found' };
    }

    let synced = 0;
    for (const programme of programmes.slice(0, 50)) {
      const programmeId = programme.programme?.id || programme.id;
      const existing = await prisma.product.findFirst({
        where: {
          network: 'awin',
          affiliate_link: programme.programme?.clickThroughUrl || programme.clickThroughUrl || undefined
        }
      });

      if (!existing) {
        await prisma.product.create({
          data: {
            user_id: userId || null,
            name: programme.programme?.name || programme.name || 'Awin Programme',
            description: programme.programme?.description || programme.description || null,
            price: programme.programme?.commissionRange || null,
            affiliate_link: programme.programme?.clickThroughUrl || programme.clickThroughUrl || null,
            network: 'awin',
            category: programme.programme?.primarySector || programme.primarySector || null,
            image_url: programme.programme?.logoUrl || programme.logoUrl || null,
            extra_data: JSON.stringify({
              awin_programme_id: programmeId,
              advertiser_id: programme.programme?.advertiserId || programme.advertiserId,
              commission_type: programme.commissionType,
              status: programme.status || 'active',
              raw: programme
            }),
            is_active: true
          }
        });
        synced++;
      }
    }

    return { network: 'awin', success: true, products_synced: synced };
  } catch (error: any) {
    console.error('Awin sync error:', error);
    return { network: 'awin', success: false, products_synced: 0, error: error.message };
  }
}

export async function syncMyLeadProducts(userId?: number): Promise<SyncResult> {
  return { 
    network: 'mylead', 
    success: true, 
    products_synced: 0, 
    error: 'MyLead is a link-based CPA network - product sync not available. Use affiliate links directly.' 
  };
}

export async function syncPartnerStackProducts(userId?: number): Promise<SyncResult> {
  // PartnerStack is disabled due to declined account
  return { 
    network: 'partnerstack', 
    success: false, 
    products_synced: 0, 
    error: 'PartnerStack not connected - network disabled' 
  };
}

export async function syncAliExpressProducts(userId?: number): Promise<SyncResult> {
  try {
    const status = await getAdmitadStatus();
    if (!status.configured) {
      return { network: 'aliexpress', success: false, products_synced: 0, error: 'Admitad not configured' };
    }

    const products = await searchAliExpressProducts('trending');
    let synced = 0;

    for (const product of products.slice(0, 20)) {
      const existingProduct = await prisma.product.findFirst({
        where: {
          network: 'aliexpress',
          affiliate_link: product.url || undefined
        }
      });

      if (existingProduct) {
            await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            name: product.name,
            description: product.description,
                price: product.price ? Number(product.price) : null,
            affiliate_link: product.url,
            category: product.category,
            image_url: product.image_url,
            extra_data: JSON.stringify({ 
              external_id: product.id,
              commission_rate: product.commission_rate,
              merchant: product.merchant
            })
          }
        });
      } else {
        await prisma.product.create({
          data: {
            name: product.name,
            description: product.description,
            price: product.price ? Number(product.price) : null,
            affiliate_link: product.url,
            network: 'aliexpress',
            category: product.category,
            image_url: product.image_url,
            user_id: userId,
            extra_data: JSON.stringify({ 
              external_id: product.id,
              commission_rate: product.commission_rate,
              merchant: product.merchant
            })
          }
        });
      }
      synced++;
    }

    return { network: 'aliexpress', success: true, products_synced: synced };
  } catch (error: any) {
    return { network: 'aliexpress', success: false, products_synced: 0, error: error.message };
  }
}

export async function syncAllNetworks(userId?: number): Promise<SyncResult[]> {
  const results = await Promise.all([
    syncDigistore24Products(userId),
    syncAwinProducts(userId),
    syncMyLeadProducts(userId),
    syncAliExpressProducts(userId)
  ]);

  results.push({
    network: 'partnerstack',
    success: false,
    products_synced: 0,
    error: 'PartnerStack not connected - network disabled'
  });

  return results;
}

export async function getNetworkStatus(): Promise<{network: string; configured: boolean; key_name: string; sync_type: string; missing?: string; disabled?: boolean}[]> {
  const awinConfigured = !!process.env.AWIN_TOKEN && !!process.env.AWIN_PUBLISHER_ID;
  const awinMissing = !process.env.AWIN_TOKEN ? 'AWIN_TOKEN' : (!process.env.AWIN_PUBLISHER_ID ? 'AWIN_PUBLISHER_ID' : undefined);
  
  const admitadConfigured = !!(process.env.ADMITAD_ACCESS_TOKEN || (process.env.ADMITAD_CLIENT_ID && process.env.ADMITAD_CLIENT_SECRET));
  const admitadMissing = !admitadConfigured ? 'ADMITAD_ACCESS_TOKEN or ADMITAD_CLIENT_ID+SECRET' : undefined;
  
  return [
    { network: 'digistore24', configured: !!digistore.apiKey, key_name: 'DIGISTORE_API_KEY', sync_type: 'api' },
    { network: 'awin', configured: awinConfigured, key_name: 'AWIN_TOKEN + AWIN_PUBLISHER_ID', sync_type: 'api', missing: awinMissing },
    { network: 'mylead', configured: true, key_name: 'N/A', sync_type: 'postback (link-based CPA)' },
    { network: 'admitad', configured: admitadConfigured, key_name: 'ADMITAD_ACCESS_TOKEN', sync_type: 'api', missing: admitadMissing },
    { network: 'aliexpress', configured: admitadConfigured, key_name: 'Via Admitad', sync_type: 'api (via Admitad)' },
    { network: 'partnerstack', configured: false, key_name: 'N/A', sync_type: 'disabled', disabled: true }
  ];
}

export async function syncProductsFromNetwork(network: string, userId?: number): Promise<number> {
  let result: SyncResult;
  
  switch (network.toLowerCase()) {
    case 'digistore24':
      result = await syncDigistore24Products(userId);
      break;
    case 'awin':
      result = await syncAwinProducts(userId);
      break;
    case 'mylead':
      result = await syncMyLeadProducts(userId);
      break;
    case 'aliexpress':
    case 'admitad':
      result = await syncAliExpressProducts(userId);
      break;
    case 'partnerstack':
      throw new Error('PartnerStack not connected - network disabled');
    default:
      throw new Error(`Unknown network: ${network}`);
  }

  if (!result.success && result.error) {
    throw new Error(result.error);
  }

  return result.products_synced;
}
