-- ADDITIVE MIGRATION - NO DATA LOSS
-- Add idempotency and expiry features to withdrawals

-- Add new columns to existing withdrawals table
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- Create unique index on idempotencyKey
CREATE UNIQUE INDEX IF NOT EXISTS "withdrawals_idempotencyKey_key" ON withdrawals("idempotencyKey");

-- Create index on expiresAt for efficient expiry queries
CREATE INDEX IF NOT EXISTS "withdrawals_expiresAt_idx" ON withdrawals("expiresAt");

-- Create withdrawal status history table
CREATE TABLE IF NOT EXISTS withdrawal_status_history (
  id SERIAL PRIMARY KEY,
  "withdrawalId" INTEGER NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "changedBy" INTEGER,
  reason TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "withdrawal_status_history_withdrawalId_fkey" 
    FOREIGN KEY ("withdrawalId") 
    REFERENCES withdrawals(id) 
    ON DELETE CASCADE
);

-- Create indexes for status history
CREATE INDEX IF NOT EXISTS "withdrawal_status_history_withdrawalId_idx" ON withdrawal_status_history("withdrawalId");
CREATE INDEX IF NOT EXISTS "withdrawal_status_history_createdAt_idx" ON withdrawal_status_history("createdAt");

-- Log initial status for existing withdrawals
INSERT INTO withdrawal_status_history ("withdrawalId", "fromStatus", "toStatus", "createdAt")
SELECT id, NULL, status, created_at
FROM withdrawals
WHERE NOT EXISTS (
  SELECT 1 FROM withdrawal_status_history WHERE "withdrawalId" = withdrawals.id
);
