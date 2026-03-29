/**
 * AI AD GENERATION SERVICE
 * Generates high-converting Facebook ads using OpenAI
 * Falls back to template-based ads when API unavailable
 */

import OpenAI from 'openai';
import prisma from '../prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface Product {
  id: number;
  name: string;
  price: number | string;
  description?: string;
  category?: string;
  network?: string;
  affiliateLink?: string;
}

/**
 * Generate high-converting fallback ad (NO API NEEDED)
 * Uses proven conversion templates
 */
function generateFallbackAd(product: Product): string {
  const productName = product.name.toUpperCase();
  const price = product.price;
  const description = product.description || 'High quality product';
  
  // Multiple template variations for testing
  const templates = [
    // Template 1: Urgency + Scarcity
    `🔥 ${productName} IS TRENDING!

💰 Only ${price} XAF
✅ High quality
✅ Limited stock
✅ Fast delivery

👉 Order now before price increases!

🚀 Click here: ${product.affiliateLink || 'Buy Now'}`,

    // Template 2: Benefits-focused
    `💎 ${productName}

${description}

✨ Why you need this:
✅ Premium quality
✅ Best price: ${price} XAF
✅ Trusted by thousands

🔥 Get yours now before it's gone!
👉 ${product.affiliateLink || 'Order Now'}`,

    // Template 3: Social proof
    `⭐ ${productName} ⭐

🎯 What customers say:
"Best purchase ever!" ⭐⭐⭐⭐⭐
"Amazing quality!" ⭐⭐⭐⭐⭐

💰 Special price: ${price} XAF
✅ Limited time offer

👉 Join thousands of happy customers!
🛒 ${product.affiliateLink || 'Shop Now'}`
  ];

  // Randomly select template for variety
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  
  return randomTemplate;
}

/**
 * Generate a high-converting Facebook ad for a product
 */
export async function generateAd(product: Product): Promise<string> {
  // Validation
  if (!product || !product.name) {
    throw new Error("Invalid product for ad generation");
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = `
Create a HIGH-CONVERTING Facebook ad for this product.

Product Name: ${product.name}
Price: $${product.price}
Description: ${product.description || "High quality product"}
${product.category ? `Category: ${product.category}` : ''}

Include:
- Hook (attention grabbing opening line)
- Benefits (why they need this)
- CTA (Clear call-to-action like "Buy Now", "Get Yours", etc.)
- Emojis (use strategically for engagement)

Keep it short and viral (max 125 characters for ad copy).
Format:

🎯 HOOK: [attention-grabbing line]
💎 BENEFITS: [key benefits]
🔥 CTA: [call to action]
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert Facebook ad copywriter who creates viral, high-converting ads. Be concise, use emojis strategically, and focus on emotional triggers."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 300
    });

    const adContent = response.choices[0]?.message?.content;

    if (!adContent) {
      throw new Error("AI failed to generate ad content");
    }

    return adContent;

  } catch (error: any) {
    console.error('❌ AI ad generation error:', error.message);
    console.log('🔄 Using fallback ad template instead');
    
    // Generate and save fallback ad to database
    const fallbackAd = generateFallbackAd(product);
    
    // Save fallback ad to product for consistency and caching
    try {
      await prisma.products.update({
        where: { id: product.id },
        data: {
          aiGeneratedAd: fallbackAd
        }
      });
      console.log('✅ Fallback ad saved to database');
    } catch (saveError) {
      console.error('⚠️ Failed to save fallback ad:', saveError);
    }
    
    return fallbackAd;
  }
}

/**
 * Generate ads for multiple products in batch
 */
export async function generateAdsBatch(products: Product[]): Promise<Map<number, string>> {
  const results = new Map<number, string>();

  for (const product of products) {
    try {
      const ad = await generateAd(product);
      results.set(product.id, ad);
      
      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error: any) {
      console.error(`Failed to generate ad for product ${product.id}:`, error);
      results.set(product.id, `Error: ${error.message}`);
    }
  }

  return results;
}

/**
 * Generate and save ad to database
 */
export async function generateAndSaveAd(productId: number, prisma: any): Promise<string> {
  const product = await prisma.products.findUnique({
    where: { id: productId }
  });

  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  const adContent = await generateAd(product);

  // Save to database
  await prisma.products.update({
    where: { id: productId },
    data: {
      aiGeneratedAd: adContent
    }
  });

  return adContent;
}

export default {
  generateAd,
  generateAdsBatch,
  generateAndSaveAd
};
