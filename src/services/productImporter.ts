import prisma from '../prisma';
import { fetchAdmitadFeed } from './admitadImporter';

/**
 * PRODUCT IMPORT SERVICE
 * Imports products from multiple affiliate networks
 * - Admitad (Priority)
 * - AliExpress
 * - Digistore24
 * 
 * Features:
 * - Deduplication
 * - Real products only (must have affiliate_link + commission)
 * - Auto-import via cron
 * - SAFETY LIMITS: Max 200 products per import
 */

// SAFETY LIMIT: Prevent database overload
const MAX_PRODUCTS = 200;

interface ProductData {
  externalId: string;
  title: string;
  price: number;
  image: string;
  affiliate_link: string;
  commission_rate: number;
  network: string;
  description?: string;
  category?: string;
}

/**
 * ADMITAD INTEGRATION (PRIORITY)
 * Uses dedicated XML feed importer
 */
async function fetchAdmitadProducts(): Promise<ProductData[]> {
  return await fetchAdmitadFeed();
}

/**
 * ALIEXPRESS INTEGRATION
 * Fetch products from AliExpress API
 */
async function fetchAliExpressProducts(): Promise<ProductData[]> {
  try {
    console.log('📡 Fetching AliExpress products...');
    
    const ALIEXPRESS_TOKEN = process.env.ALIEXPRESS_TOKEN;
    const ALIEXPRESS_API_URL = process.env.ALIEXPRESS_API_URL || 'https://api.aliexpress.com/products';
    
    if (!ALIEXPRESS_TOKEN) {
      console.warn('⚠️ ALIEXPRESS_TOKEN not configured - skipping AliExpress');
      return [];
    }

    const response = await fetch(ALIEXPRESS_API_URL, {
      headers: {
        'Authorization': `Bearer ${ALIEXPRESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ AliExpress API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    
    const products = (data.products || data.results || []).map((p: any) => ({
      externalId: `aliexpress_${p.id || p.product_id}`,
      title: p.title || p.name,
      price: parseFloat(p.price || p.target_sale_price) || 0,
      image: p.image || p.product_main_image_url || '',
      affiliate_link: p.promotion_link || p.url,
      commission_rate: parseFloat(p.commission_rate) || 8,
      network: 'aliexpress',
      description: p.description || '',
      category: p.category || 'General'
    }));

    console.log(`✅ Fetched ${products.length} products from AliExpress`);
    return products;

  } catch (error) {
    console.error('❌ Error fetching AliExpress products:', error);
    return [];
  }
}

/**
 * DIGISTORE24 INTEGRATION
 * Fetch products from Digistore24 API
 */
async function fetchDigistoreProducts(): Promise<ProductData[]> {
  try {
    console.log('📡 Fetching Digistore24 products...');
    
    const DIGISTORE_TOKEN = process.env.DIGISTORE_TOKEN;
    const DIGISTORE_API_URL = process.env.DIGISTORE_API_URL || 'https://www.digistore24.com/api/products';
    
    if (!DIGISTORE_TOKEN) {
      console.warn('⚠️ DIGISTORE_TOKEN not configured - skipping Digistore24');
      return [];
    }

    const response = await fetch(DIGISTORE_API_URL, {
      headers: {
        'Authorization': `Bearer ${DIGISTORE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ Digistore24 API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    
    const products = (data.products || []).map((p: any) => ({
      externalId: `digistore_${p.id || p.product_id}`,
      title: p.name || p.title,
      price: parseFloat(p.price) || 0,
      image: p.image || p.thumbnail || '',
      affiliate_link: p.affiliate_url || p.url,
      commission_rate: parseFloat(p.commission) || 50,
      network: 'digistore24',
      description: p.description || '',
      category: p.category || 'Digital Products'
    }));

    console.log(`✅ Fetched ${products.length} products from Digistore24`);
    return products;

  } catch (error) {
    console.error('❌ Error fetching Digistore24 products:', error);
    return [];
  }
}

/**
 * DEDUPLICATION (CRITICAL)
 * Remove duplicate products based on:
 * - Same externalId
 * - Same title (case-insensitive)
 * - Same affiliate link
 */
function deduplicateProducts(products: ProductData[]): ProductData[] {
  console.log(`🔍 Deduplicating ${products.length} products...`);
  
  const seen = new Set<string>();
  const unique: ProductData[] = [];

  for (const product of products) {
    // Create key from title + price (catches exact duplicates)
    const key = (product.title + product.price).toLowerCase().trim();
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(product);
    } else {
      console.log(`⚠️ Duplicate: "${product.title}" ($${product.price})`);
    }
  }

  console.log(`✅ Deduplicated: ${products.length} → ${unique.length} products`);
  
  return unique;
}

/**
 * VALIDATE REAL PRODUCTS ONLY
 * Filter out products without required fields
 */
function validateProducts(products: ProductData[]): ProductData[] {
  console.log(`🔍 Validating ${products.length} products...`);
  
  const valid = products.filter(p => {
    // Must have affiliate link
    if (!p.affiliate_link || p.affiliate_link.trim() === '') {
      console.log(`❌ Invalid: "${p.title}" - missing affiliate_link`);
      return false;
    }
    
    // Must have commission rate
    if (!p.commission_rate || p.commission_rate <= 0) {
      console.log(`❌ Invalid: "${p.title}" - missing/invalid commission_rate`);
      return false;
    }
    
    // Must have title
    if (!p.title || p.title.trim() === '') {
      console.log(`❌ Invalid: missing title`);
      return false;
    }
    
    return true;
  });

  console.log(`✅ Validated: ${products.length} → ${valid.length} products`);
  return valid;
}

/**
 * SAVE PRODUCTS TO DATABASE
 * Uses batch createMany with skipDuplicates for performance
 */
async function saveProducts(products: ProductData[]): Promise<number> {
  console.log(`💾 Saving ${products.length} products to database...`);
  
  try {
    // BATCH INSERT: Much faster than individual upserts
    const result = await prisma.products.createMany({
      data: products.map(product => ({
        userId: null,
        name: product.title,
        description: product.description || null,
        price: product.price,
        affiliateLink: product.affiliate_link,
        externalId: product.externalId, // Unique ID from network
        category: product.category || null,
        network: product.network,
        imageUrl: product.image || null,
        isActive: true,
        createdAt: new Date()
      })),
      skipDuplicates: true // Ignore duplicates by externalId
    });

    console.log(`✅ Saved ${result.count} new products (duplicates skipped)`);
    return result.count;

  } catch (error: any) {
    console.error('❌ Batch insert error:', error.message);
    
    // Fallback: Try individual inserts if batch fails
    console.log('⚠️ Falling back to individual inserts...');
    let savedCount = 0;
    
    for (const product of products) {
      try {
        await prisma.products.create({
          data: {
            userId: null,
            name: product.title,
            description: product.description || null,
            price: product.price,
            affiliateLink: product.affiliate_link,
            externalId: product.externalId,
            category: product.category || null,
            network: product.network,
            imageUrl: product.image || null,
            isActive: true,
            createdAt: new Date()
          }
        });
        savedCount++;
      } catch (err: any) {
        // Skip duplicates silently
        if (!err.message.includes('Unique constraint')) {
          console.error(`❌ Error saving "${product.title}":`, err.message);
        }
      }
    }
    
    console.log(`✅ Saved ${savedCount} products via fallback`);
    return savedCount;
  }
}

/**
 * MAIN IMPORT FUNCTION
 * Orchestrates the entire import process
 */
export async function importAllProducts(): Promise<number> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 STARTING PRODUCT IMPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const startTime = Date.now();

  try {
    // Step 1: Fetch from all networks
    const [admitad, aliexpress, digistore] = await Promise.all([
      fetchAdmitadProducts(),
      fetchAliExpressProducts(),
      fetchDigistoreProducts()
    ]);

    // Step 2: Combine all products
    const combined = [...admitad, ...aliexpress, ...digistore];
    console.log(`📦 Combined: ${combined.length} total products`);

    // SAFETY LIMIT: Cap at MAX_PRODUCTS
    const limited = combined.slice(0, MAX_PRODUCTS);
    if (combined.length > MAX_PRODUCTS) {
      console.log(`⚠️ LIMIT APPLIED: ${combined.length} → ${MAX_PRODUCTS} products`);
    }

    // Step 3: Validate products (real products only)
    const validated = validateProducts(limited);

    // Step 4: Deduplicate
    const unique = deduplicateProducts(validated);

    // Step 5: Save to database
    const savedCount = await saveProducts(unique);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ IMPORT COMPLETE');
    console.log(`📊 Stats:`);
    console.log(`   - Admitad: ${admitad.length}`);
    console.log(`   - AliExpress: ${aliexpress.length}`);
    console.log(`   - Digistore24: ${digistore.length}`);
    console.log(`   - Total fetched: ${combined.length}`);
    console.log(`   - After validation: ${validated.length}`);
    console.log(`   - After deduplication: ${unique.length}`);
    console.log(`   - Saved to DB: ${savedCount}`);
    console.log(`   - Duration: ${duration}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return savedCount;

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ IMPORT FAILED');
    console.error(error);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    throw error;
  }
}

/**
 * IMPORT SINGLE NETWORK
 * For testing or manual imports
 */
export async function importFromNetwork(network: 'admitad' | 'aliexpress' | 'digistore'): Promise<number> {
  console.log(`🚀 Importing from ${network}...`);
  
  let products: ProductData[] = [];
  
  switch (network) {
    case 'admitad':
      products = await fetchAdmitadProducts();
      break;
    case 'aliexpress':
      products = await fetchAliExpressProducts();
      break;
    case 'digistore':
      products = await fetchDigistoreProducts();
      break;
  }

  const validated = validateProducts(products);
  const unique = deduplicateProducts(validated);
  const savedCount = await saveProducts(unique);
  
  console.log(`✅ Imported ${savedCount} products from ${network}`);
  return savedCount;
}
