import prisma from '../prisma';
import cron from 'node-cron';

// ============================================
// PHASE 2: PRODUCT SYNC ENGINE
// ============================================

interface ProductData {
  externalProductId: string;
  name: string;
  title: string;
  description?: string;
  url: string;
  trackingUrl?: string;
  payout?: number;
  network: string;
  category?: string;
  images?: string;
}

// Mock function to fetch products from affiliate APIs
// In production, replace with actual API calls
async function fetchProductsFromAPI(network: string): Promise<ProductData[]> {
  console.log(`📡 Fetching products from ${network}...`);

  // Mock data - replace with actual API calls
  const mockProducts: ProductData[] = [
    {
      externalProductId: `${network}-001`,
      name: 'Sample Product 1',
      title: 'Amazing Product for Health',
      description: 'This is a great product for health and wellness',
      url: 'https://example.com/product-1',
      trackingUrl: 'https://track.example.com/product-1',
      payout: 50,
      network,
      category: 'health',
      images: 'https://example.com/image-1.jpg'
    },
    {
      externalProductId: `${network}-002`,
      name: 'Sample Product 2',
      title: 'Best Tech Gadget',
      description: 'Revolutionary tech gadget',
      url: 'https://example.com/product-2',
      trackingUrl: 'https://track.example.com/product-2',
      payout: 100,
      network,
      category: 'tech',
      images: 'https://example.com/image-2.jpg'
    }
  ];

  return mockProducts;
}

// Sync products from affiliate networks
export async function syncProducts() {
  try {
    console.log('🔄 PRODUCT SYNC STARTED:', new Date().toISOString());

    const networks = ['digistore24', 'awin', 'clickbank']; // Add more networks as needed
    let totalSynced = 0;
    let totalUpdated = 0;
    let totalCreated = 0;

    for (const network of networks) {
      try {
        const products = await fetchProductsFromAPI(network);

        for (const productData of products) {
          try {
            // Check if product exists by externalProductId
            const existingProduct = await prisma.offers.findFirst({
              where: { externalOfferId: productData.externalProductId }
            });

            if (existingProduct) {
              // Update existing product
              await prisma.offers.update({
                where: { id: existingProduct.id },
                data: {
                  name: productData.name,
                  title: productData.title,
                  description: productData.description,
                  url: productData.url,
                  trackingUrl: productData.trackingUrl,
                  payout: productData.payout,
                  network: productData.network,
                  images: productData.images,
                  isActive: true
                }
              });

              totalUpdated++;
              console.log(`✅ Updated product: ${productData.name}`);
            } else {
              // Create new product
              await prisma.offers.create({
                data: {
                  name: productData.name,
                  title: productData.title,
                  slug: `${productData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                  description: productData.description,
                  url: productData.url,
                  trackingUrl: productData.trackingUrl,
                  payout: productData.payout,
                  network: productData.network,
                  externalOfferId: productData.externalProductId,
                  networkName: productData.network,
                  images: productData.images,
                  isActive: true
                }
              });

              totalCreated++;
              console.log(`✅ Created product: ${productData.name}`);
            }

            totalSynced++;
          } catch (productError: any) {
            console.error(`❌ Error syncing product ${productData.externalProductId}:`, productError.message);
          }
        }
      } catch (networkError: any) {
        console.error(`❌ Error fetching from ${network}:`, networkError.message);
      }
    }

    console.log('✅ PRODUCT SYNC COMPLETE:', {
      totalSynced,
      totalCreated,
      totalUpdated,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      totalSynced,
      totalCreated,
      totalUpdated
    };

  } catch (error: any) {
    console.error('❌ PRODUCT SYNC ERROR:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Schedule product sync to run every 6 hours
export function startProductSyncJob() {
  console.log('⏰ Product sync job scheduled (every 6 hours)');

  // Run every 6 hours: 0 */6 * * *
  cron.schedule('0 */6 * * *', async () => {
    console.log('🔔 Product sync job triggered');
    await syncProducts();
  });

  // Run once on startup
  setTimeout(() => {
    console.log('🚀 Running initial product sync...');
    syncProducts();
  }, 5000); // Wait 5 seconds after startup
}
