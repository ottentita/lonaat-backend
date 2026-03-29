// Conversion Optimizer - Generates multiple CTA variants and optimizes for maximum conversion

interface Product {
  name: string;
  link: string;
  commission: string;
  niche: string;
}

interface CTAVariants {
  urgency: string;
  curiosity: string;
  direct: string;
}

interface OptimizedContent {
  hooks: string[];
  ctaVariants: CTAVariants;
  bestCombination: {
    hook: string;
    hookType: string;
    cta: string;
    ctaType: string;
    score: number;
  };
  allCombinations: Array<{
    hook: string;
    hookType: string;
    cta: string;
    ctaType: string;
    score: number;
  }>;
}

// Urgency CTA templates
const URGENCY_CTA_TEMPLATES = [
  "⏰ Limited time: Get {product} now before it's gone! → {link}",
  "🔥 Only 24 hours left! Grab {product} → {link}",
  "⚡ Flash sale: {product} ({commission} off) → {link}",
  "🚨 Last chance! {product} selling out fast → {link}",
  "💎 Exclusive offer ends soon: {product} → {link}",
  "⏳ Don't miss out! Get {product} today → {link}",
  "🎯 Act now: {product} limited availability → {link}",
  "🔔 Hurry! {product} offer expires midnight → {link}"
];

// Curiosity CTA templates
const CURIOSITY_CTA_TEMPLATES = [
  "🤔 Want to know my secret? Check out {product} → {link}",
  "👀 This is what changed everything: {product} → {link}",
  "🔍 Discover what 10,000+ people are using: {product} → {link}",
  "💡 The tool I wish I found sooner: {product} → {link}",
  "🎁 See what everyone's talking about: {product} → {link}",
  "✨ Find out why this went viral: {product} → {link}",
  "🚀 The game-changer nobody tells you about: {product} → {link}",
  "🔥 What the pros don't want you to know: {product} → {link}"
];

// Direct CTA templates
const DIRECT_CTA_TEMPLATES = [
  "👉 Get {product} here: {link}",
  "✅ Start with {product} now → {link}",
  "🎯 Try {product} risk-free: {link}",
  "💪 Join 50,000+ using {product} → {link}",
  "🚀 Get started with {product}: {link}",
  "⚡ Access {product} instantly → {link}",
  "🔗 Click here for {product}: {link}",
  "📲 Download {product} now → {link}"
];

/**
 * Generate 3 CTA variants (urgency, curiosity, direct)
 */
export function generateCTAVariants(product: Product): CTAVariants {
  // Select random template from each category
  const urgencyTemplate = URGENCY_CTA_TEMPLATES[
    Math.floor(Math.random() * URGENCY_CTA_TEMPLATES.length)
  ];
  const curiosityTemplate = CURIOSITY_CTA_TEMPLATES[
    Math.floor(Math.random() * CURIOSITY_CTA_TEMPLATES.length)
  ];
  const directTemplate = DIRECT_CTA_TEMPLATES[
    Math.floor(Math.random() * DIRECT_CTA_TEMPLATES.length)
  ];

  // Replace placeholders
  const urgency = urgencyTemplate
    .replace(/{product}/g, product.name)
    .replace(/{link}/g, product.link)
    .replace(/{commission}/g, product.commission);

  const curiosity = curiosityTemplate
    .replace(/{product}/g, product.name)
    .replace(/{link}/g, product.link);

  const direct = directTemplate
    .replace(/{product}/g, product.name)
    .replace(/{link}/g, product.link);

  return {
    urgency,
    curiosity,
    direct
  };
}

/**
 * Score a CTA based on conversion potential
 */
function scoreCTA(cta: string, type: 'urgency' | 'curiosity' | 'direct'): number {
  let score = 0;

  // Base score by type
  const typeScores = {
    urgency: 30,    // Urgency drives immediate action
    curiosity: 25,  // Curiosity creates interest
    direct: 20      // Direct is clear but less compelling
  };
  score += typeScores[type];

  // Emoji bonus (engagement)
  const emojiCount = (cta.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  score += Math.min(emojiCount * 3, 15);

  // Action words
  const actionWords = ['get', 'start', 'try', 'join', 'access', 'download', 'click', 'grab'];
  actionWords.forEach(word => {
    if (cta.toLowerCase().includes(word)) score += 5;
  });

  // Urgency indicators
  const urgencyWords = ['now', 'today', 'limited', 'hurry', 'fast', 'quick', 'last chance'];
  urgencyWords.forEach(word => {
    if (cta.toLowerCase().includes(word)) score += 4;
  });

  // Social proof
  if (/\d+\+?\s*(people|users|customers)/i.test(cta)) {
    score += 10;
  }

  // Risk reduction
  const riskWords = ['free', 'risk-free', 'guarantee', 'trial'];
  riskWords.forEach(word => {
    if (cta.toLowerCase().includes(word)) score += 8;
  });

  // Length optimization (40-80 chars ideal for CTAs)
  if (cta.length >= 40 && cta.length <= 80) {
    score += 10;
  } else if (cta.length < 40) {
    score += 5;
  }

  return score;
}

/**
 * Score a hook based on engagement potential
 */
function scoreHook(hook: string, type: string): number {
  let score = 0;

  // Pattern interrupt words
  const patternInterrupts = ['stop', 'warning', 'secret', 'nobody', 'hidden', 'truth', 'mistake'];
  patternInterrupts.forEach(word => {
    if (hook.toLowerCase().includes(word)) score += 10;
  });

  // Emotional triggers
  const emotionalWords = ['insane', 'crazy', 'shocking', 'amazing', 'unbelievable', 'weird'];
  emotionalWords.forEach(word => {
    if (hook.toLowerCase().includes(word)) score += 8;
  });

  // Numbers
  if (/\d+/.test(hook)) score += 5;

  // Questions
  if (hook.includes('?')) score += 7;

  // Urgency
  const urgencyWords = ['now', 'today', 'fast', 'quick', 'immediately'];
  urgencyWords.forEach(word => {
    if (hook.toLowerCase().includes(word)) score += 6;
  });

  // Length optimization (30-60 chars)
  if (hook.length >= 30 && hook.length <= 60) {
    score += 10;
  } else if (hook.length < 30) {
    score += 5;
  }

  // Type bonuses
  const typeBonuses: { [key: string]: number } = {
    curiosity: 5,
    fear: 4,
    opportunity: 3
  };
  score += typeBonuses[type] || 0;

  return score;
}

/**
 * Calculate combination score (hook + CTA synergy)
 */
function scoreCombination(
  hook: string,
  hookType: string,
  cta: string,
  ctaType: 'urgency' | 'curiosity' | 'direct'
): number {
  const hookScore = scoreHook(hook, hookType);
  const ctaScore = scoreCTA(cta, ctaType);

  // Base score
  let combinationScore = hookScore + ctaScore;

  // Synergy bonuses
  // Fear hook + Urgency CTA = strong combo
  if (hookType === 'fear' && ctaType === 'urgency') {
    combinationScore += 15;
  }

  // Curiosity hook + Curiosity CTA = consistent messaging
  if (hookType === 'curiosity' && ctaType === 'curiosity') {
    combinationScore += 12;
  }

  // Opportunity hook + Urgency CTA = FOMO effect
  if (hookType === 'opportunity' && ctaType === 'urgency') {
    combinationScore += 10;
  }

  // Direct hook + Direct CTA = clarity
  if (hookType === 'direct' && ctaType === 'direct') {
    combinationScore += 8;
  }

  return combinationScore;
}

/**
 * Select best hook + CTA combination
 */
export function selectBestCombination(
  hooks: { [key: string]: string },
  ctaVariants: CTAVariants
): {
  hook: string;
  hookType: string;
  cta: string;
  ctaType: string;
  score: number;
} {
  const combinations = [];

  // Test all hook + CTA combinations
  for (const [hookType, hook] of Object.entries(hooks)) {
    for (const [ctaType, cta] of Object.entries(ctaVariants)) {
      const score = scoreCombination(
        hook,
        hookType,
        cta,
        ctaType as 'urgency' | 'curiosity' | 'direct'
      );

      combinations.push({
        hook,
        hookType,
        cta,
        ctaType,
        score
      });
    }
  }

  // Sort by score
  combinations.sort((a, b) => b.score - a.score);

  console.log('🎯 Top 3 combinations:');
  combinations.slice(0, 3).forEach((combo, i) => {
    console.log(`  ${i + 1}. ${combo.hookType} + ${combo.ctaType}: ${combo.score} pts`);
  });

  return combinations[0];
}

/**
 * Generate optimized content with multiple variants
 */
export function generateOptimizedContent(
  hooks: { [key: string]: string },
  product: Product
): OptimizedContent {
  // Generate 3 CTA variants
  const ctaVariants = generateCTAVariants(product);

  // Calculate all combinations
  const allCombinations = [];
  for (const [hookType, hook] of Object.entries(hooks)) {
    for (const [ctaType, cta] of Object.entries(ctaVariants)) {
      const score = scoreCombination(
        hook,
        hookType,
        cta,
        ctaType as 'urgency' | 'curiosity' | 'direct'
      );

      allCombinations.push({
        hook,
        hookType,
        cta,
        ctaType,
        score
      });
    }
  }

  // Sort and select best
  allCombinations.sort((a, b) => b.score - a.score);
  const bestCombination = allCombinations[0];

  console.log('✅ Conversion optimization complete');
  console.log('🏆 Best combination:', `${bestCombination.hookType} + ${bestCombination.ctaType}`);
  console.log('📊 Score:', bestCombination.score);

  return {
    hooks: Object.values(hooks),
    ctaVariants,
    bestCombination,
    allCombinations: allCombinations.slice(0, 10) // Top 10 combinations
  };
}

/**
 * Analyze CTA performance potential
 */
export function analyzeCTAPerformance(cta: string): {
  score: number;
  strengths: string[];
  improvements: string[];
  type: 'urgency' | 'curiosity' | 'direct' | 'unknown';
} {
  const strengths: string[] = [];
  const improvements: string[] = [];
  let score = 0;

  // Detect CTA type
  let type: 'urgency' | 'curiosity' | 'direct' | 'unknown' = 'unknown';
  if (/limited|hurry|now|today|last|quick/i.test(cta)) {
    type = 'urgency';
  } else if (/discover|secret|find out|see what|check out/i.test(cta)) {
    type = 'curiosity';
  } else if (/get|start|try|click|download/i.test(cta)) {
    type = 'direct';
  }

  // Score based on type
  const typeScore = scoreCTA(cta, type === 'unknown' ? 'direct' : type);
  score = typeScore;

  // Analyze strengths
  if (/[\u{1F300}-\u{1F9FF}]/gu.test(cta)) {
    strengths.push('Uses emojis for engagement');
  }
  if (/\d+/.test(cta)) {
    strengths.push('Includes specific numbers');
  }
  if (/free|risk-free|guarantee/i.test(cta)) {
    strengths.push('Reduces perceived risk');
  }
  if (/limited|hurry|now/i.test(cta)) {
    strengths.push('Creates urgency');
  }

  // Suggest improvements
  if (cta.length > 100) {
    improvements.push('CTA is too long, make it more concise');
  }
  if (!/[\u{1F300}-\u{1F9FF}]/gu.test(cta)) {
    improvements.push('Add emojis to increase engagement');
  }
  if (!/→|👉|🔗/u.test(cta)) {
    improvements.push('Add visual arrow or pointer to link');
  }
  if (!/get|start|try|click|join/i.test(cta)) {
    improvements.push('Add clear action verb');
  }

  return {
    score,
    strengths,
    improvements,
    type
  };
}

export default {
  generateCTAVariants,
  selectBestCombination,
  generateOptimizedContent,
  analyzeCTAPerformance
};
