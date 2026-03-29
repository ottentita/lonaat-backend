/*
  Warnings:

  - You are about to alter the column `revenue` on the `clicks` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - Made the column `network` on table `clicks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ip` on table `clicks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userAgent` on table `clicks` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "clicks" DROP CONSTRAINT "clicks_user_id_fkey";

-- DropIndex
DROP INDEX "clicks_clickId_key";

-- DropIndex
DROP INDEX "clicks_userId_adId_timeBucket_key";

-- AlterTable
ALTER TABLE "clicks" ALTER COLUMN "network" SET NOT NULL,
ALTER COLUMN "ip" SET NOT NULL,
ALTER COLUMN "userAgent" SET NOT NULL,
ALTER COLUMN "revenue" SET DATA TYPE DECIMAL(65,30);

-- CreateTable
CREATE TABLE "wallet" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWithdrawn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTokensBought" INTEGER NOT NULL DEFAULT 0,
    "totalTokensSpent" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "locked_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_clicks" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "network" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "product_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_conversions" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "network" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_insertion_log" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "product_name" TEXT,
    "affiliate_link" TEXT,
    "network" TEXT,
    "price" DECIMAL,
    "admin_email" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_insertion_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "method" TEXT NOT NULL,
    "account_details" TEXT,
    "reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT,
    "externalStatus" TEXT,
    "externalReference" TEXT,
    "provider" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_status_history" (
    "id" SERIAL NOT NULL,
    "withdrawalId" INTEGER NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedBy" INTEGER,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawal_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_userId_key" ON "wallet"("userId");

-- CreateIndex
CREATE INDEX "product_clicks_network_idx" ON "product_clicks"("network");

-- CreateIndex
CREATE INDEX "product_clicks_productId_idx" ON "product_clicks"("productId");

-- CreateIndex
CREATE INDEX "product_clicks_userId_idx" ON "product_clicks"("userId");

-- CreateIndex
CREATE INDEX "product_conversions_network_idx" ON "product_conversions"("network");

-- CreateIndex
CREATE INDEX "product_conversions_productId_idx" ON "product_conversions"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawals_idempotencyKey_key" ON "withdrawals"("idempotencyKey");

-- CreateIndex
CREATE INDEX "withdrawals_user_id_idx" ON "withdrawals"("user_id");

-- CreateIndex
CREATE INDEX "withdrawals_status_idx" ON "withdrawals"("status");

-- CreateIndex
CREATE INDEX "withdrawals_user_id_status_idx" ON "withdrawals"("user_id", "status");

-- CreateIndex
CREATE INDEX "withdrawals_expiresAt_idx" ON "withdrawals"("expiresAt");

-- CreateIndex
CREATE INDEX "withdrawals_externalReference_idx" ON "withdrawals"("externalReference");

-- CreateIndex
CREATE INDEX "withdrawals_provider_idx" ON "withdrawals"("provider");

-- CreateIndex
CREATE INDEX "withdrawals_externalStatus_idx" ON "withdrawals"("externalStatus");

-- CreateIndex
CREATE INDEX "withdrawal_status_history_withdrawalId_idx" ON "withdrawal_status_history"("withdrawalId");

-- CreateIndex
CREATE INDEX "withdrawal_status_history_createdAt_idx" ON "withdrawal_status_history"("createdAt");

-- CreateIndex
CREATE INDEX "affiliate_events_eventId_idx" ON "affiliate_events"("eventId");

-- CreateIndex
CREATE INDEX "clicks_userId_idx" ON "clicks"("userId");

-- CreateIndex
CREATE INDEX "clicks_externalSubId_idx" ON "clicks"("externalSubId");

-- CreateIndex
CREATE INDEX "clicks_userId_offerId_idx" ON "clicks"("userId", "offerId");

-- AddForeignKey
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_status_history" ADD CONSTRAINT "withdrawal_status_history_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "withdrawals"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
