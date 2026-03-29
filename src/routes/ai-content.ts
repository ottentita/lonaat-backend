import { Router, Response } from "express";
import { AuthRequest, authMiddleware } from "../middleware/auth";

const router = Router();

// AI Content Generation Endpoint
router.post("/generate-content", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { product, platform } = req.body;

    if (!product || !platform) {
      return res.status(400).json({ error: "Product and platform are required" });
    }

    console.log(`🤖 Generating ${platform} content for: ${product.title}`);

    // Generate platform-specific content
    const content = generateContentForPlatform(product, platform);

    res.json({
      success: true,
      platform,
      content,
      product: {
        title: product.title,
        price: product.price,
        commission: product.commission
      }
    });
  } catch (error: any) {
    console.error("AI content generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate content" });
  }
});

function generateContentForPlatform(product: any, platform: string) {
  const { title, description, price, commission } = product;
  const commissionAmount = price && commission ? (price * commission / 100).toFixed(2) : "0";

  switch (platform.toLowerCase()) {
    case 'tiktok':
      return {
        script: `🔥 STOP SCROLLING! 🔥

I just found ${title} and it's a GAME CHANGER! 💯

Here's why you NEED this:
${description || 'Amazing product that delivers real results'}

💰 Price: Only $${price}!
✨ My commission: $${commissionAmount} (so you know I'm being real with you)

Link in bio! 👆 Don't miss out!

#affiliate #productreview #musthave #trending`,
        
        hook: `"Wait... ${title} actually works?! 😱"`,
        
        cta: "Link in bio - grab yours before they sell out! 🔥",
        
        hashtags: "#affiliate #productreview #musthave #trending #viral #fyp"
      };

    case 'instagram':
      return {
        caption: `✨ ${title} ✨

${description || 'This product has completely changed the game!'}

💵 Investment: $${price}
💰 Earn with me: $${commissionAmount} commission

Swipe up or click link in bio! 👆

#ad #affiliate #productreview #lifestyle #shopping`,
        
        story: `🎯 New Find Alert!
        
${title}

Price: $${price}
My commission: $${commissionAmount}

Swipe up to check it out! 👆`,
        
        hashtags: "#ad #affiliate #productreview #lifestyle #shopping #instagood"
      };

    case 'youtube':
      return {
        title: `${title} Review - Is It Worth $${price}? (Honest Review)`,
        
        description: `In this video, I'm reviewing ${title}!

${description || 'Full honest review of this product'}

💰 Price: $${price}
📊 My Commission: $${commissionAmount}

🔗 Get it here (affiliate link): [YOUR LINK]

⏰ Timestamps:
0:00 - Intro
0:30 - Unboxing
2:00 - Features
4:00 - My Honest Opinion
6:00 - Final Verdict

#affiliate #review #honest`,
        
        hook: "Is ${title} actually worth the hype? Let's find out...",
        
        cta: "Link in description! Don't forget to like and subscribe for more honest reviews!"
      };

    case 'twitter':
      return {
        tweet: `🚀 Just discovered ${title}!

${description?.substring(0, 100) || 'Amazing product'}...

💰 $${price}
📈 Commission: $${commissionAmount}

Check it out: [link]

#affiliate #productreview`,
        
        thread: [
          `🧵 Thread: Why ${title} is worth your attention`,
          `1/ First impressions: ${description?.substring(0, 200) || 'This product delivers'}`,
          `2/ Price point: $${price} - Here's why it's worth it...`,
          `3/ Full transparency: I earn $${commissionAmount} commission, but here's my honest take...`,
          `4/ Final verdict: [Your honest opinion here]`
        ]
      };

    case 'facebook':
      return {
        post: `🎯 ${title} - My Honest Review

${description || 'I recently tried this product and here are my thoughts...'}

💵 Price: $${price}
💰 Affiliate Disclosure: I earn $${commissionAmount} commission

👉 Get it here: [YOUR LINK]

What do you think? Drop a comment! 👇

#affiliate #productreview #honest`,
        
        ad: `Discover ${title}!

${description || 'Transform your experience with this amazing product'}

✅ Only $${price}
✅ Proven results
✅ Limited time offer

Click to learn more! 👆`
      };

    default:
      return {
        generic: `Check out ${title}!

${description || 'Amazing product'}

Price: $${price}
Commission: $${commissionAmount}

Get it now!`
      };
  }
}

export default router;
