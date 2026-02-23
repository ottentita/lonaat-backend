import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

const prisma = new PrismaClient();

interface FeedProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  url: string;
  category: string;
  merchant: string;
  availability: string;
  gtin?: string;
  description?: string;
}

export async function importAdmitadFeed(feedUrl?: string): Promise<{ imported: number; updated: number; errors: number }> {
  const url = feedUrl || process.env.ADMITAD_FEED_URL;
  
  if (!url) {
    throw new Error('ADMITAD_FEED_URL not configured');
  }

  console.log('Fetching Admitad XML feed...');
  
  try {
    const response = await axios.get(url, {
      timeout: 60000,
      headers: {
        'User-Agent': 'Lonaat/2.0 Feed Importer'
      }
    });

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
    
    const parsed = parser.parse(response.data);
    
    const offers = parsed?.yml_catalog?.shop?.offers?.offer || 
                   parsed?.rss?.channel?.item ||
                   parsed?.feed?.entry ||
                   [];
    
    const products: FeedProduct[] = Array.isArray(offers) ? offers : [offers];
    
    let imported = 0;
    let updated = 0;
    let errors = 0;

    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!adminUser) {
      throw new Error('No admin user found');
    }

    for (const item of products) {
      try {
        const productData = mapFeedProduct(item);
        
        if (!productData.name || !productData.url) {
          errors++;
          continue;
        }

        const existingProduct = await prisma.product.findFirst({
          where: {
            affiliate_link: productData.url
          }
        });

        if (existingProduct) {
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              name: productData.name,
              description: productData.description,
              price: `${productData.price} ${productData.currency}`,
              image_url: productData.image,
              category: productData.category,
              extra_data: JSON.stringify({
                ...(typeof existingProduct.extra_data === 'string' ? {} : (existingProduct.extra_data as any) || {}),
                feed_id: productData.id,
                gtin: productData.gtin,
                merchant: productData.merchant,
                availability: productData.availability,
                source: 'admitad_feed',
                last_sync: new Date().toISOString()
              })
            }
          });
          updated++;
        } else {
          await prisma.product.create({
            data: {
              user_id: adminUser.id,
              name: productData.name,
              description: productData.description || '',
              price: `${productData.price} ${productData.currency}`,
              affiliate_link: productData.url,
              image_url: productData.image,
              network: 'admitad',
              category: productData.category,
              is_active: true,
              extra_data: JSON.stringify({
                feed_id: productData.id,
                gtin: productData.gtin,
                merchant: productData.merchant,
                availability: productData.availability,
                source: 'admitad_feed',
                imported_at: new Date().toISOString()
              })
            }
          });
          imported++;
        }
      } catch (err) {
        console.error('Error processing product:', err);
        errors++;
      }
    }

    console.log(`Feed import complete: ${imported} imported, ${updated} updated, ${errors} errors`);
    return { imported, updated, errors };
  } catch (error: any) {
    console.error('Feed import error:', error.message);
    throw error;
  }
}

function mapFeedProduct(item: any): FeedProduct {
  return {
    id: item['@_id'] || item.id || item.guid || String(Math.random()),
    name: item.name || item.title || item['@_name'] || '',
    price: Number(item.price || item.priceAmount || '0'),
    currency: item.currencyId || item.currency || item.priceCurrency || 'USD',
    image: item.picture || item.image || item.enclosure?.['@_url'] || '',
    url: item.url || item.link || '',
    category: item.categoryId || item.category || 'General',
    merchant: item.vendor || item.merchant || item.author || 'Unknown',
    availability: item.available === 'true' || item.availability === 'in stock' ? 'in_stock' : 'out_of_stock',
    gtin: item.barcode || item.gtin || item.ean || undefined,
    description: item.description || item.summary || ''
  };
}

let feedSyncInterval: NodeJS.Timeout | null = null;

export function startFeedSyncScheduler(intervalHours: number = 6): void {
  if (feedSyncInterval) {
    clearInterval(feedSyncInterval);
  }

  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  feedSyncInterval = setInterval(async () => {
    try {
      console.log('Running scheduled feed sync...');
      await importAdmitadFeed();
    } catch (error) {
      console.error('Scheduled feed sync failed:', error);
    }
  }, intervalMs);

  console.log(`Feed sync scheduler started (every ${intervalHours} hours)`);
}

export function stopFeedSyncScheduler(): void {
  if (feedSyncInterval) {
    clearInterval(feedSyncInterval);
    feedSyncInterval = null;
    console.log('Feed sync scheduler stopped');
  }
}
