-- Set sensible defaults for optional fields
ALTER TABLE users ALTER COLUMN phone SET DEFAULT '';
ALTER TABLE users ALTER COLUMN "paymentMethod" SET DEFAULT 'none';
ALTER TABLE users ALTER COLUMN country SET DEFAULT '';
ALTER TABLE users ALTER COLUMN "paymentAccount" SET DEFAULT '';

-- Verify defaults are set
SELECT column_name, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('phone', 'paymentMethod', 'country', 'paymentAccount')
ORDER BY column_name;
