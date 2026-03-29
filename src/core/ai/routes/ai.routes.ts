/**
 * AI ROUTES (PREMIUM USERS)
 * Safe AI features for premium users
 */

import { Router } from 'express';
import { requirePremiumAI } from '../middleware/ai-access.guard';
import { askOllama } from '../agents/ollama.service';

const router = Router();

/**
 * Validate input
 * Max length: 2000 chars
 * Reject: empty or extremely long input
 */
function validateInput(input: any): { valid: boolean; error?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Input is required' };
  }
  
  if (input.trim().length === 0) {
    return { valid: false, error: 'Input cannot be empty' };
  }
  
  if (input.length > 2000) {
    return { valid: false, error: 'Input too long (max 2000 characters)' };
  }
  
  return { valid: true };
}

/**
 * Sanitize AI response - return only result text
 */
function sanitizeResponse(text: string): { result: string } {
  return { result: text || '' };
}

/**
 * POST /api/ai/recommend-products
 * Get AI product recommendations
 */
router.post('/recommend-products', requirePremiumAI, async (req, res) => {
  try {
    const { category, preferences } = req.body;
    
    // Validate category input
    const categoryValidation = validateInput(category);
    if (!categoryValidation.valid) {
      res.status(400).json({ error: categoryValidation.error });
      return;
    }
    
    const prompt = `Recommend products for category: ${category}. User preferences: ${preferences || 'none'}. List 3 product suggestions in one sentence each.`;
    
    const response = await askOllama(prompt);
    
    if (response.error) {
      res.json(sanitizeResponse('AI recommendations temporarily unavailable'));
      return;
    }
    
    res.json(sanitizeResponse(response.text));
  } catch (error: any) {
    res.json(sanitizeResponse('AI recommendations temporarily unavailable'));
  }
});

/**
 * POST /api/ai/generate-content
 * Generate content using AI
 */
router.post('/generate-content', requirePremiumAI, async (req, res) => {
  try {
    const { topic, style } = req.body;
    
    // Validate topic input
    const topicValidation = validateInput(topic);
    if (!topicValidation.valid) {
      res.status(400).json({ error: topicValidation.error });
      return;
    }
    
    const prompt = `Generate content about: ${topic}. Style: ${style || 'professional'}. Write 2-3 sentences.`;
    
    const response = await askOllama(prompt);
    
    if (response.error) {
      res.json(sanitizeResponse('AI content generation temporarily unavailable'));
      return;
    }
    
    res.json(sanitizeResponse(response.text));
  } catch (error: any) {
    res.json(sanitizeResponse('AI content generation temporarily unavailable'));
  }
});

/**
 * POST /api/ai/ad-copy
 * Generate ad copy using AI
 */
router.post('/ad-copy', requirePremiumAI, async (req, res) => {
  try {
    const { product, targetAudience } = req.body;
    
    // Validate product input
    const productValidation = validateInput(product);
    if (!productValidation.valid) {
      res.status(400).json({ error: productValidation.error });
      return;
    }
    
    const prompt = `Create ad copy for product: ${product}. Target audience: ${targetAudience || 'general'}. Write a compelling 2-sentence ad.`;
    
    const response = await askOllama(prompt);
    
    if (response.error) {
      res.json(sanitizeResponse('AI ad copy generation temporarily unavailable'));
      return;
    }
    
    res.json(sanitizeResponse(response.text));
  } catch (error: any) {
    res.json(sanitizeResponse('AI ad copy generation temporarily unavailable'));
  }
});

export default router;
