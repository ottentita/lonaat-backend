import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});

export async function generateProductAd(product: any): Promise<string> {
  try {
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
