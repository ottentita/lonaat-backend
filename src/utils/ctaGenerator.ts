// CTA Generator - Creates compelling call-to-action messages

interface Product {
  name: string;
  description: string;
  affiliateLink: string;
  category: string;
}

// CTA Templates by category
const ctaTemplates = {
  general: [
    "Check the link in bio to get yours now! 👉",
    "Limited offer — don't miss out! Click the link below 👇",
    "Click now to start earning! Link in bio 💰",
    "Grab yours before it's gone! Link below ⬇️",
    "Get instant access now! Click here 👉",
    "Don't wait — limited stock available! 🔥",
    "Your exclusive deal is waiting! Tap the link 💎",
    "Join thousands of happy customers! Link in bio ✨"
  ],
  tech: [
    "Upgrade your tech game now! Link in bio 🚀",
    "Get the latest tech at an unbeatable price! 💻",
    "Limited tech deal — grab it now! ⚡",
    "Transform your setup today! Click below 🎮",
    "Don't miss this tech steal! Link here 📱"
  ],
  fitness: [
    "Start your fitness journey today! Link in bio 💪",
    "Get fit faster with this! Click now 🏋️",
    "Limited fitness offer — don't miss out! 🔥",
    "Transform your body now! Link below ⬇️",
    "Your dream physique awaits! Click here 💯"
  ],
  beauty: [
    "Glow up with this! Link in bio ✨",
    "Get your beauty essentials now! 💄",
    "Limited beauty deal — grab it! 🌟",
    "Look stunning today! Click below 💅",
    "Your beauty secret is here! Link in bio 👑"
  ],
  fashion: [
    "Upgrade your wardrobe now! Link in bio 👗",
    "Limited fashion drop — don't miss it! 🔥",
    "Get this look today! Click below 👕",
    "Style yourself perfectly! Link here 👠",
    "Exclusive fashion deal! Tap now 💎"
  ],
  food: [
    "Taste the difference! Link in bio 🍕",
    "Limited food offer — order now! 🔥",
    "Get your favorite treats! Click below 🍰",
    "Don't miss this delicious deal! Link here 🍔",
    "Satisfy your cravings now! Tap the link 🌮"
  ],
  education: [
    "Start learning today! Link in bio 📚",
    "Limited course offer — enroll now! 🎓",
    "Master new skills! Click below 💡",
    "Your future starts here! Link in bio 🚀",
    "Don't miss this learning opportunity! 📖"
  ],
  business: [
    "Grow your business now! Link in bio 📈",
    "Limited business tool offer! 💼",
    "Scale faster with this! Click below 🚀",
    "Your success starts here! Link in bio 💰",
    "Don't miss this business opportunity! 🎯"
  ]
};

// Urgency phrases
const urgencyPhrases = [
  "Only a few left in stock!",
  "Sale ends soon!",
  "Limited time offer!",
  "Exclusive deal!",
  "Flash sale!",
  "Today only!",
  "While supplies last!",
  "Don't wait!"
];

// Benefit phrases
const benefitPhrases = [
  "Save big today!",
  "Get instant results!",
  "Transform your life!",
  "Join the winners!",
  "Experience the difference!",
  "Unlock your potential!",
  "Make it happen!",
  "Change starts now!"
];

/**
 * Generate a compelling CTA for a product
 */
export function generateCTA(product: Product, includeUrgency: boolean = true): string {
  const category = product.category.toLowerCase();
  
  // Get category-specific CTAs or fall back to general
  const templates = ctaTemplates[category as keyof typeof ctaTemplates] || ctaTemplates.general;
  
  // Pick a random CTA template
  const cta = templates[Math.floor(Math.random() * templates.length)];
  
  // Optionally add urgency
  if (includeUrgency && Math.random() > 0.5) {
    const urgency = urgencyPhrases[Math.floor(Math.random() * urgencyPhrases.length)];
    return `${urgency} ${cta}`;
  }
  
  return cta;
}

/**
 * Generate multiple CTAs for A/B testing
 */
export function generateMultipleCTAs(product: Product, count: number = 3): string[] {
  const ctas: string[] = [];
  const category = product.category.toLowerCase();
  const templates = ctaTemplates[category as keyof typeof ctaTemplates] || ctaTemplates.general;
  
  // Ensure we don't request more CTAs than available
  const maxCount = Math.min(count, templates.length);
  
  // Get unique CTAs
  const usedIndices = new Set<number>();
  while (ctas.length < maxCount) {
    const index = Math.floor(Math.random() * templates.length);
    if (!usedIndices.has(index)) {
      usedIndices.add(index);
      const cta = templates[index];
      
      // Randomly add urgency to some CTAs
      if (Math.random() > 0.6) {
        const urgency = urgencyPhrases[Math.floor(Math.random() * urgencyPhrases.length)];
        ctas.push(`${urgency} ${cta}`);
      } else {
        ctas.push(cta);
      }
    }
  }
  
  return ctas;
}

/**
 * Generate a benefit-focused CTA
 */
export function generateBenefitCTA(product: Product): string {
  const benefit = benefitPhrases[Math.floor(Math.random() * benefitPhrases.length)];
  const category = product.category.toLowerCase();
  const templates = ctaTemplates[category as keyof typeof ctaTemplates] || ctaTemplates.general;
  const cta = templates[Math.floor(Math.random() * templates.length)];
  
  return `${benefit} ${cta}`;
}

/**
 * Format affiliate link with emoji
 */
export function formatAffiliateLink(link: string): string {
  return `👉 ${link}`;
}

/**
 * Generate complete monetized content footer
 */
export function generateMonetizedFooter(product: Product): string {
  const cta = generateCTA(product);
  const link = formatAffiliateLink(product.affiliateLink);
  
  return `\n\n${cta}\n${link}`;
}

/**
 * Enhance AI prompt with product information
 */
export function enhancePromptWithProduct(basePrompt: string, product: Product): string {
  return `${basePrompt}

Product to promote: ${product.name}
Key benefit: ${product.description}
Category: ${product.category}

Make sure to:
- Highlight the product's main benefit naturally
- Create excitement and urgency
- Include a strong call-to-action
- Keep it authentic and engaging`;
}

export default {
  generateCTA,
  generateMultipleCTAs,
  generateBenefitCTA,
  formatAffiliateLink,
  generateMonetizedFooter,
  enhancePromptWithProduct
};
