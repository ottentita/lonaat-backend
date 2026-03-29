-- Direct test query to verify products exist and can be queried
SELECT id, name, "affiliateLink", category, price 
FROM products 
WHERE "isActive" = true 
LIMIT 5;
