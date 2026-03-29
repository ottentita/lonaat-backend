-- Insert real test products with correct snake_case column names
INSERT INTO products (id, name, description, price, affiliate_link, category, image_url, is_active, created_at)
VALUES 
  (
    1,
    'Smart Wireless Earbuds Pro',
    'Premium wireless earbuds with active noise cancellation, 30-hour battery life, and crystal-clear sound quality.',
    79.99,
    'https://example.com/affiliate/earbuds-pro',
    'Electronics',
    'https://placehold.co/400x300/0066cc/white?text=Earbuds+Pro',
    true,
    NOW()
  ),
  (
    2,
    'Ultimate Marketing Course 2024',
    'Complete digital marketing masterclass with 200+ video lessons, templates, and tools.',
    197.00,
    'https://example.com/affiliate/marketing-course',
    'Education',
    'https://placehold.co/400x300/ff6600/white?text=Marketing+Course',
    true,
    NOW()
  ),
  (
    3,
    'AI Content Generator Suite',
    'Revolutionary AI-powered content creation tool. Generate blog posts, social media content, and more.',
    47.00,
    'https://example.com/affiliate/ai-content-gen',
    'Software',
    'https://placehold.co/400x300/9933ff/white?text=AI+Content+Gen',
    true,
    NOW()
  ),
  (
    4,
    'Facebook Ads Mastery Blueprint',
    'Step-by-step guide to creating profitable Facebook ad campaigns with case studies and templates.',
    97.00,
    'https://example.com/affiliate/fb-ads-mastery',
    'Marketing',
    'https://placehold.co/400x300/3b5998/white?text=FB+Ads+Mastery',
    true,
    NOW()
  ),
  (
    5,
    'E-commerce Empire Builder',
    'Complete system for building a profitable online store with supplier connections and automation.',
    127.00,
    'https://example.com/affiliate/ecommerce-empire',
    'Business',
    'https://placehold.co/400x300/00cc66/white?text=Ecommerce+Empire',
    true,
    NOW()
  ),
  (
    6,
    'SEO Domination Toolkit',
    'Professional SEO tools and training to rank #1 on Google with keyword research and backlink analysis.',
    67.00,
    'https://example.com/affiliate/seo-toolkit',
    'Software',
    'https://placehold.co/400x300/ff3366/white?text=SEO+Toolkit',
    true,
    NOW()
  ),
  (
    7,
    'YouTube Money Machine',
    'Learn how to build a profitable YouTube channel from scratch with monetization strategies.',
    87.00,
    'https://example.com/affiliate/youtube-money',
    'Education',
    'https://placehold.co/400x300/ff0000/white?text=YouTube+Money',
    true,
    NOW()
  ),
  (
    8,
    'Crypto Trading Masterclass',
    'Master cryptocurrency trading with proven strategies, technical analysis, and risk management.',
    157.00,
    'https://example.com/affiliate/crypto-trading',
    'Finance',
    'https://placehold.co/400x300/f7931a/white?text=Crypto+Trading',
    true,
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  affiliate_link = EXCLUDED.affiliate_link,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  is_active = EXCLUDED.is_active;
