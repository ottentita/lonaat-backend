/*
  Warnings:

  - You are about to drop the column `approvedAt` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `approvedBy` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `campaignId` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `externalRef` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `webhookData` on the `commissions` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `commissions` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_commissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "click_id" INTEGER,
    "network" TEXT,
    "product_id" INTEGER,
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "external_ref" TEXT,
    "webhook_data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" DATETIME,
    "campaign_id" INTEGER,
    "rejection_reason" TEXT,
    "approved_at" DATETIME,
    "approved_by" INTEGER,
    CONSTRAINT "commissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "commissions_click_id_fkey" FOREIGN KEY ("click_id") REFERENCES "clicks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_commissions" ("amount", "id", "network", "status") SELECT "amount", "id", "network", "status" FROM "commissions";
DROP TABLE "commissions";
ALTER TABLE "new_commissions" RENAME TO "commissions";
CREATE UNIQUE INDEX "commissions_click_id_key" ON "commissions"("click_id");
CREATE TABLE "new_clicks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "offerId" INTEGER NOT NULL,
    "clickId" TEXT NOT NULL,
    "clickToken" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "user_id" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clicks_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_clicks" ("clickId", "clickToken", "createdAt", "id", "ip", "offerId", "userAgent") SELECT "clickId", "clickToken", "createdAt", "id", "ip", "offerId", "userAgent" FROM "clicks";
DROP TABLE "clicks";
ALTER TABLE "new_clicks" RENAME TO "clicks";
CREATE UNIQUE INDEX "clicks_clickId_key" ON "clicks"("clickId");
CREATE UNIQUE INDEX "clicks_clickToken_key" ON "clicks"("clickToken");
CREATE INDEX "clicks_offerId_idx" ON "clicks"("offerId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
