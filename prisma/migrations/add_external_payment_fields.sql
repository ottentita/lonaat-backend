-- ADDITIVE MIGRATION - External Payment Integration
-- Add external payment provider fields to withdrawals

-- Add external payment fields
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS "externalStatus" TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS "externalReference" TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS provider TEXT;

-- Create index on externalReference for webhook lookups
CREATE INDEX IF NOT EXISTS "withdrawals_externalReference_idx" ON withdrawals("externalReference");

-- Create index on provider for filtering
CREATE INDEX IF NOT EXISTS "withdrawals_provider_idx" ON withdrawals(provider);

-- Create index on externalStatus for reconciliation queries
CREATE INDEX IF NOT EXISTS "withdrawals_externalStatus_idx" ON withdrawals("externalStatus");

-- Add constraint to ensure valid providers
ALTER TABLE withdrawals ADD CONSTRAINT IF NOT EXISTS "withdrawals_provider_check" 
  CHECK (provider IS NULL OR provider IN ('MTN', 'ORANGE', 'PAYONEER', 'BANK'));

-- Add constraint to ensure valid external status
ALTER TABLE withdrawals ADD CONSTRAINT IF NOT EXISTS "withdrawals_externalStatus_check" 
  CHECK ("externalStatus" IS NULL OR "externalStatus" IN ('pending', 'success', 'failed'));
