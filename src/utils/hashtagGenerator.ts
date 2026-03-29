// Hashtag Generator - Creates viral hashtags based on topic and category

// Trending hashtags by category
const TRENDING_HASHTAGS = {
  general: [
    '#viral', '#trending', '#fyp', '#foryou', '#foryoupage',
    '#explore', '#explorepage', '#instagood', '#reels', '#tiktok'
  ],
  tech: [
    '#tech', '#technology', '#gadgets', '#innovation', '#ai',
    '#techreview', '#techtok', '#gadgetreview', '#smartphone', '#coding'
  ],
  fitness: [
    '#fitness', '#workout', '#gym', '#fitfam', '#health',
    '#motivation', '#fitnessmotivation', '#training', '#exercise', '#gains'
  ],
  beauty: [
    '#beauty', '#makeup', '#skincare', '#beautytips', '#makeuptutorial',
    '#glowup', '#beautyhacks', '#skincareroutine', '#cosmetics', '#beautyblogger'
  ],
  fashion: [
    '#fashion', '#style', '#ootd', '#fashionista', '#outfitoftheday',
    '#streetstyle', '#fashionblogger', '#styleinspo', '#trendy', '#fashiontips'
  ],
  food: [
    '#food', '#foodie', '#cooking', '#recipe', '#foodporn',
    '#delicious', '#yummy', '#foodblogger', '#homemade', '#foodlover'
  ],
  business: [
    '#business', '#entrepreneur', '#success', '#motivation', '#hustle',
    '#businesstips', '#startup', '#marketing', '#money', '#entrepreneurship'
  ],
  education: [
    '#education', '#learning', '#study', '#knowledge', '#school',
    '#studytips', '#educational', '#learnontiktok', '#tutorial', '#tips'
  ],
  lifestyle: [
    '#lifestyle', '#life', '#daily', '#vlog', '#dayinmylife',
    '#lifestyleblogger', '#motivation', '#positivevibes', '#selfcare', '#wellness'
  ],
  entertainment: [
    '#entertainment', '#fun', '#comedy', '#funny', '#memes',
    '#entertainment', '#lol', '#humor', '#viral', '#trending'
  ]
};

// Engagement-boosting hashtags
const ENGAGEMENT_HASHTAGS = [
  '#viral', '#trending', '#fyp', '#foryou', '#foryoupage',
  '#explore', '#explorepage', '#share', '#like', '#follow'
];

// Niche-specific hashtags
const NICHE_HASHTAGS: { [key: string]: string[] } = {
  'weight loss': ['#weightloss', '#weightlossjourney', '#fitness', '#healthylifestyle', '#diet'],
  'muscle gain': ['#musclegain', '#bodybuilding', '#gains', '#gym', '#fitness'],
  'skin care': ['#skincare', '#skincareroutine', '#beauty', '#glowingskin', '#skincaretips'],
  'make money': ['#makemoney', '#sidehustle', '#passiveincome', '#entrepreneur', '#money'],
  'productivity': ['#productivity', '#productive', '#timemanagement', '#goals', '#success'],
  'motivation': ['#motivation', '#motivational', '#inspiration', '#success', '#mindset'],
  'affiliate marketing': ['#affiliatemarketing', '#marketing', '#digitalmarketing', '#onlinebusiness', '#entrepreneur']
};

/**
 * Generate viral hashtags based on topic and category
 */
export function generateHashtags(
  topic: string,
  category: string = 'general',
  count: number = 10
): string[] {
  const hashtags = new Set<string>();
  const normalizedCategory = category.toLowerCase();
  const normalizedTopic = topic.toLowerCase();
  
  // 1. Add category-specific trending hashtags (3-4)
  const categoryHashtags = TRENDING_HASHTAGS[normalizedCategory as keyof typeof TRENDING_HASHTAGS] 
    || TRENDING_HASHTAGS.general;
  
  const categoryCount = Math.min(4, categoryHashtags.length);
  for (let i = 0; i < categoryCount; i++) {
    hashtags.add(categoryHashtags[i]);
  }
  
  // 2. Add niche-specific hashtags if topic matches (2-3)
  for (const [niche, tags] of Object.entries(NICHE_HASHTAGS)) {
    if (normalizedTopic.includes(niche)) {
      tags.slice(0, 3).forEach(tag => hashtags.add(tag));
      break;
    }
  }
  
  // 3. Add engagement hashtags (2-3)
  const engagementCount = Math.min(3, ENGAGEMENT_HASHTAGS.length);
  for (let i = 0; i < engagementCount; i++) {
    hashtags.add(ENGAGEMENT_HASHTAGS[i]);
  }
  
  // 4. Generate topic-based hashtags
  const topicWords = topic.split(' ').filter(word => word.length > 3);
  topicWords.forEach(word => {
    const cleaned = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (cleaned.length > 3) {
      hashtags.add(`#${cleaned}`);
    }
  });
  
  // Convert to array and limit to requested count
  const hashtagArray = Array.from(hashtags);
  
  // If we don't have enough, add more general hashtags
  while (hashtagArray.length < count && hashtagArray.length < 30) {
    const randomCategory = Object.keys(TRENDING_HASHTAGS)[
      Math.floor(Math.random() * Object.keys(TRENDING_HASHTAGS).length)
    ] as keyof typeof TRENDING_HASHTAGS;
    
    const randomHashtag = TRENDING_HASHTAGS[randomCategory][
      Math.floor(Math.random() * TRENDING_HASHTAGS[randomCategory].length)
    ];
    
    if (!hashtagArray.includes(randomHashtag)) {
      hashtagArray.push(randomHashtag);
    }
  }
  
  return hashtagArray.slice(0, count);
}

/**
 * Generate platform-optimized hashtags
 */
export function generatePlatformHashtags(
  topic: string,
  category: string,
  platform: string
): string[] {
  const platformLimits: { [key: string]: number } = {
    tiktok: 10,
    twitter: 3,
    instagram: 30,
    youtube: 5
  };
  
  const count = platformLimits[platform.toLowerCase()] || 10;
  return generateHashtags(topic, category, count);
}

/**
 * Analyze hashtag performance potential
 */
export function analyzeHashtags(hashtags: string[]): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;
  
  // Check for trending hashtags
  const trendingCount = hashtags.filter(tag => 
    ENGAGEMENT_HASHTAGS.includes(tag)
  ).length;
  
  if (trendingCount > 0) {
    score += 20;
    feedback.push(`✅ ${trendingCount} trending hashtags detected`);
  } else {
    feedback.push('⚠️ Consider adding trending hashtags like #viral or #fyp');
  }
  
  // Check hashtag count
  if (hashtags.length >= 5 && hashtags.length <= 15) {
    score += 30;
    feedback.push('✅ Optimal hashtag count');
  } else if (hashtags.length < 5) {
    score += 10;
    feedback.push('⚠️ Add more hashtags for better reach');
  } else {
    score += 20;
    feedback.push('⚠️ Too many hashtags may reduce engagement');
  }
  
  // Check for category diversity
  const categories = new Set<string>();
  for (const tag of hashtags) {
    for (const [cat, tags] of Object.entries(TRENDING_HASHTAGS)) {
      if (tags.includes(tag)) {
        categories.add(cat);
      }
    }
  }
  
  if (categories.size >= 2) {
    score += 30;
    feedback.push('✅ Good category diversity');
  } else {
    score += 15;
    feedback.push('💡 Mix hashtags from different categories');
  }
  
  // Check for niche hashtags
  const hasNiche = hashtags.some(tag => {
    return Object.values(NICHE_HASHTAGS).some(tags => tags.includes(tag));
  });
  
  if (hasNiche) {
    score += 20;
    feedback.push('✅ Niche-specific hashtags included');
  } else {
    feedback.push('💡 Add niche-specific hashtags for targeted reach');
  }
  
  return {
    score: Math.min(100, score),
    feedback
  };
}

/**
 * Get hashtag suggestions based on existing hashtags
 */
export function suggestRelatedHashtags(
  existingHashtags: string[],
  count: number = 5
): string[] {
  const suggestions = new Set<string>();
  
  // Find categories of existing hashtags
  const categories = new Set<string>();
  for (const tag of existingHashtags) {
    for (const [cat, tags] of Object.entries(TRENDING_HASHTAGS)) {
      if (tags.includes(tag)) {
        categories.add(cat);
      }
    }
  }
  
  // Suggest hashtags from same categories
  categories.forEach(cat => {
    const categoryTags = TRENDING_HASHTAGS[cat as keyof typeof TRENDING_HASHTAGS];
    categoryTags.forEach(tag => {
      if (!existingHashtags.includes(tag)) {
        suggestions.add(tag);
      }
    });
  });
  
  // Add some engagement hashtags
  ENGAGEMENT_HASHTAGS.forEach(tag => {
    if (!existingHashtags.includes(tag)) {
      suggestions.add(tag);
    }
  });
  
  return Array.from(suggestions).slice(0, count);
}

export default {
  generateHashtags,
  generatePlatformHashtags,
  analyzeHashtags,
  suggestRelatedHashtags
};
