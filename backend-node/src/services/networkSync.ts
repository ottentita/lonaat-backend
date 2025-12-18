import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  const apiKey = process.env.DIGISTORE_API_KEY;
  
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

    const data = await response.json();
    
    if (data.result !== 'success' || !data.data?.products) {
      return { network: 'digistore24', success: true, products_synced: 0, error: 'No products found' };
    }

    let synced = 0;
    for (const product of data.data.products) {
      const existing = await prisma.product.findFirst({
        where: {
          network: 'digistore24',
          extra_data: { path: ['digistore_id'], equals: product.id }
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
            extra_data: {
              digistore_id: product.id,
              commission_rate: product.commission_rate,
              vendor: product.vendor_name,
              raw: product
            },
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
  
  if (!token) {
    return { network: 'awin', success: false, products_synced: 0, error: 'API token not configured' };
  }

  try {
    const response = await fetch('https://api.awin.com/publishers/programmes', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Awin API error: ${response.status}`);
    }

    const programmes = await response.json();
    
    if (!Array.isArray(programmes) || programmes.length === 0) {
      return { network: 'awin', success: true, products_synced: 0, error: 'No programmes found' };
    }

    let synced = 0;
    for (const programme of programmes.slice(0, 50)) {
      const existing = await prisma.product.findFirst({
        where: {
          network: 'awin',
          extra_data: { path: ['awin_programme_id'], equals: programme.id }
        }
      });

      if (!existing) {
        await prisma.product.create({
          data: {
            user_id: userId || null,
            name: programme.name || 'Awin Programme',
            description: programme.description || null,
            price: programme.commissionRange || null,
            affiliate_link: programme.clickThroughUrl || programme.displayUrl || null,
            network: 'awin',
            category: programme.primarySector || null,
            image_url: programme.logoUrl || null,
            extra_data: {
              awin_programme_id: programme.id,
              advertiser_id: programme.advertiserId,
              commission_type: programme.commissionType,
              status: programme.status,
              raw: programme
            },
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
  const apiKey = process.env.PARTNERSTACK_API_KEY;
  
  if (!apiKey) {
    return { network: 'partnerstack', success: false, products_synced: 0, error: 'API key not configured' };
  }

  try {
    const response = await fetch('https://api.partnerstack.com/api/v2/programs', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`PartnerStack API error: ${response.status}`);
    }

    const data = await response.json();
    const programs = data.data || data.programs || data;
    
    if (!Array.isArray(programs) || programs.length === 0) {
      return { network: 'partnerstack', success: true, products_synced: 0, error: 'No programs found' };
    }

    let synced = 0;
    for (const program of programs.slice(0, 50)) {
      const existing = await prisma.product.findFirst({
        where: {
          network: 'partnerstack',
          extra_data: { path: ['partnerstack_program_id'], equals: program.key || program.id }
        }
      });

      if (!existing) {
        await prisma.product.create({
          data: {
            user_id: userId || null,
            name: program.name || program.title || 'PartnerStack Program',
            description: program.description || null,
            price: program.commission?.toString() || null,
            affiliate_link: program.signup_link || program.url || null,
            network: 'partnerstack',
            category: program.category || null,
            image_url: program.logo_url || program.image || null,
            extra_data: {
              partnerstack_program_id: program.key || program.id,
              commission_type: program.commission_type,
              status: program.status,
              raw: program
            },
            is_active: true
          }
        });
        synced++;
      }
    }

    return { network: 'partnerstack', success: true, products_synced: synced };
  } catch (error: any) {
    console.error('PartnerStack sync error:', error);
    return { network: 'partnerstack', success: false, products_synced: 0, error: error.message };
  }
}

export async function syncAllNetworks(userId?: number): Promise<SyncResult[]> {
  const results = await Promise.all([
    syncDigistore24Products(userId),
    syncAwinProducts(userId),
    syncMyLeadProducts(userId),
    syncPartnerStackProducts(userId)
  ]);

  return results;
}

export async function getNetworkStatus(): Promise<{network: string; configured: boolean; key_name: string; sync_type: string}[]> {
  return [
    { network: 'digistore24', configured: !!process.env.DIGISTORE_API_KEY, key_name: 'DIGISTORE_API_KEY', sync_type: 'api' },
    { network: 'awin', configured: !!process.env.AWIN_TOKEN, key_name: 'AWIN_TOKEN', sync_type: 'api' },
    { network: 'mylead', configured: true, key_name: 'N/A', sync_type: 'link-based CPA' },
    { network: 'partnerstack', configured: !!process.env.PARTNERSTACK_API_KEY, key_name: 'PARTNERSTACK_API_KEY', sync_type: 'api' }
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
    case 'partnerstack':
      result = await syncPartnerStackProducts(userId);
      break;
    default:
      throw new Error(`Unknown network: ${network}`);
  }

  if (!result.success && result.error) {
    throw new Error(result.error);
  }

  return result.products_synced;
}
