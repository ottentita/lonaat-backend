import { OpenAI } from 'openai';

function makeOpenAI() {
  return new OpenAI();
}



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
  instagram: string;
  tiktok: string;
}

export async function generateSocialContent(product: Product): Promise<SocialContent> {
  const prompt = `You are a social media marketing assistant.

Create engaging posts for this affiliate product:
Name: ${product.name}
Price: ${product.price || 'Contact for price'}
Category: ${product.category || 'General'}
Description: ${product.description?.substring(0, 200) || ''}
Link: ${product.affiliate_link || '#'}

Create posts for Facebook, Twitter, Telegram, Instagram, and TikTok. Each should be:
- Friendly and persuasive
- Short and punchy
- Include a clear call to action
- Platform-appropriate:
  - Twitter: under 280 chars
  - Instagram: hashtag-rich, visual appeal description
  - TikTok: trendy, Gen-Z friendly, viral potential
- Use 1-2 emojis max, not overloaded

Return JSON in this exact format:
{
  "facebook": "your facebook post with link",
  "twitter": "your twitter post with link",
  "telegram": "your telegram post with link",
  "instagram": "your instagram caption with hashtags",
  "tiktok": "your tiktok caption trendy style"
}`;

  try {
    const openai = makeOpenAI();
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
      telegram: parsed.telegram || generateFallbackContent(product, 'telegram'),
      instagram: parsed.instagram || generateFallbackContent(product, 'instagram'),
      tiktok: parsed.tiktok || generateFallbackContent(product, 'tiktok')
    };
  } catch (error) {
    console.error('AI content generation failed:', error);
    return {
      facebook: generateFallbackContent(product, 'facebook'),
      twitter: generateFallbackContent(product, 'twitter'),
      telegram: generateFallbackContent(product, 'telegram'),
      instagram: generateFallbackContent(product, 'instagram'),
      tiktok: generateFallbackContent(product, 'tiktok')
    };
  }
}

function generateFallbackContent(product: Product, platform: string): string {
  const link = product.affiliate_link || '#';
  const price = product.price || '';
  const category = product.category?.toLowerCase() || 'products';
  
  switch (platform) {
    case 'facebook':
      return `Check out ${product.name}! ${price ? `Only ${price}` : 'Great deal available'} - Get yours now: ${link}`;
    case 'twitter':
      const tweetText = `${product.name} ${price ? `- ${price}` : ''}`;
      return `${tweetText.substring(0, 200)} ${link}`;
    case 'telegram':
      return `${product.name}\n${price ? `Price: ${price}\n` : ''}Buy now: ${link}`;
    case 'instagram':
      return `${product.name} ${price ? `- ${price}` : ''}\n\nLink in bio!\n\n#${category.replace(/\s+/g, '')} #shopping #deals #musthave #trending`;
    case 'tiktok':
      return `This ${product.name} is a game changer! ${price ? `Only ${price}` : ''} Link in bio #fyp #viral #${category.replace(/\s+/g, '')}`;
    default:
      return `${product.name} - ${link}`;
  }
}

export function generateQuickContent(product: Product): SocialContent {
  return {
    facebook: generateFallbackContent(product, 'facebook'),
    twitter: generateFallbackContent(product, 'twitter'),
    telegram: generateFallbackContent(product, 'telegram'),
    instagram: generateFallbackContent(product, 'instagram'),
    tiktok: generateFallbackContent(product, 'tiktok')
  };
}
