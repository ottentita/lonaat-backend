// Auto Product Matching - Intelligently matches content with best affiliate products

interface AffiliateProduct {
  id: string;
  name: string;
  niche: string;
  description: string;
  link: string;
  commission: string;
  keywords: string[];
}

interface MatchResult {
  product: AffiliateProduct;
  score: number;
  matchedKeywords: string[];
}

// Niche keywords for matching
const NICHE_KEYWORDS: { [key: string]: string[] } = {
  tech: [
    'ai', 'software', 'app', 'tool', 'automation', 'saas', 'platform',
    'technology', 'digital', 'online', 'tech', 'gadget', 'device',
    'computer', 'phone', 'laptop', 'coding', 'programming', 'developer'
  ],
  fitness: [
    'workout', 'fitness', 'gym', 'exercise', 'training', 'muscle',
    'weight', 'health', 'nutrition', 'protein', 'diet', 'cardio',
    'strength', 'bodybuilding', 'yoga', 'running', 'athlete'
  ],
  beauty: [
    'beauty', 'skincare', 'makeup', 'cosmetic', 'skin', 'face',
    'hair', 'glow', 'serum', 'cream', 'moisturizer', 'cleanser',
    'anti-aging', 'acne', 'wrinkle', 'natural', 'organic'
  ],
  business: [
    'business', 'entrepreneur', 'startup', 'marketing', 'sales',
    'revenue', 'profit', 'growth', 'scale', 'ecommerce', 'dropshipping',
    'affiliate', 'passive income', 'side hustle', 'money', 'earn'
  ],
  education: [
    'course', 'learn', 'education', 'training', 'tutorial', 'teach',
    'skill', 'knowledge', 'study', 'class', 'lesson', 'master',
    'certification', 'degree', 'online learning', 'udemy', 'coursera'
  ],
  fashion: [
    'fashion', 'style', 'clothing', 'outfit', 'wear', 'dress',
    'shoes', 'accessories', 'trend', 'designer', 'brand', 'wardrobe',
    'streetwear', 'luxury', 'casual', 'formal'
  ],
  food: [
    'food', 'recipe', 'cooking', 'meal', 'kitchen', 'chef',
    'ingredient', 'dish', 'restaurant', 'eat', 'taste', 'flavor',
    'healthy eating', 'vegan', 'keto', 'diet', 'nutrition'
  ],
  lifestyle: [
    'lifestyle', 'life', 'daily', 'routine', 'productivity', 'habits',
    'mindset', 'motivation', 'success', 'goals', 'self-improvement',
    'personal development', 'wellness', 'balance', 'happiness'
  ]
};

/**
 * Detect niche from content
 */
function detectNiche(content: string): string[] {
  const contentLower = content.toLowerCase();
  const detectedNiches: { niche: string; score: number }[] = [];

  for (const [niche, keywords] of Object.entries(NICHE_KEYWORDS)) {
    let score = 0;
    
    for (const keyword of keywords) {
      if (contentLower.includes(keyword)) {
        score++;
      }
    }

    if (score > 0) {
      detectedNiches.push({ niche, score });
    }
  }

  // Sort by score descending
  detectedNiches.sort((a, b) => b.score - a.score);

  return detectedNiches.map(n => n.niche);
}

/**
 * Calculate match score between content and product
 */
function calculateMatchScore(content: string, product: AffiliateProduct): {
  score: number;
  matchedKeywords: string[];
} {
  const contentLower = content.toLowerCase();
  let score = 0;
  const matchedKeywords: string[] = [];

  // Check product keywords
  for (const keyword of product.keywords) {
    if (contentLower.includes(keyword.toLowerCase())) {
      score += 10;
      matchedKeywords.push(keyword);
    }
  }

  // Check niche match
  const detectedNiches = detectNiche(content);
  if (detectedNiches.includes(product.niche)) {
    score += 20;
  }

  // Check product name
  const productNameWords = product.name.toLowerCase().split(' ');
  for (const word of productNameWords) {
    if (word.length > 3 && contentLower.includes(word)) {
      score += 5;
      matchedKeywords.push(word);
    }
  }

  // Check description
  const descriptionWords = product.description.toLowerCase().split(' ');
  for (const word of descriptionWords) {
    if (word.length > 5 && contentLower.includes(word)) {
      score += 2;
    }
  }

  return { score, matchedKeywords };
}

/**
 * Find best matching product for content
 */
export function findBestProduct(
  content: string,
  products: AffiliateProduct[]
): AffiliateProduct | null {
  if (products.length === 0) return null;

  const matches: MatchResult[] = [];

  for (const product of products) {
    const { score, matchedKeywords } = calculateMatchScore(content, product);
    
    if (score > 0) {
      matches.push({
        product,
        score,
        matchedKeywords
      });
    }
  }

  if (matches.length === 0) {
    // No matches found, return random product from detected niche
    const detectedNiches = detectNiche(content);
    if (detectedNiches.length > 0) {
      const nicheProducts = products.filter(p => detectedNiches.includes(p.niche));
      if (nicheProducts.length > 0) {
        return nicheProducts[Math.floor(Math.random() * nicheProducts.length)];
      }
    }
    
    // Fallback to random product
    return products[Math.floor(Math.random() * products.length)];
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  console.log('🎯 Product matching results:');
  console.log(`Top match: ${matches[0].product.name} (score: ${matches[0].score})`);
  console.log(`Matched keywords: ${matches[0].matchedKeywords.join(', ')}`);

  return matches[0].product;
}

/**
 * Find multiple matching products
 */
export function findMatchingProducts(
  content: string,
  products: AffiliateProduct[],
  limit: number = 3
): AffiliateProduct[] {
  const matches: MatchResult[] = [];

  for (const product of products) {
    const { score, matchedKeywords } = calculateMatchScore(content, product);
    
    if (score > 0) {
      matches.push({
        product,
        score,
        matchedKeywords
      });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return matches.slice(0, limit).map(m => m.product);
}

/**
 * Get product recommendations based on niche
 */
export function getProductsByNiche(
  niche: string,
  products: AffiliateProduct[]
): AffiliateProduct[] {
  return products.filter(p => p.niche === niche);
}

/**
 * Analyze content and suggest best monetization strategy
 */
export function analyzeMonetizationPotential(
  content: string,
  products: AffiliateProduct[]
): {
  detectedNiches: string[];
  bestProduct: AffiliateProduct | null;
  alternativeProducts: AffiliateProduct[];
  confidence: 'high' | 'medium' | 'low';
  suggestions: string[];
} {
  const detectedNiches = detectNiche(content);
  const bestProduct = findBestProduct(content, products);
  const alternativeProducts = findMatchingProducts(content, products, 3)
    .filter(p => p.id !== bestProduct?.id);

  let confidence: 'high' | 'medium' | 'low' = 'low';
  const suggestions: string[] = [];

  if (bestProduct) {
    const { score } = calculateMatchScore(content, bestProduct);
    
    if (score >= 30) {
      confidence = 'high';
      suggestions.push('Perfect product match found!');
    } else if (score >= 15) {
      confidence = 'medium';
      suggestions.push('Good product match, consider adding more relevant keywords');
    } else {
      confidence = 'low';
      suggestions.push('Weak product match, consider creating niche-specific content');
    }
  }

  if (detectedNiches.length === 0) {
    suggestions.push('Content is too general, focus on a specific niche for better monetization');
  }

  if (alternativeProducts.length > 0) {
    suggestions.push(`${alternativeProducts.length} alternative products available`);
  }

  return {
    detectedNiches,
    bestProduct,
    alternativeProducts,
    confidence,
    suggestions
  };
}

export default {
  findBestProduct,
  findMatchingProducts,
  getProductsByNiche,
  analyzeMonetizationPotential,
  detectNiche
};
