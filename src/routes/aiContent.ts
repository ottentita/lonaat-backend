import express from 'express';
import { maybeAuth } from '../middleware/maybeAuth';

const router = express.Router();

console.log('🤖 AI Content routes loaded!');

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'AI Content routes working!' });
});

// AI Content Generation Endpoint
router.post('/generate-content', maybeAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { productTitle, productDescription, price, platform } = req.body;

    console.log('🤖 AI Content Generation Request:', {
      productTitle,
      productDescription,
      price,
      platform
    });

    // Validate input
    if (!productTitle || !productDescription || !price || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: productTitle, productDescription, price, platform'
      });
    }

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate platform-specific content
    let content;
    
    switch (platform.toLowerCase()) {
      case 'tiktok':
        content = generateTikTokContent(productTitle, productDescription, price);
        break;
      case 'youtube':
        content = generateYouTubeContent(productTitle, productDescription, price);
        break;
      case 'instagram':
        content = generateInstagramContent(productTitle, productDescription, price);
        break;
      default:
        content = generateTikTokContent(productTitle, productDescription, price);
    }

    console.log('✅ AI Content Generated Successfully');

    res.json({
      success: true,
      ...content
    });

  } catch (error) {
    console.error('❌ AI Content Generation Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI content'
    });
  }
});

// TikTok Content Generator
function generateTikTokContent(title: string, description: string, price: number) {
  const hooks = [
    `Stop scrolling! You NEED to see this ${title}!`,
    `This ${title} changed my life... 🤯`,
    `POV: You just found the perfect ${title}`,
    `I spent $${price} on this ${title} and...`
  ];

  const scripts = [
    `Let me tell you why this ${title} is absolutely worth every penny of $${price}. First off...`,
    `I've been using this ${title} for 2 weeks now and WOW. Here's my honest review...`,
    `If you're thinking about getting this ${title}, watch this first! Here's what you need to know...`,
    `This ${title} has been trending for a reason. Let me show you why it's going viral...`
  ];

  const captions = [
    `This ${title} is absolutely GAME-CHANGING! 😱 Worth every penny of $${price} #fyp #viral #shopping`,
    `Found my new favorite ${title}! 🎉 You guys NEED to see this! #tiktokmademebuyit #review`,
    `Is this ${title} worth the hype? ABSOLUTELY! ✨ #productreview #musthave`,
    `STOP what you're doing and look at this ${title}! 🔥 #trending #shoppingaddict`
  ];

  const hashtags = [
    '#fyp', '#viral', '#tiktokmademebuyit', '#shopping', '#review', '#musthave', 
    '#productreview', '#trending', '#deals', '#amazonfinds', '#tech', '#gadgets'
  ];

  return {
    hook: hooks[Math.floor(Math.random() * hooks.length)],
    script: scripts[Math.floor(Math.random() * scripts.length)],
    caption: captions[Math.floor(Math.random() * captions.length)],
    hashtags: hashtags.slice(0, 8)
  };
}

// YouTube Content Generator
function generateYouTubeContent(title: string, description: string, price: number) {
  const hooks = [
    `The ${title} That Changed Everything - My Honest Review`,
    `Is This ${title} Worth $${price}? Complete Analysis`,
    `Why Everyone's Buying This ${title} - The Truth`,
    `${title} Review: Is It Finally Worth The Hype?`
  ];

  const scripts = [
    `Hey everyone, welcome back to the channel! Today we're diving deep into the ${title}, a product that's been getting a lot of attention lately. At $${price}, is it really worth your money? Let's find out...`,
    `In this comprehensive review, I'll be testing every feature of the ${title}. From build quality to performance, we'll cover everything you need to know before making your purchase...`,
    `I've been using this ${title} for 30 days straight, and today I'm sharing my complete experience - the good, the bad, and everything in between. Let's get started...`
  ];

  const captions = [
    `Complete ${title} review! Is it worth $${price}? Watch to find out everything you need to know before buying! #productreview #techreview`,
    `Honest ${title} review after 30 days of use! The results might surprise you... #review #unboxing`,
    `This ${title} review covers all features, pros, and cons. Is it worth your money in 2024? #detailedreview`,
    `${title} complete guide and review! Everything you need to know before purchasing! #buyingguide`
  ];

  const hashtags = [
    '#productreview', '#techreview', '#unboxing', '#review', '#technology', '#gadgets',
    '#buyingguide', '#honestreview', '#detailedreview', '#comparison', '#youtube', '#reviewer'
  ];

  return {
    hook: hooks[Math.floor(Math.random() * hooks.length)],
    script: scripts[Math.floor(Math.random() * scripts.length)],
    caption: captions[Math.floor(Math.random() * captions.length)],
    hashtags: hashtags.slice(0, 8)
  };
}

// Instagram Content Generator
function generateInstagramContent(title: string, description: string, price: number) {
  const hooks = [
    `✨ The ${title} that's taking over my feed!`,
    `🚀 This ${title} is absolutely EVERYWHERE right now!`,
    `💯 My honest thoughts on this viral ${title}`,
    `🎯 The ${title} you've been seeing everywhere!`
  ];

  const scripts = [
    `Okay, let's talk about this ${title} that everyone's been asking about! I finally got my hands on it and here's my honest take...`,
    `I've been testing this ${title} for a while now, and I think I'm ready to give you my complete verdict. Is it worth the hype?`,
    `STOP scrolling if you've been thinking about getting this ${title}! I need to show you something important...`
  ];

  const captions = [
    `Finally got my hands on the viral ${title}! 🎉 Here's my honest review - is it worth $${price}? Let me know in the comments! ✨ #productreview #unboxing #newin`,
    `This ${title} has been living rent-free in my head! 🤯 Here's everything you need to know before you buy... #review #shopping #musthave`,
    `My complete ${title} review! 💫 Worth every penny or just hype? Watch to find out! #honestreview #productphotography`,
    `The ${title} that's breaking the internet! 🔥 Here's my take on whether it's actually worth it... #viralproduct #review`
  ];

  const hashtags = [
    '#productreview', '#unboxing', '#newin', '#shopping', '#musthave', '#review', 
    '#honestreview', '#productphotography', '#instareview', '#shoppingaddict', '#viralproduct', '#teampage'
  ];

  return {
    hook: hooks[Math.floor(Math.random() * hooks.length)],
    script: scripts[Math.floor(Math.random() * scripts.length)],
    caption: captions[Math.floor(Math.random() * captions.length)],
    hashtags: hashtags.slice(0, 8)
  };
}

export default router;
