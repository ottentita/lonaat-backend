-- Manual Migration: Add Normalized Financial Models
-- Date: 2026-03-28
-- Purpose: Add Wallet, Transaction, and Commission tables WITHOUT dropping existing tables

-- ==================== CREATE WALLET TABLE ====================

CREATE TABLE IF NOT EXISTS "Wallet" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL UNIQUE,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Wallet_userId_idx" ON "Wallet"("userId");

-- ==================== CREATE TRANSACTION TABLE ====================

CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "referenceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Transaction_userId_idx" ON "Transaction"("userId");
CREATE INDEX IF NOT EXISTS "Transaction_type_idx" ON "Transaction"("type");
CREATE INDEX IF NOT EXISTS "Transaction_source_idx" ON "Transaction"("source");
CREATE INDEX IF NOT EXISTS "Transaction_referenceId_idx" ON "Transaction"("referenceId");

-- ==================== CREATE COMMISSION TABLE ====================

CREATE TABLE IF NOT EXISTS "Commission" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Commission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Commission_userId_idx" ON "Commission"("userId");
CREATE INDEX IF NOT EXISTS "Commission_productId_idx" ON "Commission"("productId");
CREATE INDEX IF NOT EXISTS "Commission_status_idx" ON "Commission"("status");

-- ==================== MIGRATION COMPLETE ====================
-- New tables created: Wallet, Transaction, Commission
-- Existing tables: UNTOUCHED
