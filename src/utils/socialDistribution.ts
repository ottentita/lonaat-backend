// Social Distribution Engine - Platform-optimized content formatting and export

interface ContentData {
  hook?: string;
  script: string;
  cta?: string;
  hashtags?: string[];
  product?: {
    name: string;
    link: string;
  };
}

interface PlatformContent {
  platform: string;
  caption: string;
  hashtags: string;
  videoScript?: string;
  characterCount: number;
  ready: boolean;
}

// Platform character limits
const PLATFORM_LIMITS = {
  tiktok: {
    caption: 2200,
    hashtags: 30,
    videoScript: 1000
  },
  instagram: {
    caption: 2200,
    hashtags: 30,
    videoScript: 1000
  },
  twitter: {
    caption: 280,
    hashtags: 5,
    videoScript: 280
  }
};

/**
 * Format content for TikTok
 * TikTok prefers: Engaging hooks, emojis, trending hashtags, short punchy captions
 */
export function formatForTikTok(content: ContentData): PlatformContent {
  const { hook, script, cta, hashtags = [], product } = content;

  // Build caption
  let caption = '';
  
  // Add hook if available
  if (hook) {
    caption += `${hook}\n\n`;
  }

  // Add main script (truncate if needed)
  let mainContent = script;
  if (mainContent.length > 300) {
    mainContent = mainContent.substring(0, 297) + '...';
  }
  caption += mainContent;

  // Add CTA if available
  if (cta) {
    caption += `\n\n${cta}`;
  }

  // Add product link if available
  if (product) {
    caption += `\n\n🔗 ${product.link}`;
  }

  // Format hashtags (limit to 10 for TikTok best practices)
  const tiktokHashtags = hashtags.slice(0, 10);
  const hashtagString = tiktokHashtags.join(' ');

  // Add hashtags
  if (hashtagString) {
    caption += `\n\n${hashtagString}`;
  }

  // Build video script (for voiceover/text overlay)
  const videoScript = hook 
    ? `${hook}\n\n${script.substring(0, 500)}`
    : script.substring(0, 500);

  return {
    platform: 'TikTok',
    caption: caption.trim(),
    hashtags: hashtagString,
    videoScript,
    characterCount: caption.length,
    ready: caption.length <= PLATFORM_LIMITS.tiktok.caption
  };
}

/**
 * Format content for Instagram Reels
 * Instagram prefers: Storytelling, line breaks, all hashtags at end, emojis
 */
export function formatForInstagram(content: ContentData): PlatformContent {
  const { hook, script, cta, hashtags = [], product } = content;

  // Build caption with line breaks for readability
  let caption = '';
  
  // Add hook
  if (hook) {
    caption += `${hook}\n.\n`;
  }

  // Add main content with line breaks
  let mainContent = script.replace(/\n\n/g, '\n.\n');
  if (mainContent.length > 400) {
    mainContent = mainContent.substring(0, 397) + '...';
  }
  caption += mainContent;

  // Add CTA
  if (cta) {
    caption += `\n.\n${cta}`;
  }

  // Add product link
  if (product) {
    caption += `\n.\n🔗 Link in bio for ${product.name}`;
  }

  // Add separator
  caption += '\n.\n━━━━━━━━━━━━━━━';

  // Format hashtags (use all 30 for Instagram)
  const instaHashtags = hashtags.slice(0, 30);
  const hashtagString = instaHashtags.join(' ');

  // Add hashtags at the end
  if (hashtagString) {
    caption += `\n${hashtagString}`;
  }

  // Video script
  const videoScript = hook 
    ? `${hook}\n\n${script.substring(0, 500)}`
    : script.substring(0, 500);

  return {
    platform: 'Instagram',
    caption: caption.trim(),
    hashtags: hashtagString,
    videoScript,
    characterCount: caption.length,
    ready: caption.length <= PLATFORM_LIMITS.instagram.caption
  };
}

/**
 * Format content for Twitter/X
 * Twitter prefers: Concise, punchy, 1-3 hashtags, thread format for longer content
 */
export function formatForTwitter(content: ContentData): PlatformContent {
  const { hook, script, cta, hashtags = [], product } = content;

  // Build tweet (must be under 280 chars)
  let tweet = '';
  
  // Add hook
  if (hook && hook.length < 100) {
    tweet += `${hook}\n\n`;
  }

  // Calculate remaining space
  const twitterHashtags = hashtags.slice(0, 3);
  const hashtagString = twitterHashtags.join(' ');
  const hashtagLength = hashtagString.length + 2;
  
  // Add CTA if short
  let ctaText = '';
  if (cta && cta.length < 50) {
    ctaText = `\n\n${cta}`;
  }

  // Calculate available space for content
  const usedSpace = tweet.length + hashtagLength + ctaText.length;
  const availableSpace = 280 - usedSpace - 10; // -10 for safety

  // Add main content (truncated)
  let mainContent = script;
  if (mainContent.length > availableSpace) {
    mainContent = mainContent.substring(0, availableSpace - 5) + '... 🧵';
  }
  tweet += mainContent;

  // Add CTA
  if (ctaText) {
    tweet += ctaText;
  }

  // Add hashtags
  if (hashtagString) {
    tweet += `\n\n${hashtagString}`;
  }

  // Video script (same as tweet for Twitter)
  const videoScript = tweet;

  return {
    platform: 'Twitter',
    caption: tweet.trim(),
    hashtags: hashtagString,
    videoScript,
    characterCount: tweet.length,
    ready: tweet.length <= PLATFORM_LIMITS.twitter.caption
  };
}

/**
 * Format content for all platforms
 */
export function formatForAllPlatforms(content: ContentData): {
  tiktok: PlatformContent;
  instagram: PlatformContent;
  twitter: PlatformContent;
} {
  return {
    tiktok: formatForTikTok(content),
    instagram: formatForInstagram(content),
    twitter: formatForTwitter(content)
  };
}

/**
 * Create hook + CTA format for quick posting
 */
export function createHookCTAFormat(content: ContentData): {
  short: string;
  medium: string;
  long: string;
} {
  const { hook, script, cta, product } = content;

  // Short format (hook + CTA only)
  const short = [
    hook || script.substring(0, 100),
    cta || (product ? `Check out ${product.name}` : '')
  ].filter(Boolean).join('\n\n');

  // Medium format (hook + summary + CTA)
  const summary = script.length > 200 
    ? script.substring(0, 197) + '...'
    : script;
  
  const medium = [
    hook,
    summary,
    cta
  ].filter(Boolean).join('\n\n');

  // Long format (everything)
  const long = [
    hook,
    script,
    cta,
    product ? `🔗 ${product.link}` : ''
  ].filter(Boolean).join('\n\n');

  return { short, medium, long };
}

/**
 * Generate video script with timing markers
 */
export function generateVideoScript(content: ContentData): {
  intro: string;
  body: string;
  outro: string;
  fullScript: string;
  estimatedDuration: number; // in seconds
} {
  const { hook, script, cta } = content;

  // Intro (0-3 seconds)
  const intro = hook || script.substring(0, 50);

  // Body (3-30 seconds)
  const body = script.substring(0, 500);

  // Outro (30-35 seconds)
  const outro = cta || 'Follow for more!';

  // Full script
  const fullScript = `[0-3s] ${intro}\n\n[3-30s] ${body}\n\n[30-35s] ${outro}`;

  // Estimate duration (rough: 150 words per minute = 2.5 words per second)
  const wordCount = fullScript.split(' ').length;
  const estimatedDuration = Math.ceil(wordCount / 2.5);

  return {
    intro,
    body,
    outro,
    fullScript,
    estimatedDuration
  };
}

/**
 * Create copy-ready content package
 */
export function createCopyPackage(content: ContentData): {
  tiktok: {
    caption: string;
    videoScript: string;
    hashtags: string;
  };
  instagram: {
    caption: string;
    videoScript: string;
    hashtags: string;
  };
  twitter: {
    tweet: string;
    thread?: string[];
  };
  quickFormats: {
    short: string;
    medium: string;
    long: string;
  };
} {
  const platforms = formatForAllPlatforms(content);
  const quickFormats = createHookCTAFormat(content);

  // Create Twitter thread if content is long
  const twitterThread: string[] = [];
  if (content.script.length > 200) {
    const sentences = content.script.split('. ');
    let currentTweet = '';
    
    sentences.forEach((sentence, idx) => {
      if ((currentTweet + sentence).length < 250) {
        currentTweet += sentence + '. ';
      } else {
        if (currentTweet) {
          twitterThread.push(`${idx + 1}/ ${currentTweet.trim()}`);
        }
        currentTweet = sentence + '. ';
      }
    });
    
    if (currentTweet) {
      twitterThread.push(`${twitterThread.length + 1}/ ${currentTweet.trim()}`);
    }
  }

  return {
    tiktok: {
      caption: platforms.tiktok.caption,
      videoScript: platforms.tiktok.videoScript || '',
      hashtags: platforms.tiktok.hashtags
    },
    instagram: {
      caption: platforms.instagram.caption,
      videoScript: platforms.instagram.videoScript || '',
      hashtags: platforms.instagram.hashtags
    },
    twitter: {
      tweet: platforms.twitter.caption,
      thread: twitterThread.length > 0 ? twitterThread : undefined
    },
    quickFormats
  };
}

/**
 * Validate content for platform
 */
export function validatePlatformContent(
  content: string,
  platform: 'tiktok' | 'instagram' | 'twitter'
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  characterCount: number;
  characterLimit: number;
} {
  const limit = PLATFORM_LIMITS[platform].caption;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (content.length > limit) {
    errors.push(`Content exceeds ${platform} limit (${content.length}/${limit} characters)`);
  }

  if (platform === 'twitter' && content.length > 200) {
    warnings.push('Consider creating a thread for better engagement');
  }

  if (platform === 'tiktok' && content.length < 50) {
    warnings.push('TikTok captions should be more engaging (add emojis, hashtags)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    characterCount: content.length,
    characterLimit: limit
  };
}

export default {
  formatForTikTok,
  formatForInstagram,
  formatForTwitter,
  formatForAllPlatforms,
  createHookCTAFormat,
  generateVideoScript,
  createCopyPackage,
  validatePlatformContent
};
