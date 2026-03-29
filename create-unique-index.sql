-- Force database-level protection: Create unique index on affiliateLink
-- This makes duplication IMPOSSIBLE at the database level

CREATE UNIQUE INDEX IF NOT EXISTS unique_affiliate_link 
ON products("affiliateLink");

-- Verify index creation
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'products' 
  AND indexname = 'unique_affiliate_link';
