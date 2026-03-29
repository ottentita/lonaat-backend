// Platform Formatter - Optimizes content for different social media platforms

interface FormattedContent {
  content: string;
  hashtags: string[];
  characterCount: number;
  platform: string;
}

// Platform-specific character limits
const PLATFORM_LIMITS = {
  tiktok: 2200,      // TikTok caption limit
  twitter: 280,       // Twitter/X character limit
  instagram: 2200,    // Instagram caption limit
  youtube: 5000       // YouTube description limit
};

// Platform-specific hashtag limits
const HASHTAG_LIMITS = {
  tiktok: 30,
  twitter: 5,
  instagram: 30,
  youtube: 15
};

/**
 * Format content for TikTok
 */
function formatForTikTok(content: string, hashtags: string[]): FormattedContent {
  // TikTok prefers:
  // - Engaging hooks
  // - Emojis
  // - Trending hashtags
  // - Short, punchy text
  
  let formatted = content;
  
  // Ensure content fits within limit
  if (formatted.length > PLATFORM_LIMITS.tiktok) {
    formatted = formatted.substring(0, PLATFORM_LIMITS.tiktok - 100) + '... 🔥';
  }
  
  // Limit hashtags
  const limitedHashtags = hashtags.slice(0, HASHTAG_LIMITS.tiktok);
  
  // Add TikTok-specific formatting
  formatted = `${formatted}\n\n${limitedHashtags.join(' ')}`;
  
  return {
    content: formatted,
    hashtags: limitedHashtags,
    characterCount: formatted.length,
    platform: 'tiktok'
  };
}

/**
 * Format content for Twitter/X
 */
function formatForTwitter(content: string, hashtags: string[]): FormattedContent {
  // Twitter prefers:
  // - Concise messages
  // - 1-3 hashtags max
  // - Thread format for longer content
  // - Direct CTAs
  
  let formatted = content;
  
  // Limit hashtags to 3-5 for Twitter
  const limitedHashtags = hashtags.slice(0, HASHTAG_LIMITS.twitter);
  const hashtagString = limitedHashtags.join(' ');
  
  // Calculate available space for content
  const hashtagLength = hashtagString.length + 2; // +2 for newlines
  const availableSpace = PLATFORM_LIMITS.twitter - hashtagLength;
  
  // Truncate content if needed
  if (formatted.length > availableSpace) {
    formatted = formatted.substring(0, availableSpace - 10) + '... 🧵';
  }
  
  // Add hashtags
  formatted = `${formatted}\n\n${hashtagString}`;
  
  return {
    content: formatted,
    hashtags: limitedHashtags,
    characterCount: formatted.length,
    platform: 'twitter'
  };
}

/**
 * Format content for Instagram
 */
function formatForInstagram(content: string, hashtags: string[]): FormattedContent {
  // Instagram prefers:
  // - Storytelling
  // - Multiple hashtags (up to 30)
  // - Emojis
  // - Line breaks for readability
  
  let formatted = content;
  
  // Add line breaks for better readability
  formatted = formatted.replace(/\n\n/g, '\n.\n');
  
  // Ensure content fits within limit
  if (formatted.length > PLATFORM_LIMITS.instagram) {
    formatted = formatted.substring(0, PLATFORM_LIMITS.instagram - 100) + '... ✨';
  }
  
  // Limit hashtags
  const limitedHashtags = hashtags.slice(0, HASHTAG_LIMITS.instagram);
  
  // Add hashtags (Instagram style - all at the end)
  formatted = `${formatted}\n\n━━━━━━━━━━━━━━━\n${limitedHashtags.join(' ')}`;
  
  return {
    content: formatted,
    hashtags: limitedHashtags,
    characterCount: formatted.length,
    platform: 'instagram'
  };
}

/**
 * Format content for YouTube
 */
function formatForYouTube(content: string, hashtags: string[]): FormattedContent {
  // YouTube prefers:
  // - Detailed descriptions
  // - Timestamps
  // - Links
  // - Hashtags in description
  
  let formatted = content;
  
  // Ensure content fits within limit
  if (formatted.length > PLATFORM_LIMITS.youtube) {
    formatted = formatted.substring(0, PLATFORM_LIMITS.youtube - 100) + '...';
  }
  
  // Limit hashtags
  const limitedHashtags = hashtags.slice(0, HASHTAG_LIMITS.youtube);
  
  // Add YouTube-specific formatting
  formatted = `${formatted}\n\n━━━━━━━━━━━━━━━\n📌 HASHTAGS:\n${limitedHashtags.join(' ')}`;
  
  return {
    content: formatted,
    hashtags: limitedHashtags,
    characterCount: formatted.length,
    platform: 'youtube'
  };
}

/**
 * Main formatter function - routes to platform-specific formatter
 */
export function formatForPlatform(
  content: string, 
  platform: string, 
  hashtags: string[] = []
): FormattedContent {
  const normalizedPlatform = platform.toLowerCase();
  
  switch (normalizedPlatform) {
    case 'tiktok':
      return formatForTikTok(content, hashtags);
    
    case 'twitter':
    case 'x':
      return formatForTwitter(content, hashtags);
    
    case 'instagram':
      return formatForInstagram(content, hashtags);
    
    case 'youtube':
      return formatForYouTube(content, hashtags);
    
    default:
      // Default formatting (no platform-specific changes)
      return {
        content: `${content}\n\n${hashtags.join(' ')}`,
        hashtags,
        characterCount: content.length,
        platform: normalizedPlatform
      };
  }
}

/**
 * Get platform-specific recommendations
 */
export function getPlatformRecommendations(platform: string): {
  characterLimit: number;
  hashtagLimit: number;
  tips: string[];
} {
  const normalizedPlatform = platform.toLowerCase();
  
  const recommendations = {
    tiktok: {
      characterLimit: PLATFORM_LIMITS.tiktok,
      hashtagLimit: HASHTAG_LIMITS.tiktok,
      tips: [
        'Use trending sounds and hashtags',
        'Hook viewers in first 3 seconds',
        'Add captions for accessibility',
        'Post during peak hours (6-10 PM)',
        'Use 3-5 hashtags for best reach'
      ]
    },
    twitter: {
      characterLimit: PLATFORM_LIMITS.twitter,
      hashtagLimit: HASHTAG_LIMITS.twitter,
      tips: [
        'Keep it concise and punchy',
        'Use 1-2 hashtags maximum',
        'Thread longer content',
        'Engage with replies quickly',
        'Post multiple times per day'
      ]
    },
    instagram: {
      characterLimit: PLATFORM_LIMITS.instagram,
      hashtagLimit: HASHTAG_LIMITS.instagram,
      tips: [
        'Use all 30 hashtags for reach',
        'Mix popular and niche hashtags',
        'Post consistently (1-2x daily)',
        'Use Stories and Reels',
        'Engage with your audience'
      ]
    },
    youtube: {
      characterLimit: PLATFORM_LIMITS.youtube,
      hashtagLimit: HASHTAG_LIMITS.youtube,
      tips: [
        'Write detailed descriptions',
        'Include timestamps',
        'Add relevant links',
        'Use 3-5 hashtags in description',
        'Optimize for SEO'
      ]
    }
  };
  
  return recommendations[normalizedPlatform as keyof typeof recommendations] || {
    characterLimit: 2000,
    hashtagLimit: 10,
    tips: ['Follow platform best practices']
  };
}

/**
 * Validate content for platform
 */
export function validateForPlatform(content: string, platform: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const normalizedPlatform = platform.toLowerCase();
  const limit = PLATFORM_LIMITS[normalizedPlatform as keyof typeof PLATFORM_LIMITS] || 2000;
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check character limit
  if (content.length > limit) {
    errors.push(`Content exceeds ${platform} character limit (${content.length}/${limit})`);
  }
  
  // Check for optimal length
  if (normalizedPlatform === 'twitter' && content.length > 200) {
    warnings.push('Twitter posts perform better under 200 characters');
  }
  
  if (normalizedPlatform === 'tiktok' && content.length < 50) {
    warnings.push('TikTok captions should be more engaging (add emojis, hashtags)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export default {
  formatForPlatform,
  getPlatformRecommendations,
  validateForPlatform
};
