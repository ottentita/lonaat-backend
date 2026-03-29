-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PRODUCT TABLE BACKUP
-- Date: 2026-03-23
-- Purpose: Backup before monetization system stabilization
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Create backup table
CREATE TABLE IF NOT EXISTS products_backup_20260323 AS 
SELECT * FROM "Product";

-- Verify backup
SELECT COUNT(*) as total_products_backed_up FROM products_backup_20260323;

-- Show sample of backed up data
SELECT id, title, "affiliateLink", "isActive", "createdAt" 
FROM products_backup_20260323 
LIMIT 5;
