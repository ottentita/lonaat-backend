-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "balance" DECIMAL NOT NULL DEFAULT 0,
    "withdrawable_balance" DECIMAL NOT NULL DEFAULT 0,
    "pending_earnings" DECIMAL NOT NULL DEFAULT 0,
    "country" TEXT,
    "phone" TEXT,
    "paymentMethod" TEXT,
    "paymentAccount" TEXT,
    "preferredLanguage" TEXT DEFAULT 'en',
    "profilePicture" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "tokens" INTEGER NOT NULL DEFAULT 10
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "token_purchases" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "chargeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "token_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "content_drafts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "offerId" INTEGER NOT NULL,
    "hooks" TEXT,
    "script" TEXT,
    "caption" TEXT,
    "hashtags" TEXT,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "offers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "network" TEXT,
    "externalOfferId" TEXT,
    "networkName" TEXT,
    "trackingUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sellerId" INTEGER,
    "payout" DECIMAL,
    "categoryId" INTEGER,
    "images" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "affiliateNetworkId" INTEGER,
    CONSTRAINT "offers_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "offers_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "offers_affiliateNetworkId_fkey" FOREIGN KEY ("affiliateNetworkId") REFERENCES "affiliate_networks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "products" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL,
    "image_url" TEXT,
    "affiliate_link" TEXT,
    "network" TEXT,
    "category" TEXT,
    "ai_generated_ad" TEXT,
    "extra_data" TEXT,
    "user_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "credit_wallets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "total_purchased" INTEGER NOT NULL DEFAULT 0,
    "total_spent" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "credit_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "credit_packages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "bonus_credits" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "clicks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "network" TEXT,
    "offerId" INTEGER NOT NULL,
    "adId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "timeBucket" INTEGER NOT NULL,
    "clickId" TEXT NOT NULL,
    "clickToken" TEXT NOT NULL,
    "ip" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "externalSubId" TEXT,
    "revenue" REAL NOT NULL DEFAULT 0,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "user_id" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clicks_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "offerId" INTEGER NOT NULL,
    "clickId" TEXT,
    "clickToken" TEXT,
    "revenue" INTEGER,
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversions_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "conversions_clickToken_fkey" FOREIGN KEY ("clickToken") REFERENCES "clicks" ("clickToken") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'skrill',
    "transactionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "commissions" (
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
    CONSTRAINT "commissions_click_id_fkey" FOREIGN KEY ("click_id") REFERENCES "clicks" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "commissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "real_estate_properties" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "property_type" TEXT,
    "transaction_type" TEXT,
    "price" DECIMAL,
    "currency" TEXT DEFAULT 'USD',
    "location" TEXT,
    "region" TEXT,
    "city" TEXT,
    "address" TEXT,
    "bedrooms" INTEGER DEFAULT 0,
    "bathrooms" INTEGER DEFAULT 0,
    "area_sqft" INTEGER,
    "images" TEXT,
    "image_url" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "views" INTEGER DEFAULT 0,
    "inquiries" INTEGER DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "user_id" INTEGER,
    CONSTRAINT "real_estate_properties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lands" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title_number" TEXT NOT NULL,
    "land_name" TEXT,
    "current_owner" TEXT NOT NULL,
    "owner_id" INTEGER,
    "owner_id_type" TEXT,
    "owner_id_number" TEXT,
    "region" TEXT,
    "city" TEXT,
    "town" TEXT,
    "neighborhood" TEXT,
    "area_sqm" DECIMAL,
    "polygon_coords" TEXT,
    "polygon_wkt" TEXT,
    "center_lat" DECIMAL,
    "center_lng" DECIMAL,
    "land_use" TEXT,
    "status" TEXT DEFAULT 'active',
    "verification_status" TEXT DEFAULT 'submitted',
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "land_hash" TEXT,
    "purchase_date" DATETIME,
    "purchase_price" DECIMAL,
    "currency" TEXT,
    "seller_name" TEXT,
    "documents" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "land_ownerships" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "land_id" INTEGER NOT NULL,
    "owner_name" TEXT NOT NULL,
    "owner_id_type" TEXT,
    "owner_id_number" TEXT,
    "user_id" INTEGER,
    "ownership_type" TEXT DEFAULT 'full',
    "status" TEXT DEFAULT 'active',
    "acquired_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acquired_price" DECIMAL,
    "currency" TEXT,
    "seller_name" TEXT,
    "seller_id" TEXT,
    "documents" TEXT,
    "verification" TEXT DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "land_ownerships_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "land_audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "land_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" INTEGER,
    "actor_name" TEXT,
    "actor_role" TEXT,
    "old_data" TEXT,
    "new_data" TEXT,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "land_audit_logs_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "monthlyTokens" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdTokenWallet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdTokenWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TokenTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER,
    "offerId" INTEGER,
    "dailyBudget" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransactionLedger" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "campaignId" INTEGER,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransactionLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransactionLedger_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "platform_revenues" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversionId" INTEGER,
    "offerId" INTEGER,
    "userId" INTEGER,
    "amount" DECIMAL,
    "platformShare" DECIMAL,
    "userShare" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "affiliate_networks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "baseApiUrl" TEXT NOT NULL,
    "webhookSecret" TEXT,
    "documentationUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_network_credentials" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "networkId" INTEGER NOT NULL,
    "apiKeyEncrypted" TEXT,
    "apiKeyIv" TEXT,
    "apiKeyTag" TEXT,
    "apiSecretEncrypted" TEXT,
    "apiSecretIv" TEXT,
    "apiSecretTag" TEXT,
    "extraConfig" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_network_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_network_credentials_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "affiliate_networks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "marketplace_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "offerId" INTEGER,
    "manualProductId" INTEGER,
    "customTitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketplace_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "marketplace_items_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "ai_usage_userId_idx" ON "ai_usage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "token_purchases_chargeId_key" ON "token_purchases"("chargeId");

-- CreateIndex
CREATE INDEX "token_purchases_userId_idx" ON "token_purchases"("userId");

-- CreateIndex
CREATE INDEX "content_drafts_userId_idx" ON "content_drafts"("userId");

-- CreateIndex
CREATE INDEX "content_drafts_offerId_idx" ON "content_drafts"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "offers_slug_key" ON "offers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "offers_externalOfferId_key" ON "offers"("externalOfferId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "credit_wallets_user_id_key" ON "credit_wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "clicks_clickId_key" ON "clicks"("clickId");

-- CreateIndex
CREATE UNIQUE INDEX "clicks_clickToken_key" ON "clicks"("clickToken");

-- CreateIndex
CREATE INDEX "clicks_offerId_idx" ON "clicks"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "clicks_userId_adId_timeBucket_key" ON "clicks"("userId", "adId", "timeBucket");

-- CreateIndex
CREATE INDEX "conversions_offerId_idx" ON "conversions"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "conversions_clickToken_key" ON "conversions"("clickToken");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transactionId_key" ON "payments"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_providerRef_key" ON "PaymentEvent"("providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "commissions_click_id_key" ON "commissions"("click_id");

-- CreateIndex
CREATE UNIQUE INDEX "lands_title_number_key" ON "lands"("title_number");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AdTokenWallet_userId_key" ON "AdTokenWallet"("userId");

-- CreateIndex
CREATE INDEX "TokenTransaction_userId_idx" ON "TokenTransaction"("userId");

-- CreateIndex
CREATE INDEX "AdCampaign_userId_idx" ON "AdCampaign"("userId");

-- CreateIndex
CREATE INDEX "TransactionLedger_userId_idx" ON "TransactionLedger"("userId");

-- CreateIndex
CREATE INDEX "TransactionLedger_campaignId_idx" ON "TransactionLedger"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "user_network_credentials_userId_networkId_key" ON "user_network_credentials"("userId", "networkId");
