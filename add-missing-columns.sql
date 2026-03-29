-- Add missing columns to products table
-- This fixes the "column p.clicks does not exist" error

-- Add clicks column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'clicks'
    ) THEN
        ALTER TABLE products ADD COLUMN clicks INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add views column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'views'
    ) THEN
        ALTER TABLE products ADD COLUMN views INTEGER DEFAULT 0;
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN ('clicks', 'views');
