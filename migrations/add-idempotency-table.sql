-- Create dedicated IdempotencyKey table for DB-level enforcement
-- This provides hard guarantee against duplicate execution even under retries/races

CREATE TABLE "IdempotencyKey" (
    "key" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Composite unique constraint for hard guarantee
    UNIQUE("userId", "endpoint", "key")
);

-- Index for performance
CREATE INDEX "idx_IdempotencyKey_userId_endpoint" ON "IdempotencyKey"("userId", "endpoint");
CREATE INDEX "idx_IdempotencyKey_createdAt" ON "IdempotencyKey"("createdAt");

-- Add ledger invariants to Transaction table
ALTER TABLE "Transaction" 
ADD CONSTRAINT "chk_amount_positive" CHECK ("amount" > 0),
ADD CONSTRAINT "chk_type_valid" CHECK ("type" IN ('credit', 'debit'));

-- Add wallet freeze capability to Wallet table
ALTER TABLE "wallet" 
ADD COLUMN "isFrozen" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN "freezeReason" TEXT,
ADD COLUMN "frozenAt" TIMESTAMP(3),
ADD COLUMN "frozenBy" INTEGER;

-- Add global freeze capability (system-wide maintenance)
CREATE TABLE "SystemSettings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system settings
INSERT INTO "SystemSettings" ("key", "value") VALUES 
('withdrawals_frozen', 'false'),
('maintenance_mode', 'false'),
('system_version', '"1.0.0"');

-- Add monitoring counters table
CREATE TABLE "MonitoringMetrics" (
    "id" SERIAL PRIMARY KEY,
    "metric" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 1,
    "userId" INTEGER,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_MonitoringMetrics_metric_createdAt" ON "MonitoringMetrics"("metric", "createdAt");
CREATE INDEX "idx_MonitoringMetrics_userId" ON "MonitoringMetrics"("userId");

-- Add audit log for admin actions
CREATE TABLE "AdminAuditLog" (
    "id" SERIAL PRIMARY KEY,
    "adminId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "targetUserId" INTEGER,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_AdminAuditLog_adminId_createdAt" ON "AdminAuditLog"("adminId", "createdAt");
CREATE INDEX "idx_AdminAuditLog_action" ON "AdminAuditLog"("action");
