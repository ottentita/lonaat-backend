/**
 * PRODUCT SYNC SERVICE LAYER
 * Syncs products from multiple affiliate networks to database
 * Database-first approach - API only reads from database
 */

import axios from 'axios';
import prisma from '../prisma';

interface SyncResult {
  network: string;
  success: boolean;
  productsCount: number;
  error?: string;
}

/**
 * Main sync function - orchestrates all network syncs
 */
export async function syncAllNetworks(): Promise<SyncResult[]> {
  console.log('🔄 STARTING PRODUCT SYNC FOR ALL NETWORKS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const results: SyncResult[] = [];
  
  // Sync each network
  results.push(await syncAdmitad());
  results.push(await syncDigistore());
  results.push(await syncJVZoo());
  results.push(await syncWarriorPlus());
  results.push(await syncImpact());
  results.push(await syncAWIN());
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const totalProducts = results.reduce((sum, r) => sum + r.productsCount, 0);
  
  console.log('\n📊 SYNC SUMMARY:');
  console.log(`   Networks processed: ${results.length}`);
  console.log(`   Successful: ${successful}/${results.length}`);
  console.log(`   Total products synced: ${totalProducts}`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.network}: ${result.productsCount} products${result.error ? ` (${result.error})` : ''}`);
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  return results;
}

/**
 * ADMITAD SYNC - Primary working network
 */
async function syncAdmitad(): Promise<SyncResult> {
  try {
    console.log('🔗 Syncing Admitad products...');
    
    // Check environment variables
    if (!process.env.ADMITAD_CLIENT_ID || !process.env.ADMITAD_CLIENT_SECRET) {
      return {
        network: 'Admitad',
        success: false,
        productsCount: 0,
        error: 'Missing API credentials'
      };
    }
    
    // Get access token
    const token = await getAdmitadToken();
    
    // Fetch products
    const response = await axios.get('https://api.admitad.com/products/', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 30000
    });
    
    const products = response.data.results || [];
    console.log(`📦 Fetched ${products.length} products from Admitad`);
    
    // Transform and save to database
    const transformedProducts = products.map((product: any) => ({
      name: product.name || product.title || 'Unknown Product',
      description: product.description || '',
      price: Math.round(product.price || 0),
      imageUrl: product.image_url || product.picture || '',
      affiliateLink: product.url || product.affiliate_url || '',
      network: 'admitad',
      category: product.category || '',
      externalId: product.id?.toString() || '',
      isActive: true,
      createdAt: new Date()
    }));
    
    // Save to database with duplicate protection
    const savedCount = await saveProductsWithDuplicates(transformedProducts, 'admitad');
    
    console.log(`✅ Admitad sync complete: ${savedCount} new products saved`);
    
    return {
      network: 'Admitad',
      success: true,
      productsCount: savedCount
    };
    
  } catch (error: any) {
    console.error('❌ Admitad sync failed:', error.message);
    return {
      network: 'Admitad',
      success: false,
      productsCount: 0,
      error: error.message
    };
  }
}

/**
 * Get Admitad access token
 */
async function getAdmitadToken(): Promise<string> {
  const response = await axios.post('https://api.admitad.com/token/', {
    grant_type: 'client_credentials',
    client_id: process.env.ADMITAD_CLIENT_ID,
    client_secret: process.env.ADMITAD_CLIENT_SECRET,
    scope: 'products'
  }, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  
  return response.data.access_token;
}

/**
 * DIGISTORE24 SYNC - Manual/CSV import only
 */
async function syncDigistore(): Promise<SyncResult> {
  console.log('⚠️ Digistore24 requires manual or CSV import');
  console.log('   - No public product listing API available');
  console.log('   - Use manual curation or CSV export');
  
  return {
    network: 'Digistore24',
    success: true,
    productsCount: 0,
    error: 'Manual import required'
  };
}

/**
 * JVZOO SYNC - Limited access, manual curation
 */
async function syncJVZoo(): Promise<SyncResult> {
  console.log('⚠️ JVZoo uses manual curated products');
  console.log('   - No open public product API');
  console.log('   - Requires vendor/affiliate access');
  
  return {
    network: 'JVZoo',
    success: true,
    productsCount: 0,
    error: 'Manual curation required'
  };
}

/**
 * WARRIORPLUS SYNC - Limited API access
 */
async function syncWarriorPlus(): Promise<SyncResult> {
  console.log('⚠️ WarriorPlus limited API access');
  console.log('   - Requires affiliate credentials');
  console.log('   - Manual curation recommended');
  
  return {
    network: 'WarriorPlus',
    success: true,
    productsCount: 0,
    error: 'Manual curation required'
  };
}

/**
 * IMPACT SYNC - Requires partnership
 */
async function syncImpact(): Promise<SyncResult> {
  console.log('⚠️ Impact requires partnership credentials');
  console.log('   - No public product API');
  console.log('   - Manual curation required');
  
  return {
    network: 'Impact',
    success: true,
    productsCount: 0,
    error: 'Manual curation required'
  };
}

/**
 * AWIN SYNC - Limited API access
 */
async function syncAWIN(): Promise<SyncResult> {
  console.log('⚠️ AWIN limited API access');
  console.log('   - Requires publisher credentials');
  console.log('   - Manual curation recommended');
  
  return {
    network: 'AWIN',
    success: true,
    productsCount: 0,
    error: 'Manual curation required'
  };
}

/**
 * Save products with duplicate protection
 */
async function saveProductsWithDuplicates(products: any[], network: string): Promise<number> {
  let savedCount = 0;
  
  for (const product of products) {
    try {
      // Check if product already exists by affiliate link
      const existing = await prisma.products.findFirst({
        where: {
          affiliateLink: product.affiliateLink
        }
      });
      
      if (!existing) {
        await prisma.products.create({
          data: product
        });
        savedCount++;
      }
    } catch (error) {
      console.error(`Error saving product ${product.name}:`, error);
    }
  }
  
  // 🔥 CACHE INVALIDATION (IMPORTANT)
  if (savedCount > 0) {
    const { productCacheService } = await import('./productCache.service');
    productCacheService.invalidateCache();
    console.log(`🗑️ Cache invalidated due to product sync: ${savedCount} new products`);
  }
  
  return savedCount;
}

/**
 * Manual product import for networks without APIs
 */
export async function importManualProducts(products: any[], network: string): Promise<SyncResult> {
  try {
    console.log(`📦 Importing ${products.length} manual products for ${network}`);
    
    const transformedProducts = products.map(product => ({
      name: product.name,
      description: product.description || '',
      price: Math.round(product.price || 0),
      imageUrl: product.imageUrl || product.image || '',
      affiliateLink: product.affiliateLink || product.url,
      network: network.toLowerCase(),
      category: product.category || '',
      externalId: product.id?.toString() || '',
      isActive: true,
      createdAt: new Date()
    }));
    
    const savedCount = await saveProductsWithDuplicates(transformedProducts, network);
    
    console.log(`✅ Manual import complete: ${savedCount} products saved`);
    
    // 🔥 CACHE INVALIDATION (IMPORTANT) - handled in saveProductsWithDuplicates
    
    return {
      network: network,
      success: true,
      productsCount: savedCount
    };
    
  } catch (error: any) {
    console.error(`❌ Manual import failed for ${network}:`, error.message);
    return {
      network: network,
      success: false,
      productsCount: 0,
      error: error.message
    };
  }
}

/**
 * Get sync statistics
 */
export async function getSyncStats() {
  const stats = await prisma.products.groupBy({
    by: ['network'],
    _count: {
      id: true
    },
    where: {
      isActive: true
    }
  });
  
  return stats.map(stat => ({
    network: stat.network,
    productCount: stat._count.id
  }));
}
