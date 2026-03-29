-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "withdrawable_balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "pending_earnings" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "country" TEXT,
    "phone" TEXT,
    "paymentMethod" TEXT,
    "paymentAccount" TEXT,
    "preferredLanguage" TEXT DEFAULT 'en',
    "profilePicture" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" SERIAL NOT NULL,
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
    "payout" DECIMAL(65,30),
    "categoryId" INTEGER,
    "images" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "affiliateNetworkId" INTEGER,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30),
    "image_url" TEXT,
    "affiliate_link" TEXT,
    "network" TEXT,
    "category" TEXT,
    "ai_generated_ad" TEXT,
    "extra_data" TEXT,
    "user_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_wallets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "total_purchased" INTEGER NOT NULL DEFAULT 0,
    "total_spent" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_packages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "bonus_credits" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clicks" (
    "id" SERIAL NOT NULL,
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
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "user_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversions" (
    "id" SERIAL NOT NULL,
    "offerId" INTEGER NOT NULL,
    "clickId" TEXT,
    "clickToken" TEXT,
    "revenue" INTEGER,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'skrill',
    "transactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "click_id" INTEGER,
    "network" TEXT,
    "product_id" INTEGER,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "external_ref" TEXT,
    "webhook_data" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "campaign_id" INTEGER,
    "rejection_reason" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" INTEGER,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "real_estate_properties" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "property_type" TEXT,
    "transaction_type" TEXT,
    "price" DECIMAL(65,30),
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" INTEGER,

    CONSTRAINT "real_estate_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lands" (
    "id" SERIAL NOT NULL,
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
    "area_sqm" DECIMAL(65,30),
    "polygon_coords" TEXT,
    "polygon_wkt" TEXT,
    "center_lat" DECIMAL(65,30),
    "center_lng" DECIMAL(65,30),
    "land_use" TEXT,
    "status" TEXT DEFAULT 'active',
    "verification_status" TEXT DEFAULT 'submitted',
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "land_hash" TEXT,
    "purchase_date" TIMESTAMP(3),
    "purchase_price" DECIMAL(65,30),
    "currency" TEXT,
    "seller_name" TEXT,
    "documents" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_ownerships" (
    "id" SERIAL NOT NULL,
    "land_id" INTEGER NOT NULL,
    "owner_name" TEXT NOT NULL,
    "owner_id_type" TEXT,
    "owner_id_number" TEXT,
    "user_id" INTEGER,
    "ownership_type" TEXT DEFAULT 'full',
    "status" TEXT DEFAULT 'active',
    "acquired_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acquired_price" DECIMAL(65,30),
    "currency" TEXT,
    "seller_name" TEXT,
    "seller_id" TEXT,
    "documents" TEXT,
    "verification" TEXT DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "land_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_audit_logs" (
    "id" SERIAL NOT NULL,
    "land_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" INTEGER,
    "actor_name" TEXT,
    "actor_role" TEXT,
    "old_data" TEXT,
    "new_data" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "land_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "monthlyTokens" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdTokenWallet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdTokenWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenTransaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER,
    "offerId" INTEGER,
    "dailyBudget" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionLedger" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "campaignId" INTEGER,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_revenues" (
    "id" SERIAL NOT NULL,
    "conversionId" INTEGER,
    "offerId" INTEGER,
    "userId" INTEGER,
    "amount" DECIMAL(65,30),
    "platformShare" DECIMAL(65,30),
    "userShare" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_revenues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_networks" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "baseApiUrl" TEXT NOT NULL,
    "webhookSecret" TEXT,
    "documentationUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_networks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_network_credentials" (
    "id" SERIAL NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_network_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_items" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "offerId" INTEGER,
    "manualProductId" INTEGER,
    "customTitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

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

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_affiliateNetworkId_fkey" FOREIGN KEY ("affiliateNetworkId") REFERENCES "affiliate_networks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_wallets" ADD CONSTRAINT "credit_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_clickToken_fkey" FOREIGN KEY ("clickToken") REFERENCES "clicks"("clickToken") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_click_id_fkey" FOREIGN KEY ("click_id") REFERENCES "clicks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "real_estate_properties" ADD CONSTRAINT "real_estate_properties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_ownerships" ADD CONSTRAINT "land_ownerships_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_audit_logs" ADD CONSTRAINT "land_audit_logs_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdTokenWallet" ADD CONSTRAINT "AdTokenWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenTransaction" ADD CONSTRAINT "TokenTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLedger" ADD CONSTRAINT "TransactionLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLedger" ADD CONSTRAINT "TransactionLedger_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_network_credentials" ADD CONSTRAINT "user_network_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_network_credentials" ADD CONSTRAINT "user_network_credentials_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "affiliate_networks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_items" ADD CONSTRAINT "marketplace_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_items" ADD CONSTRAINT "marketplace_items_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
