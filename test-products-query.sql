-- Test query to verify products exist and can be selected
SELECT COUNT(*) as total FROM products;
SELECT COUNT(*) as active FROM products WHERE "isActive" = true;
SELECT id, name, category FROM products LIMIT 5;
