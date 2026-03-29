-- Remove NOT NULL constraints from optional fields
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE users ALTER COLUMN paymentMethod DROP NOT NULL;
ALTER TABLE users ALTER COLUMN country DROP NOT NULL;
ALTER TABLE users ALTER COLUMN paymentAccount DROP NOT NULL;

-- Set sensible defaults
ALTER TABLE users ALTER COLUMN phone SET DEFAULT '';
ALTER TABLE users ALTER COLUMN paymentMethod SET DEFAULT 'none';
ALTER TABLE users ALTER COLUMN country SET DEFAULT '';
ALTER TABLE users ALTER COLUMN paymentAccount SET DEFAULT '';

-- Verify changes
SELECT column_name, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('phone', 'paymentMethod', 'country', 'paymentAccount')
ORDER BY column_name;
