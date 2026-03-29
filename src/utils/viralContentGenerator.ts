// Viral Content Generator - Creates viral-ready content with Hook → Value → Curiosity → CTA structure

interface ViralContentStructure {
  hook: string;
  value: string;
  curiosity: string;
  cta: string;
  fullContent: string;
}

interface HookSet {
  controversial: string;
  curiosity: string;
  fear: string;
  opportunity: string;
  direct: string;
}

interface ViralContent {
  selectedHook: string;
  hookType: string;
  alternativeHooks: HookSet;
  value: string;
  curiosity: string;
  cta: string;
  fullContent: string;
  platformReady: {
    tiktok: string;
    instagram: string;
  };
}

// Hook templates by type
const HOOK_TEMPLATES = {
  controversial: [
    "Nobody talks about this, but {topic} is actually {claim}",
    "Unpopular opinion: {topic} is completely overrated",
    "Hot take: {topic} doesn't work the way you think",
    "Everyone's doing {topic} wrong and here's why",
    "The truth about {topic} that nobody wants to hear",
    "Stop doing {topic} - here's what actually works",
    "I'm about to ruin {topic} for you forever",
    "Why {topic} is a scam (and what to do instead)"
  ],
  curiosity: [
    "I discovered something weird about {topic}...",
    "This {topic} secret changed everything for me",
    "You won't believe what I found out about {topic}",
    "The hidden truth about {topic} nobody tells you",
    "I tested {topic} for 30 days and here's what happened",
    "What they don't want you to know about {topic}",
    "I cracked the code on {topic} and it's insane",
    "This {topic} trick went viral for a reason"
  ],
  fear: [
    "Stop! You're making this {topic} mistake right now",
    "If you're doing {topic}, you need to see this",
    "Warning: {topic} could be costing you everything",
    "Don't start {topic} until you watch this",
    "This {topic} mistake is killing your results",
    "You're losing money with {topic} and don't even know it",
    "Avoid this {topic} trap at all costs",
    "The {topic} mistake that ruins everything"
  ],
  opportunity: [
    "This is your sign to start {topic} today",
    "The best time to {topic} was yesterday. The second best is now",
    "How I made ${amount} with {topic} in {timeframe}",
    "This {topic} opportunity won't last forever",
    "Why now is the perfect time for {topic}",
    "The {topic} gold rush is happening right now",
    "Get in early: {topic} is about to explode",
    "This {topic} method is changing lives"
  ],
  direct: [
    "Here's exactly how to {topic}",
    "The only {topic} guide you'll ever need",
    "Master {topic} in 5 minutes",
    "The fastest way to {topic}",
    "How to {topic} like a pro",
    "The ultimate {topic} blueprint",
    "Everything you need to know about {topic}",
    "{topic} explained in 60 seconds"
  ]
};

// Value statement templates
const VALUE_TEMPLATES = [
  "Here's what makes this game-changing: {benefit}",
  "This works because {reason}",
  "The secret is {method}",
  "What you need to understand is {insight}",
  "The difference is {differentiator}",
  "Here's the breakthrough: {discovery}",
  "This changes everything because {impact}",
  "The key insight: {keypoint}"
];

// Curiosity/Proof templates
const CURIOSITY_TEMPLATES = [
  "I tested this for {timeframe} and {result}",
  "Over {number} people have already {achievement}",
  "The results speak for themselves: {proof}",
  "Here's the proof: {evidence}",
  "Just look at these results: {outcome}",
  "The data shows {statistic}",
  "Real results from real people: {testimonial}",
  "This is what happened when I {action}"
];

/**
 * Generate 5 different hooks for content
 */
export function generateHooks(topic: string, context: string = ''): HookSet {
  const topicClean = topic.toLowerCase();
  
  // Generate controversial hook
  const controversialTemplate = HOOK_TEMPLATES.controversial[
    Math.floor(Math.random() * HOOK_TEMPLATES.controversial.length)
  ];
  const controversial = controversialTemplate
    .replace(/{topic}/g, topicClean)
    .replace(/{claim}/g, 'not what you think');

  // Generate curiosity hook
  const curiosityTemplate = HOOK_TEMPLATES.curiosity[
    Math.floor(Math.random() * HOOK_TEMPLATES.curiosity.length)
  ];
  const curiosity = curiosityTemplate.replace(/{topic}/g, topicClean);

  // Generate fear hook
  const fearTemplate = HOOK_TEMPLATES.fear[
    Math.floor(Math.random() * HOOK_TEMPLATES.fear.length)
  ];
  const fear = fearTemplate.replace(/{topic}/g, topicClean);

  // Generate opportunity hook
  const opportunityTemplate = HOOK_TEMPLATES.opportunity[
    Math.floor(Math.random() * HOOK_TEMPLATES.opportunity.length)
  ];
  const opportunity = opportunityTemplate
    .replace(/{topic}/g, topicClean)
    .replace(/{amount}/g, '10k')
    .replace(/{timeframe}/g, '30 days');

  // Generate direct hook
  const directTemplate = HOOK_TEMPLATES.direct[
    Math.floor(Math.random() * HOOK_TEMPLATES.direct.length)
  ];
  const direct = directTemplate.replace(/{topic}/g, topicClean);

  return {
    controversial,
    curiosity,
    fear,
    opportunity,
    direct
  };
}

/**
 * Score and select the best hook based on engagement potential
 */
export function selectBestHook(hooks: HookSet, topic: string): {
  hook: string;
  type: string;
  score: number;
} {
  const scores: { hook: string; type: string; score: number }[] = [];

  // Score each hook type
  for (const [type, hook] of Object.entries(hooks)) {
    let score = 0;

    // Pattern interrupt words (high engagement)
    const patternInterrupts = ['stop', 'warning', 'secret', 'nobody', 'hidden', 'truth', 'mistake'];
    patternInterrupts.forEach(word => {
      if (hook.toLowerCase().includes(word)) score += 10;
    });

    // Emotional triggers
    const emotionalWords = ['insane', 'crazy', 'shocking', 'amazing', 'unbelievable'];
    emotionalWords.forEach(word => {
      if (hook.toLowerCase().includes(word)) score += 8;
    });

    // Numbers (specificity)
    if (/\d+/.test(hook)) score += 5;

    // Question marks (curiosity)
    if (hook.includes('?')) score += 7;

    // Urgency words
    const urgencyWords = ['now', 'today', 'fast', 'quick', 'immediately'];
    urgencyWords.forEach(word => {
      if (hook.toLowerCase().includes(word)) score += 6;
    });

    // Length optimization (30-60 chars is ideal for hooks)
    if (hook.length >= 30 && hook.length <= 60) {
      score += 10;
    } else if (hook.length < 30) {
      score += 5;
    }

    // Type-specific bonuses
    if (type === 'curiosity') score += 5; // Curiosity performs well
    if (type === 'fear') score += 4; // Fear drives action
    if (type === 'opportunity') score += 3; // FOMO works

    scores.push({ hook, type, score });
  }

  // Sort by score and return best
  scores.sort((a, b) => b.score - a.score);
  
  console.log('🎯 Hook scores:');
  scores.forEach(s => console.log(`  ${s.type}: ${s.score} - "${s.hook}"`));

  return scores[0];
}

/**
 * Generate viral content structure
 */
export function generateViralStructure(
  topic: string,
  description: string,
  product?: {
    name: string;
    link: string;
    commission: string;
  }
): ViralContentStructure {
  // 1. Generate hooks
  const hooks = generateHooks(topic, description);
  const bestHook = selectBestHook(hooks, topic);

  // 2. Generate value statement
  const valueTemplate = VALUE_TEMPLATES[
    Math.floor(Math.random() * VALUE_TEMPLATES.length)
  ];
  const value = valueTemplate
    .replace(/{benefit}/g, description.substring(0, 100))
    .replace(/{reason}/g, 'it actually works')
    .replace(/{method}/g, 'the proven system')
    .replace(/{insight}/g, 'how this changes everything')
    .replace(/{differentiator}/g, 'the unique approach')
    .replace(/{discovery}/g, 'what I found')
    .replace(/{impact}/g, 'the results are real')
    .replace(/{keypoint}/g, 'the strategy that works');

  // 3. Generate curiosity/proof
  const curiosityTemplate = CURIOSITY_TEMPLATES[
    Math.floor(Math.random() * CURIOSITY_TEMPLATES.length)
  ];
  const curiosity = curiosityTemplate
    .replace(/{timeframe}/g, '30 days')
    .replace(/{number}/g, '10,000')
    .replace(/{result}/g, 'the results were incredible')
    .replace(/{achievement}/g, 'seen massive results')
    .replace(/{proof}/g, 'it works')
    .replace(/{evidence}/g, 'real data')
    .replace(/{outcome}/g, 'game-changing results')
    .replace(/{statistic}/g, '95% success rate')
    .replace(/{testimonial}/g, 'life-changing outcomes')
    .replace(/{action}/g, 'tried this method');

  // 4. Generate CTA (will be replaced with monetized CTA if product exists)
  let cta = "Follow for more tips like this! 🚀";
  
  if (product) {
    const ctaTemplates = [
      `Start earning with ${product.name} 👉 ${product.link}`,
      `Get ${product.name} now (${product.commission} commission) → ${product.link}`,
      `Try ${product.name} risk-free 🔥 ${product.link}`,
      `Join thousands using ${product.name} ⚡ ${product.link}`
    ];
    cta = ctaTemplates[Math.floor(Math.random() * ctaTemplates.length)];
  }

  // 5. Combine into full content
  const fullContent = `${bestHook.hook}

${value}

${curiosity}

${cta}`;

  return {
    hook: bestHook.hook,
    value,
    curiosity,
    cta,
    fullContent
  };
}

/**
 * Create complete viral content package
 */
export function createViralContent(
  topic: string,
  description: string,
  product?: {
    name: string;
    link: string;
    commission: string;
  }
): ViralContent {
  // Generate all 5 hooks
  const allHooks = generateHooks(topic, description);
  
  // Select best hook
  const bestHook = selectBestHook(allHooks, topic);
  
  // Generate viral structure with best hook
  const structure = generateViralStructure(topic, description, product);

  // Create platform-ready versions
  const tiktokVersion = formatForTikTok(structure);
  const instagramVersion = formatForInstagram(structure);

  console.log('✅ Viral content generated');
  console.log('🎯 Selected hook type:', bestHook.type);
  console.log('📊 Hook score:', bestHook.score);

  return {
    selectedHook: bestHook.hook,
    hookType: bestHook.type,
    alternativeHooks: allHooks,
    value: structure.value,
    curiosity: structure.curiosity,
    cta: structure.cta,
    fullContent: structure.fullContent,
    platformReady: {
      tiktok: tiktokVersion,
      instagram: instagramVersion
    }
  };
}

/**
 * Format viral content for TikTok
 */
function formatForTikTok(structure: ViralContentStructure): string {
  return `${structure.hook} 🔥

${structure.value}

${structure.curiosity} 💯

${structure.cta}

#viral #fyp #trending #foryou #musthave`;
}

/**
 * Format viral content for Instagram
 */
function formatForInstagram(structure: ViralContentStructure): string {
  return `${structure.hook} 🔥
.
${structure.value}
.
${structure.curiosity} 💯
.
${structure.cta}
.
━━━━━━━━━━━━━━━
#viral #trending #instagram #reels #explore #foryou #instagood #motivation #success #lifestyle`;
}

/**
 * Analyze viral potential of content
 */
export function analyzeViralPotential(content: string): {
  score: number;
  strengths: string[];
  improvements: string[];
} {
  let score = 0;
  const strengths: string[] = [];
  const improvements: string[] = [];

  // Check for hook
  const hasStrongHook = /^(stop|warning|secret|nobody|discover|this|why|how)/i.test(content);
  if (hasStrongHook) {
    score += 20;
    strengths.push('Strong pattern-interrupt hook');
  } else {
    improvements.push('Add a stronger hook at the beginning');
  }

  // Check for emotional triggers
  const emotionalWords = ['insane', 'crazy', 'shocking', 'amazing', 'unbelievable', 'secret', 'hidden'];
  const hasEmotion = emotionalWords.some(word => content.toLowerCase().includes(word));
  if (hasEmotion) {
    score += 15;
    strengths.push('Contains emotional triggers');
  } else {
    improvements.push('Add emotional trigger words');
  }

  // Check for numbers/specificity
  if (/\d+/.test(content)) {
    score += 10;
    strengths.push('Includes specific numbers');
  } else {
    improvements.push('Add specific numbers or data');
  }

  // Check for CTA
  const hasCTA = /follow|click|link|check|get|start|try|join/i.test(content);
  if (hasCTA) {
    score += 20;
    strengths.push('Clear call-to-action');
  } else {
    improvements.push('Add a clear call-to-action');
  }

  // Check for emojis
  const emojiCount = (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  if (emojiCount >= 2) {
    score += 10;
    strengths.push('Good emoji usage');
  } else {
    improvements.push('Add more emojis for engagement');
  }

  // Check length (300-500 chars is ideal)
  if (content.length >= 300 && content.length <= 500) {
    score += 15;
    strengths.push('Optimal content length');
  } else if (content.length < 300) {
    improvements.push('Content could be more detailed');
  } else {
    improvements.push('Content is too long, make it more concise');
  }

  // Check for social proof
  const hasSocialProof = /\d+\s*(people|users|customers|results|success)/i.test(content);
  if (hasSocialProof) {
    score += 10;
    strengths.push('Includes social proof');
  } else {
    improvements.push('Add social proof or statistics');
  }

  return {
    score: Math.min(100, score),
    strengths,
    improvements
  };
}

export default {
  generateHooks,
  selectBestHook,
  generateViralStructure,
  createViralContent,
  analyzeViralPotential
};
