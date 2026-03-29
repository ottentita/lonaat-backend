import { prisma } from '../prisma';

interface ProductData {
  name: string;
  description?: string;
  price?: number;
  commission?: number;
  image_url?: string;
  affiliate_link: string;
  network: string;
  category?: string;
}

/**
 * Ingest a single product with validation
 * - Validates affiliate_link is not empty
 * - Prevents duplicates using unique constraint
 * - Returns created product or null if duplicate
 */
export async function ingestProduct(productData: ProductData) {
  try {
    // Validate affiliate_link
    if (!productData.affiliate_link || productData.affiliate_link.trim() === '') {
      console.error('❌ Product ingestion failed: Empty affiliate_link');
      return { success: false, error: 'Affiliate link is required' };
    }

    // Validate network
    if (!productData.network || productData.network.trim() === '') {
      console.error('❌ Product ingestion failed: Empty network');
      return { success: false, error: 'Network is required' };
    }

    // Validate name
    if (!productData.name || productData.name.trim() === '') {
      console.error('❌ Product ingestion failed: Empty name');
      return { success: false, error: 'Product name is required' };
    }

    // Check if product already exists (by affiliate_link)
    const existing = await prisma.product.findUnique({
      where: { affiliate_link: productData.affiliate_link }
    });

    if (existing) {
      console.log(`ℹ️ Product already exists: ${productData.name} (${productData.network})`);
      return { success: false, error: 'Duplicate product', duplicate: true };
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name: productData.name.trim(),
        description: productData.description?.trim() || null,
        price: productData.price || null,
        commission: productData.commission || null,
        image_url: productData.image_url?.trim() || null,
        affiliate_link: productData.affiliate_link.trim(),
        network: productData.network.trim(),
        category: productData.category?.trim() || null,
        is_active: true,
        isValid: true
      }
    });

    console.log(`✅ Product ingested: ${product.name} (ID: ${product.id}, Network: ${product.network})`);

    return { success: true, product };

  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      console.log(`ℹ️ Duplicate product detected: ${productData.name}`);
      return { success: false, error: 'Duplicate product', duplicate: true };
    }

    console.error('❌ Product ingestion error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Bulk ingest products with validation
 * - Filters out duplicates
 * - Validates all products
 * - Returns summary of ingestion
 */
export async function bulkIngestProducts(products: ProductData[]) {
  console.log(`📦 Starting bulk ingestion of ${products.length} products...`);

  const results = {
    total: products.length,
    ingested: 0,
    duplicates: 0,
    errors: 0,
    errorDetails: [] as string[]
  };

  for (const productData of products) {
    const result = await ingestProduct(productData);

    if (result.success) {
      results.ingested++;
    } else if (result.duplicate) {
      results.duplicates++;
    } else {
      results.errors++;
      results.errorDetails.push(`${productData.name}: ${result.error}`);
    }
  }

  console.log(`✅ Bulk ingestion complete:`, results);

  return results;
}

/**
 * Get product statistics
 */
export async function getProductStats() {
  const [total, byNetwork, active] = await Promise.all([
    prisma.product.count(),
    prisma.product.groupBy({
      by: ['network'],
      _count: true
    }),
    prisma.product.count({ where: { is_active: true } })
  ]);

  return {
    total,
    active,
    inactive: total - active,
    byNetwork: byNetwork.map(n => ({
      network: n.network,
      count: n?._count ?? 0
    }))
  };
}

/**
 * Validate product data before ingestion
 */
export function validateProductData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('Product name is required');
  }

  if (!data.affiliate_link || typeof data.affiliate_link !== 'string' || data.affiliate_link.trim() === '') {
    errors.push('Affiliate link is required');
  }

  if (!data.network || typeof data.network !== 'string' || data.network.trim() === '') {
    errors.push('Network is required');
  }

  // Validate URL format
  if (data.affiliate_link) {
    try {
      new URL(data.affiliate_link);
    } catch {
      errors.push('Affiliate link must be a valid URL');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  ingestProduct,
  bulkIngestProducts,
  getProductStats,
  validateProductData
};
