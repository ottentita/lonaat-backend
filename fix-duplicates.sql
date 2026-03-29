-- STEP 1: Find duplicate product_conversions
SELECT reference, COUNT(*) as duplicate_count
FROM product_conversions
GROUP BY reference
HAVING COUNT(*) > 1;

-- STEP 2: Delete duplicates (keep MIN id only)
DELETE FROM product_conversions
WHERE id NOT IN (
  SELECT MIN(id)
  FROM product_conversions
  GROUP BY reference
);

-- STEP 3: Verify no duplicates remain
SELECT reference, COUNT(*) as count
FROM product_conversions
GROUP BY reference
HAVING COUNT(*) > 1;
-- Should return 0 rows
