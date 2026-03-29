-- Test duplicate protection - this should FAIL due to unique index
INSERT INTO products (
  id, 
  "userId", 
  name, 
  description, 
  price, 
  "affiliateLink", 
  category, 
  tags, 
  "isActive", 
  featured, 
  "updatedAt"
) VALUES (
  gen_random_uuid()::text,
  '6dbcf8e6-da7a-4c83-aef1-c4183adfc176',
  'Duplicate Test Product',
  'This insertion should fail due to unique constraint',
  99.00,
  'https://jvz5.com/c/3378503/426415/',
  'Marketing',
  ARRAY['test'],
  true,
  false,
  CURRENT_TIMESTAMP
);
