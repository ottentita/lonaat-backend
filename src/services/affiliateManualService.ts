// Manual Product Service
// Allow admin/users to add affiliate products manually

import { prisma } from '../prisma';
import { AffiliateProduct } from './affiliateConnectors';

export interface ManualProductInput {
  title: string;
  description: string;
  price: number;
  commission?: number;
  affiliate_link: string;
  image: string;
  category: string;
  network?: string;
  currency?: string;
}

export class ManualProductService {
  // Add a manual product
  async addManualProduct(
    data: ManualProductInput,
    userId?: number
  ): Promise<AffiliateProduct> {
    const product = await prisma.product.create({
      data: {
        name: data.title,
        description: data.description,
        price: data.price,
        image_url: data.image,
        affiliate_link: data.affiliate_link,
        network: data.network || 'manual',
        category: data.category,
        user_id: userId,
        is_active: true,
        source: 'manual',
        extra_data: JSON.stringify({
          commission: data.commission || 0,
          currency: data.currency || 'USD',
          added_manually: true,
          added_at: new Date().toISOString()
        })
      }
    });

    return this.formatProduct(product);
  }

  // Update a manual product
  async updateManualProduct(
    id: number,
    data: Partial<ManualProductInput>,
    userId?: number
  ): Promise<AffiliateProduct> {
    const product = await prisma.product.update({
      where: { 
        id,
        // Only allow updating own products or admin updates
        ...(userId && { user_id: userId })
      },
      data: {
        ...(data.title && { name: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.image && { image_url: data.image }),
        ...(data.affiliate_link && { affiliate_link: data.affiliate_link }),
        ...(data.network && { network: data.network }),
        ...(data.category && { category: data.category }),
        ...(data.commission !== undefined && {
          extra_data: JSON.stringify({
            commission: data.commission,
            currency: data.currency || 'USD',
            updated_manually: true,
            updated_at: new Date().toISOString()
          })
        })
      }
    });

    return this.formatProduct(product);
  }

  // Delete a manual product
  async deleteManualProduct(id: number, userId?: number): Promise<void> {
    await prisma.product.delete({
      where: { 
        id,
        source: 'manual',
        // Only allow deleting own products or admin deletes
        ...(userId && { user_id: userId })
      }
    });
  }

  // Get manual products for a user (or all for admin)
  async getManualProducts(userId?: number, limit = 50, offset = 0): Promise<AffiliateProduct[]> {
    const products = await prisma.product.findMany({
      where: {
        source: 'manual',
        is_active: true,
        ...(userId && { user_id: userId })
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset
    });

    return products.map(p => this.formatProduct(p));
  }

  // Sync public products to database (store them for persistence)
  async syncPublicProducts(products: AffiliateProduct[]): Promise<number> {
    let synced = 0;
    
    for (const product of products) {
      try {
        await prisma.product.upsert({
          where: {
            // Use external_id + network as unique key for public products
            external_id_network: {
              external_id: product.external_id || `public_${product.id}`,
              network: product.network
            }
          },
          update: {
            name: product.title,
            description: product.description,
            price: product.price,
            image_url: product.image,
            affiliate_link: product.affiliate_link,
            category: product.category,
            source: 'public',
            extra_data: JSON.stringify({
              commission: product.commission || 0,
              currency: product.currency || 'USD',
              synced_from_public: true,
              last_synced: new Date().toISOString()
            })
          },
          create: {
            name: product.title,
            description: product.description,
            price: product.price,
            image_url: product.image,
            affiliate_link: product.affiliate_link,
            network: product.network,
            category: product.category,
            source: 'public',
            external_id: product.external_id || `public_${product.id}`,
            is_active: true,
            extra_data: JSON.stringify({
              commission: product.commission || 0,
              currency: product.currency || 'USD',
              synced_from_public: true,
              synced_at: new Date().toISOString()
            })
          }
        });
        synced++;
      } catch (error) {
        // Skip duplicates or errors
        console.error('Failed to sync public product:', product.title, error);
      }
    }

    return synced;
  }

  // Sync API products to database
  async syncAPIProducts(products: AffiliateProduct[]): Promise<number> {
    let synced = 0;
    
    for (const product of products) {
      try {
        await prisma.product.upsert({
          where: {
            external_id_network: {
              external_id: product.external_id || `api_${product.id}`,
              network: product.network
            }
          },
          update: {
            name: product.title,
            description: product.description,
            price: product.price,
            image_url: product.image,
            affiliate_link: product.affiliate_link,
            category: product.category,
            source: 'api',
            extra_data: JSON.stringify({
              commission: product.commission || 0,
              currency: product.currency || 'USD',
              synced_from_api: true,
              last_synced: new Date().toISOString()
            })
          },
          create: {
            name: product.title,
            description: product.description,
            price: product.price,
            image_url: product.image,
            affiliate_link: product.affiliate_link,
            network: product.network,
            category: product.category,
            source: 'api',
            external_id: product.external_id || `api_${product.id}`,
            is_active: true,
            extra_data: JSON.stringify({
              commission: product.commission || 0,
              currency: product.currency || 'USD',
              synced_from_api: true,
              synced_at: new Date().toISOString()
            })
          }
        });
        synced++;
      } catch (error) {
        console.error('Failed to sync API product:', product.title, error);
      }
    }

    return synced;
  }

  // Format product from database to AffiliateProduct interface
  private formatProduct(product: any): AffiliateProduct {
    const extraData = product.extra_data ? JSON.parse(product.extra_data) : {};
    
    return {
      id: product.id.toString(),
      title: product.name,
      description: product.description || '',
      price: Number(product.price || 0),
      commission: extraData.commission,
      affiliate_link: product.affiliate_link || '',
      image: product.image_url || '',
      category: product.category || 'General',
      network: product.network || 'manual',
      source: product.source,
      external_id: product.external_id,
      currency: extraData.currency || 'USD'
    };
  }
}

export const manualProductService = new ManualProductService();
