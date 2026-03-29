// Enhanced CTA Generator - Creates compelling CTAs with automatic product insertion

interface AffiliateProduct {
  id: string;
  name: string;
  niche: string;
  description: string;
  link: string;
  commission: string;
}

// CTA Templates by niche with urgency and benefit focus
const CTA_TEMPLATES = {
  tech: [
    "Start earning with this tool 👉 {link}",
    "Try this AI now before it blows up 🚀 {link}",
    "Get early access to {product} → {link}",
    "Automate your workflow with {product} 💻 {link}",
    "Join 10,000+ users crushing it with {product} ⚡ {link}",
    "Limited spots available for {product} 🔥 {link}",
    "Transform your business with {product} → {link}",
    "This tool changed everything for me 👉 {link}"
  ],
  fitness: [
    "Start your transformation today 💪 {link}",
    "Get shredded with {product} 🔥 {link}",
    "Join the fitness revolution → {link}",
    "Your dream body is one click away 👉 {link}",
    "Limited time: {commission} off {product} 💯 {link}",
    "10,000+ success stories with {product} ⚡ {link}",
    "Stop wasting time, start getting results → {link}",
    "This is how I got in the best shape of my life 👉 {link}"
  ],
  beauty: [
    "Glow up with {product} ✨ {link}",
    "Get flawless skin in 30 days 👉 {link}",
    "This changed my skincare routine forever 💎 {link}",
    "Join 50,000+ happy customers → {link}",
    "Limited stock: Get {product} now 🔥 {link}",
    "Your best skin starts here 👉 {link}",
    "Dermatologist-approved {product} ⚡ {link}",
    "See results in 7 days or your money back → {link}"
  ],
  business: [
    "Start earning passive income today 💰 {link}",
    "Scale to $10k/month with {product} 🚀 {link}",
    "Join 5,000+ successful entrepreneurs → {link}",
    "This is how I quit my 9-5 👉 {link}",
    "Limited time: {commission} commission on {product} 🔥 {link}",
    "Build your empire with {product} ⚡ {link}",
    "From $0 to $100k with this system → {link}",
    "Stop trading time for money, start here 👉 {link}"
  ],
  education: [
    "Master this skill in 30 days 📚 {link}",
    "Get certified with {product} 🎓 {link}",
    "Join 100,000+ students worldwide → {link}",
    "Limited enrollment: Secure your spot 👉 {link}",
    "Learn from industry experts 🔥 {link}",
    "Your future starts here ⚡ {link}",
    "Lifetime access to {product} → {link}",
    "This course changed my career 👉 {link}"
  ],
  fashion: [
    "Upgrade your style with {product} 👗 {link}",
    "Limited drop: Get it before it's gone 🔥 {link}",
    "Join the fashion revolution → {link}",
    "Exclusive access to {product} 👉 {link}",
    "10,000+ 5-star reviews ⭐ {link}",
    "Your wardrobe upgrade starts here ⚡ {link}",
    "Free shipping on {product} today → {link}",
    "This is my secret to looking fresh 👉 {link}"
  ],
  food: [
    "Taste the difference with {product} 🍕 {link}",
    "Get healthy meals delivered 👉 {link}",
    "Limited offer: {commission} off your first order 🔥 {link}",
    "Join 20,000+ satisfied customers → {link}",
    "Your kitchen revolution starts here ⚡ {link}",
    "Chef-approved {product} 👨‍🍳 {link}",
    "Free trial of {product} → {link}",
    "This changed how I eat 👉 {link}"
  ],
  lifestyle: [
    "Transform your life with {product} ✨ {link}",
    "Join the movement 👉 {link}",
    "Limited time: Special offer on {product} 🔥 {link}",
    "Your best life starts here → {link}",
    "10,000+ lives changed ⚡ {link}",
    "Get {product} risk-free 💎 {link}",
    "This is what changed everything for me → {link}",
    "Start living your dream life 👉 {link}"
  ],
  general: [
    "Check this out 👉 {link}",
    "Limited offer - don't miss out 🔥 {link}",
    "Get {product} now → {link}",
    "Join thousands of happy customers ⚡ {link}",
    "Your solution is here 👉 {link}",
    "Try {product} risk-free → {link}",
    "This is a game-changer 🚀 {link}",
    "Click here to get started 👉 {link}"
  ]
};

// Urgency boosters
const URGENCY_PHRASES = [
  "⏰ Only 24 hours left!",
  "🔥 Limited spots available!",
  "⚡ Flash sale ends soon!",
  "🚨 Don't miss out!",
  "💎 Exclusive offer!",
  "🎯 Last chance!",
  "⭐ Today only!",
  "🔔 Act fast!"
];

// Social proof boosters
const SOCIAL_PROOF = [
  "Join 10,000+ users",
  "Trusted by 50,000+ customers",
  "⭐⭐⭐⭐⭐ 5-star rated",
  "Featured in Forbes, TechCrunch",
  "Used by top companies",
  "100,000+ downloads",
  "Recommended by experts",
  "Award-winning product"
];

/**
 * Generate a compelling CTA for a product
 */
export function generateProductCTA(
  product: AffiliateProduct,
  options: {
    includeUrgency?: boolean;
    includeSocialProof?: boolean;
    style?: 'short' | 'medium' | 'long';
  } = {}
): string {
  const { includeUrgency = true, includeSocialProof = false, style = 'medium' } = options;

  // Get niche-specific templates
  const templates = CTA_TEMPLATES[product.niche as keyof typeof CTA_TEMPLATES] || CTA_TEMPLATES.general;
  
  // Pick random template
  let cta = templates[Math.floor(Math.random() * templates.length)];

  // Replace placeholders
  cta = cta.replace(/{product}/g, product.name);
  cta = cta.replace(/{link}/g, product.link);
  cta = cta.replace(/{commission}/g, product.commission);

  // Add urgency if requested
  if (includeUrgency && Math.random() > 0.5) {
    const urgency = URGENCY_PHRASES[Math.floor(Math.random() * URGENCY_PHRASES.length)];
    cta = `${urgency} ${cta}`;
  }

  // Add social proof if requested
  if (includeSocialProof && Math.random() > 0.6) {
    const proof = SOCIAL_PROOF[Math.floor(Math.random() * SOCIAL_PROOF.length)];
    cta = `${proof}! ${cta}`;
  }

  return cta;
}

/**
 * Generate multiple CTA variations for A/B testing
 */
export function generateCTAVariations(
  product: AffiliateProduct,
  count: number = 3
): string[] {
  const variations: string[] = [];
  const templates = CTA_TEMPLATES[product.niche as keyof typeof CTA_TEMPLATES] || CTA_TEMPLATES.general;

  // Ensure we don't request more than available
  const maxCount = Math.min(count, templates.length);

  for (let i = 0; i < maxCount; i++) {
    let cta = templates[i];
    
    // Replace placeholders
    cta = cta.replace(/{product}/g, product.name);
    cta = cta.replace(/{link}/g, product.link);
    cta = cta.replace(/{commission}/g, product.commission);

    // Randomly add urgency to some
    if (i % 2 === 0) {
      const urgency = URGENCY_PHRASES[Math.floor(Math.random() * URGENCY_PHRASES.length)];
      cta = `${urgency} ${cta}`;
    }

    variations.push(cta);
  }

  return variations;
}

/**
 * Insert CTA into content at the optimal position
 */
export function insertCTAIntoContent(
  content: string,
  cta: string,
  position: 'end' | 'middle' | 'both' = 'end'
): string {
  const lines = content.split('\n');
  
  if (position === 'end') {
    // Append at the end
    return `${content}\n\n━━━━━━━━━━━━━━━\n${cta}`;
  }
  
  if (position === 'middle') {
    // Insert in the middle
    const middleIndex = Math.floor(lines.length / 2);
    lines.splice(middleIndex, 0, `\n${cta}\n`);
    return lines.join('\n');
  }
  
  if (position === 'both') {
    // Insert in middle and end
    const middleIndex = Math.floor(lines.length / 2);
    lines.splice(middleIndex, 0, `\n${cta}\n`);
    return `${lines.join('\n')}\n\n━━━━━━━━━━━━━━━\n${cta}`;
  }

  return content;
}

/**
 * Auto-monetize content with best matching product
 */
export function autoMonetizeContent(
  content: string,
  product: AffiliateProduct,
  options: {
    ctaPosition?: 'end' | 'middle' | 'both';
    includeUrgency?: boolean;
    includeSocialProof?: boolean;
  } = {}
): {
  monetizedContent: string;
  cta: string;
  product: AffiliateProduct;
} {
  const { ctaPosition = 'end', includeUrgency = true, includeSocialProof = false } = options;

  // Generate CTA
  const cta = generateProductCTA(product, { includeUrgency, includeSocialProof });

  // Insert CTA into content
  const monetizedContent = insertCTAIntoContent(content, cta, ctaPosition);

  console.log('💰 Content auto-monetized');
  console.log('📦 Product:', product.name);
  console.log('💬 CTA:', cta);

  return {
    monetizedContent,
    cta,
    product
  };
}

/**
 * Create a complete monetization package
 */
export function createMonetizationPackage(
  content: string,
  product: AffiliateProduct
): {
  original: string;
  monetized: string;
  cta: string;
  ctaVariations: string[];
  product: {
    name: string;
    niche: string;
    commission: string;
    link: string;
  };
  stats: {
    originalLength: number;
    monetizedLength: number;
    ctaLength: number;
  };
} {
  const cta = generateProductCTA(product);
  const ctaVariations = generateCTAVariations(product, 3);
  const monetized = insertCTAIntoContent(content, cta);

  return {
    original: content,
    monetized,
    cta,
    ctaVariations,
    product: {
      name: product.name,
      niche: product.niche,
      commission: product.commission,
      link: product.link
    },
    stats: {
      originalLength: content.length,
      monetizedLength: monetized.length,
      ctaLength: cta.length
    }
  };
}

export default {
  generateProductCTA,
  generateCTAVariations,
  insertCTAIntoContent,
  autoMonetizeContent,
  createMonetizationPackage
};
