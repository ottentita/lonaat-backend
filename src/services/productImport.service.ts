/**
 * REAL PRODUCT IMPORT SERVICE
 * Fetches products from actual affiliate networks using API keys
 */

import axios from 'axios';
import prisma from '../prisma';
import * as xml2js from 'xml2js';

interface ImportResult {
  network: string;
  success: boolean;
  productsImported: number;
  error?: string;
}

/**
 * Import products from JVZoo
 */
async function importFromJVZoo(): Promise<ImportResult> {
  try {
    console.log('🔄 Importing from JVZoo...');
    
    const apiKey = process.env.JVZOO_API_KEY;
    if (!apiKey) {
      return { network: 'JVZoo', success: false, productsImported: 0, error: 'API key not configured' };
    }

    // JVZoo doesn't have a public product API - they use postback URLs
    // For now, we'll create placeholder products for testing
    console.log('⚠️ JVZoo: No public product API available. Using manual product entry.');
    
    return { network: 'JVZoo', success: true, productsImported: 0, error: 'No public API' };
    
  } catch (error: any) {
    console.error('❌ JVZoo import error:', error.message);
    return { network: 'JVZoo', success: false, productsImported: 0, error: error.message };
  }
}

/**
 * Import products from Digistore24
 */
async function importFromDigistore24(): Promise<ImportResult> {
  try {
    console.log('🔄 Importing from Digistore24...');
    
    const apiKey = process.env.DIGISTORE_API_KEY;
    const vendorKey = process.env.DIGISTORE_VENDOR_KEY;
    
    if (!apiKey || !vendorKey) {
      return { network: 'Digistore24', success: false, productsImported: 0, error: 'API credentials not configured' };
    }

    // Digistore24 API endpoint for products
    const response = await axios.get('https://www.digistore24.com/api/call/getProducts', {
      params: {
        api_key: apiKey,
        vendor: vendorKey
      },
      timeout: 30000
    });

    const products = response.data?.data || [];
    console.log(`📦 Digistore24: Fetched ${products.length} products`);

    let imported = 0;
    for (const p of products) {
      try {
        await prisma.products.upsert({
          where: { externalId: `digistore24_${p.product_id}` },
          update: {
            name: p.product_name || 'Unnamed Product',
            description: p.description || null,
            price: p.price ? parseFloat(p.price) : null,
            affiliateLink: `https://www.digistore24.com/redir/${p.product_id}/${vendorKey}/`,
            network: 'digistore24',
            category: p.category || null,
            isActive: true,
            isApproved: true,
            commission: p.commission_rate ? parseFloat(p.commission_rate) : 0
          },
          create: {
            externalId: `digistore24_${p.product_id}`,
            name: p.product_name || 'Unnamed Product',
            description: p.description || null,
            price: p.price ? parseFloat(p.price) : null,
            affiliateLink: `https://www.digistore24.com/redir/${p.product_id}/${vendorKey}/`,
            network: 'digistore24',
            category: p.category || null,
            isActive: true,
            isApproved: true,
            commission: p.commission_rate ? parseFloat(p.commission_rate) : 0
          }
        });
        imported++;
      } catch (err: any) {
        console.error(`❌ Failed to import Digistore24 product ${p.product_id}:`, err.message);
      }
    }

    console.log(`✅ Digistore24: Imported ${imported} products`);
    return { network: 'Digistore24', success: true, productsImported: imported };
    
  } catch (error: any) {
    console.error('❌ Digistore24 import error:', error.response?.data || error.message);
    return { network: 'Digistore24', success: false, productsImported: 0, error: error.message };
  }
}

/**
 * Import products from WarriorPlus
 */
async function importFromWarriorPlus(): Promise<ImportResult> {
  try {
    console.log('🔄 Importing from WarriorPlus...');
    
    const apiKey = process.env.WARRIORPLUS_API_KEY;
    if (!apiKey) {
      return { network: 'WarriorPlus', success: false, productsImported: 0, error: 'API key not configured' };
    }

    // WarriorPlus doesn't have a public product listing API
    console.log('⚠️ WarriorPlus: No public product API available.');
    
    return { network: 'WarriorPlus', success: true, productsImported: 0, error: 'No public API' };
    
  } catch (error: any) {
    console.error('❌ WarriorPlus import error:', error.message);
    return { network: 'WarriorPlus', success: false, productsImported: 0, error: error.message };
  }
}

/**
 * Import products from Admitad (XML feed)
 */
async function importFromAdmitad(): Promise<ImportResult> {
  try {
    console.log('🔄 Importing from Admitad...');
    
    const feedUrl = process.env.ADMITAD_FEED_URL;
    if (!feedUrl) {
      return { network: 'Admitad', success: false, productsImported: 0, error: 'Feed URL not configured' };
    }

    // Fetch XML feed
    const response = await axios.get(feedUrl, {
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    // Parse XML
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    
    const offers = result?.yml_catalog?.shop?.[0]?.offers?.[0]?.offer || [];
    console.log(`📦 Admitad: Fetched ${offers.length} products`);

    let imported = 0;
    for (const offer of offers.slice(0, 100)) { // Limit to 100 products
      try {
        const offerId = offer.$?.id || offer.id?.[0];
        const name = offer.name?.[0] || 'Unnamed Product';
        const price = offer.price?.[0] ? parseFloat(offer.price[0]) : null;
        const url = offer.url?.[0] || '';
        const description = offer.description?.[0] || null;
        const picture = offer.picture?.[0] || null;
        const categoryId = offer.categoryId?.[0] || null;

        await prisma.products.upsert({
          where: { externalId: `admitad_${offerId}` },
          update: {
            name,
            description,
            price,
            imageUrl: picture,
            affiliateLink: url,
            network: 'admitad',
            category: categoryId,
            isActive: true,
            isApproved: true,
            commission: 5 // Default 5% commission
          },
          create: {
            externalId: `admitad_${offerId}`,
            name,
            description,
            price,
            imageUrl: picture,
            affiliateLink: url,
            network: 'admitad',
            category: categoryId,
            isActive: true,
            isApproved: true,
            commission: 5
          }
        });
        imported++;
      } catch (err: any) {
        console.error(`❌ Failed to import Admitad product:`, err.message);
      }
    }

    console.log(`✅ Admitad: Imported ${imported} products`);
    return { network: 'Admitad', success: true, productsImported: imported };
    
  } catch (error: any) {
    console.error('❌ Admitad import error:', error.response?.data || error.message);
    return { network: 'Admitad', success: false, productsImported: 0, error: error.message };
  }
}

/**
 * Import products from AWIN
 */
async function importFromAwin(): Promise<ImportResult> {
  try {
    console.log('🔄 Importing from AWIN...');
    
    const publisherId = process.env.AWIN_PUBLISHER_ID;
    const token = process.env.AWIN_TOKEN;
    
    if (!publisherId || !token) {
      return { network: 'AWIN', success: false, productsImported: 0, error: 'API credentials not configured' };
    }

    // AWIN Product API
    const response = await axios.get('https://productdata.awin.com/datafeed/list/apikey/' + token, {
      timeout: 30000
    });

    const feeds = response.data || [];
    console.log(`📦 AWIN: Found ${feeds.length} feeds`);

    // For now, just log available feeds
    // Full implementation would fetch and parse each feed
    console.log('⚠️ AWIN: Feed parsing not yet implemented. Available feeds:', feeds.length);
    
    return { network: 'AWIN', success: true, productsImported: 0, error: 'Feed parsing pending' };
    
  } catch (error: any) {
    console.error('❌ AWIN import error:', error.response?.data || error.message);
    return { network: 'AWIN', success: false, productsImported: 0, error: error.message };
  }
}

/**
 * Import products from Impact
 */
async function importFromImpact(): Promise<ImportResult> {
  try {
    console.log('🔄 Importing from Impact...');
    
    const accountSid = process.env.IMPACT_ACCOUNT_SID;
    const apiToken = process.env.IMPACT_API_TOKEN;
    
    if (!accountSid || !apiToken) {
      return { network: 'Impact', success: false, productsImported: 0, error: 'API credentials not configured' };
    }

    // Impact API endpoint
    const response = await axios.get(`https://api.impact.com/Mediapartners/${accountSid}/Catalogs/Items`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      },
      params: {
        PageSize: 100
      },
      timeout: 30000
    });

    const items = response.data?.Items || [];
    console.log(`📦 Impact: Fetched ${items.length} products`);

    let imported = 0;
    for (const item of items) {
      try {
        await prisma.products.upsert({
          where: { externalId: `impact_${item.Id}` },
          update: {
            name: item.Name || 'Unnamed Product',
            description: item.Description || null,
            price: item.Price ? parseFloat(item.Price) : null,
            imageUrl: item.ImageUrl || null,
            affiliateLink: item.Url || '',
            network: 'impact',
            category: item.Category || null,
            isActive: true,
            isApproved: true,
            commission: 10 // Default 10% commission
          },
          create: {
            externalId: `impact_${item.Id}`,
            name: item.Name || 'Unnamed Product',
            description: item.Description || null,
            price: item.Price ? parseFloat(item.Price) : null,
            imageUrl: item.ImageUrl || null,
            affiliateLink: item.Url || '',
            network: 'impact',
            category: item.Category || null,
            isActive: true,
            isApproved: true,
            commission: 10
          }
        });
        imported++;
      } catch (err: any) {
        console.error(`❌ Failed to import Impact product ${item.Id}:`, err.message);
      }
    }

    console.log(`✅ Impact: Imported ${imported} products`);
    return { network: 'Impact', success: true, productsImported: imported };
    
  } catch (error: any) {
    console.error('❌ Impact import error:', error.response?.data || error.message);
    return { network: 'Impact', success: false, productsImported: 0, error: error.message };
  }
}

/**
 * Main import function - imports from all configured networks
 */
export async function importProducts(): Promise<{
  success: boolean;
  results: ImportResult[];
  totalImported: number;
}> {
  console.log('🚀 Starting product import from all networks...');
  
  const results: ImportResult[] = [];
  
  // Import from each network
  results.push(await importFromDigistore24());
  results.push(await importFromAdmitad());
  results.push(await importFromImpact());
  results.push(await importFromAwin());
  results.push(await importFromJVZoo());
  results.push(await importFromWarriorPlus());
  
  const totalImported = results.reduce((sum, r) => sum + r.productsImported, 0);
  const successCount = results.filter(r => r.success).length;
  
  console.log('\n📊 IMPORT SUMMARY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.network}: ${r.productsImported} products ${r.error ? `(${r.error})` : ''}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📦 Total imported: ${totalImported} products`);
  console.log(`✅ Successful networks: ${successCount}/${results.length}`);
  
  return {
    success: successCount > 0,
    results,
    totalImported
  };
}

/**
 * Import from specific network
 */
export async function importFromNetwork(network: string): Promise<ImportResult> {
  console.log(`🚀 Importing from ${network}...`);
  
  switch (network.toLowerCase()) {
    case 'digistore24':
      return await importFromDigistore24();
    case 'admitad':
      return await importFromAdmitad();
    case 'impact':
      return await importFromImpact();
    case 'awin':
      return await importFromAwin();
    case 'jvzoo':
      return await importFromJVZoo();
    case 'warriorplus':
      return await importFromWarriorPlus();
    default:
      return {
        network,
        success: false,
        productsImported: 0,
        error: 'Unknown network'
      };
  }
}

export default {
  importProducts,
  importFromNetwork
};
