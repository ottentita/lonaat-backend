import OpenAI from 'openai';

const openai = new OpenAI();

interface Product {
  id: number;
  name: string;
  price?: string | null;
  category?: string | null;
  description?: string | null;
  affiliate_link?: string | null;
}

interface SocialContent {
  facebook: string;
  twitter: string;
  telegram: string;
}

export async function generateSocialContent(product: Product): Promise<SocialContent> {
  const prompt = `You are a social media marketing assistant.

Create engaging posts for this affiliate product:
Name: ${product.name}
Price: ${product.price || 'Contact for price'}
Category: ${product.category || 'General'}
Description: ${product.description?.substring(0, 200) || ''}
Link: ${product.affiliate_link || '#'}

Create posts for Facebook, Twitter, and Telegram. Each should be:
- Friendly and persuasive
- Short and punchy
- Include a clear call to action
- Platform-appropriate (Twitter under 280 chars)
- Use 1-2 emojis max, not overloaded

Return JSON in this exact format:
{
  "facebook": "your facebook post with link",
  "twitter": "your twitter post with link",
  "telegram": "your telegram post with link"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.7
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content from AI');
    }

    const parsed = JSON.parse(content);
    return {
      facebook: parsed.facebook || generateFallbackContent(product, 'facebook'),
      twitter: parsed.twitter || generateFallbackContent(product, 'twitter'),
      telegram: parsed.telegram || generateFallbackContent(product, 'telegram')
    };
  } catch (error) {
    console.error('AI content generation failed:', error);
    return {
      facebook: generateFallbackContent(product, 'facebook'),
      twitter: generateFallbackContent(product, 'twitter'),
      telegram: generateFallbackContent(product, 'telegram')
    };
  }
}

function generateFallbackContent(product: Product, platform: string): string {
  const link = product.affiliate_link || '#';
  const price = product.price || '';
  
  switch (platform) {
    case 'facebook':
      return `Check out ${product.name}! ${price ? `Only ${price}` : 'Great deal available'} - Get yours now: ${link}`;
    case 'twitter':
      const tweetText = `${product.name} ${price ? `- ${price}` : ''}`;
      return `${tweetText.substring(0, 200)} ${link}`;
    case 'telegram':
      return `${product.name}\n${price ? `Price: ${price}\n` : ''}Buy now: ${link}`;
    default:
      return `${product.name} - ${link}`;
  }
}

export function generateQuickContent(product: Product): SocialContent {
  return {
    facebook: generateFallbackContent(product, 'facebook'),
    twitter: generateFallbackContent(product, 'twitter'),
    telegram: generateFallbackContent(product, 'telegram')
  };
}
