import { OpenAI } from 'openai';
import { prisma } from '../prisma';

// instantiate OpenAI lazily or during runtime to avoid issues in tests
function makeOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
  });
} // no instance at module load; create inside functions to avoid test import issues

export interface DiscoveredProduct {
  name: string;
  description: string;
  price: string;
  category: string;
  network: string;
  affiliate_link?: string;
  keywords?: string[];
}

export async function discoverProducts(category?: string, count: number = 10): Promise<DiscoveredProduct[]> {
  try {
    const categoryPrompt = category 
      ? `Focus on the "${category}" category.` 
      : 'Include diverse categories like courses, software, ebooks, health, finance, and lifestyle.';

    const openai = makeOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert affiliate marketing product researcher. Your job is to discover trending, high-converting affiliate products that are commonly available on major affiliate networks like Digistore24, ClickBank, PartnerStack, and similar platforms.

Generate realistic product listings based on current market trends. Each product should be something that could realistically exist on affiliate networks.`
        },
        {
          role: 'user',
          content: `Discover ${count} trending affiliate products for a marketplace. ${categoryPrompt}

For each product, provide:
- name: Product name (realistic and marketable)
- description: Brief compelling description (1-2 sentences)
- price: Realistic price in USD (e.g., "47.00", "97.00", "197.00")
- category: One of: courses, software, ebooks, health, finance, lifestyle, marketing, business
- network: One of: digistore24, partnerstack, awin, clickbank
- keywords: 3-5 relevant keywords

Return ONLY a valid JSON array with no additional text or markdown.`
        }
      ],
      max_tokens: 2000,
      temperature: 0.8
    });

    const content = response.choices[0]?.message?.content || '[]';
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    const products = JSON.parse(cleaned);
    
    return Array.isArray(products) ? products : [];
  } catch (error) {
    console.error('Error discovering products:', error);
    return [];
  }
}

export async function searchProducts(query: string, count: number = 5): Promise<DiscoveredProduct[]> {
  try {
    const openai = makeOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert affiliate product researcher. Based on search queries, you find and recommend relevant affiliate products that match what users are looking for.`
        },
        {
          role: 'user',
          content: `Search for ${count} affiliate products matching: "${query}"

Return products that would be available on major affiliate networks.

For each product, provide:
- name: Product name
- description: Brief description (1-2 sentences)
- price: Price in USD (e.g., "47.00")
- category: One of: courses, software, ebooks, health, finance, lifestyle, marketing, business
- network: One of: digistore24, partnerstack, awin, clickbank
- keywords: 3-5 relevant keywords

Return ONLY a valid JSON array with no additional text.`
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    const content = response.choices[0]?.message?.content || '[]';
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    const products = JSON.parse(cleaned);
    
    return Array.isArray(products) ? products : [];
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}

export async function importDiscoveredProducts(products: DiscoveredProduct[], userId: number, generateAds: boolean = true): Promise<{ imported: number; products: any[] }> {
  const importedProducts: any[] = [];

  for (const product of products) {
    try {
      const existing = await prisma.product.findFirst({
        where: { name: product.name }
      });

      if (!existing) {
        let adText: string | null = null;
        
        if (generateAds) {
          adText = await generateProductAd(product);
        }

        const created = await prisma.product.create({
          data: {
            user_id: userId,
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            network: product.network,
            affiliate_link: product.affiliate_link || null,
            ai_generated_ad: adText,
            extra_data: { keywords: product.keywords, ai_discovered: true },
            is_active: true
          }
        });
        
        importedProducts.push(created);
      }
    } catch (err) {
      console.error(`Failed to import product ${product.name}:`, err);
    }
  }

  return { imported: importedProducts.length, products: importedProducts };
}

export async function generateProductAd(product: any): Promise<string> {
  try {
    const openai = makeOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert marketing copywriter specializing in affiliate marketing. Create compelling, conversion-focused ad copy.'
        },
        {
          role: 'user',
          content: `Create a compelling advertisement for this product:
Name: ${product.name}
Description: ${product.description || 'No description provided'}
Price: $${product.price || 'Not specified'}
Category: ${product.category || 'General'}

Generate a short, engaging ad (2-3 sentences) that highlights benefits and includes a call to action.`
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || 'Check out this amazing product!';
  } catch (error) {
    console.error('Error generating product ad:', error);
    throw error;
  }
}

export async function generateRealEstateAd(property: any): Promise<string> {
  try {
    const openai = makeOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert real estate marketing specialist. Create compelling property listings that attract potential buyers or renters.'
        },
        {
          role: 'user',
          content: `Create a compelling advertisement for this property:
Title: ${property.title || property.name}
Type: ${property.property_type || 'Property'}
Location: ${property.location || 'Prime location'}
Price: $${property.price || 'Contact for price'}
Bedrooms: ${property.bedrooms || 'N/A'}
Bathrooms: ${property.bathrooms || 'N/A'}
Description: ${property.description || 'Beautiful property'}

Generate an engaging property ad (2-3 sentences) that highlights key features and creates urgency.`
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || 'Discover your dream property today!';
  } catch (error) {
    console.error('Error generating real estate ad:', error);
    throw error;
  }
}

export async function processAIJob(jobId: number): Promise<void> {
  const job = await prisma.aIJob.findUnique({ where: { id: jobId } });
  
  if (!job || job.status !== 'pending') {
    return;
  }

  await prisma.aIJob.update({
    where: { id: jobId },
    data: { status: 'running', started_at: new Date() }
  });

  try {
    let result: any = {};
    const inputData = job.input_data as any || {};

    switch (job.job_type) {
      case 'generate_product_ads': {
        const productIds = inputData.product_ids || [];
        const products = productIds.length > 0
          ? await prisma.product.findMany({ where: { id: { in: productIds } } })
          : await prisma.product.findMany({ where: { is_active: true }, take: 10 });

        const generatedAds: any[] = [];
        for (const product of products) {
          try {
            const adText = await generateProductAd(product);
            await prisma.product.update({
              where: { id: product.id },
              data: { ai_generated_ad: adText }
            });
            generatedAds.push({ product_id: product.id, name: product.name, ad: adText });
          } catch (err) {
            generatedAds.push({ product_id: product.id, name: product.name, error: 'Failed to generate' });
          }
        }
        result = { products_processed: products.length, ads_generated: generatedAds };
        break;
      }

      case 'generate_real_estate_ads': {
        const propertyIds = inputData.property_ids || [];
        const properties = propertyIds.length > 0
          ? await prisma.realEstateProperty.findMany({ where: { id: { in: propertyIds } } })
          : await prisma.realEstateProperty.findMany({ where: { is_active: true }, take: 10 });

        const generatedAds: any[] = [];
        for (const property of properties) {
          try {
            const adText = await generateRealEstateAd(property);
            await prisma.realEstateProperty.update({
              where: { id: property.id },
              data: { ai_generated_ad: adText }
            });
            generatedAds.push({ property_id: property.id, title: property.title, ad: adText });
          } catch (err) {
            generatedAds.push({ property_id: property.id, title: property.title, error: 'Failed to generate' });
          }
        }
        result = { properties_processed: properties.length, ads_generated: generatedAds };
        break;
      }

      case 'generate_all_ads': {
        const products = await prisma.product.findMany({ where: { is_active: true }, take: 20 });
        let productAdsGenerated = 0;

        for (const product of products) {
          try {
            const adText = await generateProductAd(product);
            await prisma.product.update({
              where: { id: product.id },
              data: { ai_generated_ad: adText }
            });
            productAdsGenerated++;
          } catch (err) {
            console.error(`Failed to generate ad for product ${product.id}:`, err);
          }
        }

        result = { 
          products_processed: products.length,
          product_ads_generated: productAdsGenerated
        };
        break;
      }

      case 'commission_scan': {
        result = { 
          message: 'Commission scan completed',
          networks_scanned: inputData.networks || ['all'],
          timestamp: new Date().toISOString()
        };
        break;
      }

      case 'bulk_import': {
        const { syncProductsFromNetwork } = await import('./networkSync');
        const networks = inputData.networks || ['digistore24', 'awin', 'partnerstack'];
        const generateAds = inputData.generate_ads !== false;
        
        const syncResults: any[] = [];
        let totalProducts = 0;

        for (const network of networks) {
          try {
            const synced = await syncProductsFromNetwork(network);
            syncResults.push({ network, success: true, products_synced: synced });
            totalProducts += synced;
          } catch (err: any) {
            syncResults.push({ network, success: false, error: err.message });
          }
        }

        if (generateAds && totalProducts > 0) {
          const products = await prisma.product.findMany({ 
            where: { is_active: true, ai_generated_ad: null },
            take: 50 
          });

          let adsGenerated = 0;
          for (const product of products) {
            try {
              const adText = await generateProductAd(product);
              await prisma.product.update({
                where: { id: product.id },
                data: { ai_generated_ad: adText }
              });
              adsGenerated++;
            } catch (err) {
              console.error(`Failed to generate ad for product ${product.id}:`, err);
            }
          }

          result = {
            message: 'Bulk import completed with AI ads',
            networks_processed: networks.length,
            total_products_synced: totalProducts,
            ads_generated: adsGenerated,
            sync_results: syncResults
          };
        } else {
          result = {
            message: 'Bulk import completed',
            networks_processed: networks.length,
            total_products_synced: totalProducts,
            sync_results: syncResults
          };
        }
        break;
      }

      default:
        result = { message: 'Unknown job type' };
    }

    await prisma.aIJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        result,
        completed_at: new Date()
      }
    });

  } catch (error: any) {
    console.error(`AI job ${jobId} failed:`, error);
    await prisma.aIJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error_message: error.message || 'Unknown error',
        completed_at: new Date()
      }
    });
  }
}

export async function processPendingJobs(): Promise<number> {
  const pendingJobs = await prisma.aIJob.findMany({
    where: { status: 'pending' },
    orderBy: { created_at: 'asc' },
    take: 5
  });

  for (const job of pendingJobs) {
    await processAIJob(job.id);
  }

  return pendingJobs.length;
}

export async function detectFraud(userId: number): Promise<{ score: number; reasons: string[]; shouldBlock: boolean }> {
  const reasons: string[] = [];
  let score = 0;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { score: 0, reasons: ['User not found'], shouldBlock: false };

  const recentLogins = await prisma.auditLog.findMany({
    where: { 
      user_id: userId, 
      action: 'login',
      created_at: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });

  const uniqueIps = new Set(recentLogins.map(l => l.ip_address).filter(Boolean));
  if (uniqueIps.size > 5) {
    score += 30;
    reasons.push(`Multiple IPs detected: ${uniqueIps.size} unique IPs in 24h`);
  }

  const recentWithdrawals = await prisma.withdrawalRequest.count({
    where: {
      user_id: userId,
      created_at: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });
  if (recentWithdrawals > 3) {
    score += 25;
    reasons.push(`Excessive withdrawal requests: ${recentWithdrawals} in 24h`);
  }

  const recentClicks = await prisma.auditLog.count({
    where: {
      user_id: userId,
      action: 'campaign_click',
      created_at: { gt: new Date(Date.now() - 60 * 60 * 1000) }
    }
  });
  if (recentClicks > 100) {
    score += 40;
    reasons.push(`Suspicious click activity: ${recentClicks} clicks in 1h`);
  }

  const accountAge = Date.now() - user.created_at.getTime();
  const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
  if (daysSinceCreation < 1 && user.balance > 100) {
    score += 35;
    reasons.push('New account with high balance');
  }

  return {
    score,
    reasons,
    shouldBlock: score >= 70
  };
}

export async function runFraudScan(): Promise<{ scanned: number; blocked: number; flagged: number }> {
  let scanned = 0;
  let blocked = 0;
  let flagged = 0;

  const activeUsers = await prisma.user.findMany({
    where: { 
      is_blocked: false,
      is_admin: false,
      created_at: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    },
    take: 100
  });

  for (const user of activeUsers) {
    scanned++;
    const fraudCheck = await detectFraud(user.id);

    if (fraudCheck.score > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { fraud_score: fraudCheck.score }
      });

      await prisma.auditLog.create({
        data: {
          user_id: user.id,
          action: 'fraud_scan',
          details: { score: fraudCheck.score, reasons: fraudCheck.reasons },
          fraud_score: fraudCheck.score,
          flagged: fraudCheck.score >= 50
        }
      });

      if (fraudCheck.shouldBlock) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            is_blocked: true,
            block_reason: `Auto-blocked by AI: ${fraudCheck.reasons.join(', ')}`
          }
        });
        blocked++;

        await prisma.notification.create({
          data: {
            user_id: user.id,
            title: 'Account Suspended',
            message: 'Your account has been suspended for suspicious activity. Contact support for assistance.',
            type: 'error'
          }
        });
      } else if (fraudCheck.score >= 50) {
        flagged++;
      }
    }
  }

  return { scanned, blocked, flagged };
}

export async function autoBoostAdminProducts(): Promise<{ boosted: number }> {
  const adminUsers = await prisma.user.findMany({
    where: { is_admin: true },
    select: { id: true }
  });

  const adminIds = adminUsers.map(u => u.id);
  
  const products = await prisma.product.findMany({
    where: { 
      user_id: { in: adminIds },
      is_active: true
    },
    take: 10
  });

  let boosted = 0;
  for (const product of products) {
    const existingCampaign = await prisma.adBoost.findFirst({
      where: {
        product_id: product.id,
        status: 'active'
      }
    });

    if (!existingCampaign) {
      await prisma.adBoost.create({
        data: {
          user_id: product.user_id!,
          product_id: product.id,
          boost_type: 'auto',
          status: 'active',
          is_admin_campaign: true,
          auto_boost: true,
          boost_intensity: 5,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          campaign_config: { auto_generated: true, product_name: product.name }
        }
      });
      boosted++;
    }
  }

  return { boosted };
}

export async function scanNetworksForProducts(): Promise<{ discovered: number }> {
  const products = await discoverProducts(undefined, 10);
  
  if (products.length === 0) {
    return { discovered: 0 };
  }

  const adminUser = await prisma.user.findFirst({
    where: { is_admin: true }
  });

  if (!adminUser) {
    return { discovered: 0 };
  }

  const result = await importDiscoveredProducts(products, adminUser.id, true);
  return { discovered: result.imported };
}

export async function autoImportAliExpressProducts(category?: string, count: number = 20): Promise<{ imported: number; products: any[] }> {
  const { searchAliExpressProducts } = await import('./admitadService');
  
  const adminUser = await prisma.user.findFirst({
    where: { is_admin: true }
  });

  if (!adminUser) {
    return { imported: 0, products: [] };
  }

  const query = category || 'trending products';
  const aliProducts = await searchAliExpressProducts(query);
  const importedProducts: any[] = [];

  for (const product of aliProducts.slice(0, count)) {
    try {
      const existingProduct = await prisma.product.findFirst({
        where: {
          network: 'aliexpress',
          extra_data: { path: ['external_id'], equals: product.id }
        }
      });

      if (!existingProduct) {
        const adText = await generateProductAd(product);

        const created = await prisma.product.create({
          data: {
            user_id: adminUser.id,
            name: product.name,
            description: product.description,
            price: product.price ? Number(product.price) : null,
            category: product.category,
            network: 'aliexpress',
            affiliate_link: product.url,
            image_url: product.image_url,
            ai_generated_ad: adText,
            extra_data: { 
              external_id: product.id,
              commission_rate: product.commission_rate,
              merchant: product.merchant,
              ai_imported: true
            },
            is_active: true
          }
        });

        importedProducts.push(created);
      }
    } catch (err) {
      console.error(`Failed to import AliExpress product ${product.name}:`, err);
    }
  }

  return { imported: importedProducts.length, products: importedProducts };
}

export async function runAIAutoImportCycle(): Promise<{ aliexpress_imported: number; ads_generated: number; boosted: number }> {
  const aliexpress = await autoImportAliExpressProducts();

  const products = await prisma.product.findMany({
    where: { is_active: true, ai_generated_ad: null },
    take: 10
  });

  let adsGenerated = 0;
  for (const product of products) {
    try {
      const adText = await generateProductAd(product);
      await prisma.product.update({
        where: { id: product.id },
        data: { ai_generated_ad: adText }
      });
      adsGenerated++;
    } catch (err) {
      console.error(`Failed to generate ad for product ${product.id}:`, err);
    }
  }

  const boostResult = await autoBoostAdminProducts();

  return {
    aliexpress_imported: aliexpress.imported,
    ads_generated: adsGenerated,
    boosted: boostResult.boosted
  };
}
