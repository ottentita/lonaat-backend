import { Router } from 'express';

const router = Router();

// Token pricing configuration
const TOKEN_PRICING = {
  minTokens: 1,
  maxTokens: 10000,
  packages: [
    { tokens: 10, price: 5, popular: false },
    { tokens: 50, price: 20, popular: true },
    { tokens: 100, price: 35, popular: false },
    { tokens: 500, price: 150, popular: false }
  ],
  costs: {
    aiGeneration: 1,
    productImport: 0,
    contentScheduling: 1,
    bulkGeneration: 5
  }
};

// GET /api/tokens/pricing
router.get('/pricing', (req, res) => {
  res.json({
    success: true,
    pricing: TOKEN_PRICING
  });
});

export default router;
