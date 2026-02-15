-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'user',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "referral_code" VARCHAR(20) NOT NULL,
    "referred_by" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "blocked_until" TIMESTAMP(3),
    "block_reason" VARCHAR(255),
    "ai_premium" BOOLEAN NOT NULL DEFAULT false,
    "ai_premium_expires" TIMESTAMP(3),
    "ai_boosts_today" INTEGER NOT NULL DEFAULT 0,
    "ai_boosts_reset_at" TIMESTAMP(3),
    "fraud_score" INTEGER NOT NULL DEFAULT 0,
    "last_ip" VARCHAR(45),
    "withdrawable_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trial_ends_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "extra_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "network" VARCHAR(50),
    "product_id" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "external_ref" VARCHAR(255),
    "webhook_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "campaign_id" INTEGER,
    "rejection_reason" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" INTEGER,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "payment_method" VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
    "payment_details" TEXT,
    "bank_name" VARCHAR(100),
    "account_number" VARCHAR(50),
    "account_name" VARCHAR(100),
    "bank_code" VARCHAR(20),
    "bank_account_id" INTEGER,
    "processed_at" TIMESTAMP(3),
    "processed_by" INTEGER,
    "paid_at" TIMESTAMP(3),
    "paid_by" INTEGER,
    "admin_note" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_boosts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "product_id" INTEGER,
    "boost_level" INTEGER NOT NULL DEFAULT 1,
    "credits_spent" INTEGER NOT NULL DEFAULT 0,
    "clicks_received" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "imported_product_id" INTEGER,
    "boost_type" VARCHAR(50),
    "is_admin_campaign" BOOLEAN NOT NULL DEFAULT false,
    "campaign_config" JSONB,
    "auto_boost" BOOLEAN NOT NULL DEFAULT true,
    "boost_intensity" INTEGER NOT NULL DEFAULT 1,
    "last_boost_at" TIMESTAMP(3),
    "total_impressions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ad_boosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "price" VARCHAR(100),
    "affiliate_link" TEXT,
    "network" VARCHAR(50),
    "category" VARCHAR(100),
    "image_url" TEXT,
    "extra_data" JSONB,
    "ai_generated_ad" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "real_estate_properties" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "property_type" VARCHAR(50),
    "transaction_type" VARCHAR(20) NOT NULL DEFAULT 'sale',
    "location" VARCHAR(255),
    "region" VARCHAR(100),
    "city" VARCHAR(100),
    "neighborhood" VARCHAR(100),
    "price" DECIMAL(12,2),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'XAF',
    "price_negotiable" BOOLEAN NOT NULL DEFAULT true,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "area_sqft" INTEGER,
    "land_size_sqft" INTEGER,
    "floors" INTEGER,
    "parking_spaces" INTEGER,
    "year_built" INTEGER,
    "furnishing" VARCHAR(50),
    "condition" VARCHAR(50),
    "images" JSONB,
    "videos" JSONB,
    "documents" JSONB,
    "amenities" JSONB,
    "image_url" TEXT,
    "video_url" TEXT,
    "owner_name" VARCHAR(100),
    "owner_phone" VARCHAR(50),
    "owner_email" VARCHAR(100),
    "owner_whatsapp" VARCHAR(50),
    "owner_id_type" VARCHAR(50),
    "owner_id_number" VARCHAR(100),
    "affiliate_link" TEXT,
    "ai_generated_ad" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "listing_fee" DECIMAL(10,2),
    "rejection_reason" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "inquiries_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "real_estate_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_payments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "property_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'XAF',
    "payment_method" VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
    "payment_type" VARCHAR(50) NOT NULL DEFAULT 'listing_fee',
    "receipt_url" TEXT,
    "receipt_filename" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_ads" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "campaign_id" INTEGER,
    "boost_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "boost_end" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_connections" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "network" VARCHAR(50) NOT NULL,
    "api_key" TEXT,
    "api_secret" TEXT,
    "access_token" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "network_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'info',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_jobs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "job_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "entity_type" VARCHAR(50),
    "entity_id" INTEGER,
    "input_data" JSONB,
    "result" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
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
    "name" VARCHAR(100) NOT NULL,
    "credits" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "bonus_credits" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "features" JSONB,
    "max_products" INTEGER,
    "max_ad_boosts" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority_boost" BOOLEAN NOT NULL DEFAULT false,
    "commission_multiplier" DOUBLE PRECISION DEFAULT 1.0,
    "credits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "payment_reference" VARCHAR(255),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "purpose" VARCHAR(50),
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(10) DEFAULT 'USD',
    "payment_method" VARCHAR(50),
    "package_id" INTEGER,
    "credits_to_add" INTEGER,
    "plan_id" INTEGER,
    "subscription_id" INTEGER,
    "receipt_url" TEXT,
    "receipt_filename" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reviewed_by" INTEGER,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "stripe_payment_intent_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "extra_data" JSONB,

    CONSTRAINT "payment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" INTEGER,
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "fraud_score" INTEGER DEFAULT 0,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "bank_name" VARCHAR(100) NOT NULL,
    "account_name" VARCHAR(100) NOT NULL,
    "account_number_cipher" TEXT NOT NULL,
    "account_number_last4" VARCHAR(4) NOT NULL,
    "country" VARCHAR(50) NOT NULL,
    "swift_code" VARCHAR(20),
    "routing_code" VARCHAR(50),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_methods" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "method_type" VARCHAR(50) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "payoneer_email" VARCHAR(255),
    "mobile_network" VARCHAR(50),
    "mobile_number" VARCHAR(20),
    "mobile_country" VARCHAR(10),
    "usdt_network" VARCHAR(20),
    "usdt_address" VARCHAR(100),
    "btc_address" VARCHAR(100),
    "btc_network" VARCHAR(20),
    "eth_address" VARCHAR(100),
    "eth_network" VARCHAR(20),
    "bank_account_id" INTEGER,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "verification_code" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "payout_method_id" INTEGER NOT NULL,
    "withdrawal_id" INTEGER,
    "amount" DECIMAL(15,4) NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "amount_in_usd" DECIMAL(15,4),
    "provider" VARCHAR(50) NOT NULL,
    "provider_ref" VARCHAR(255),
    "provider_fee" DECIMAL(10,4),
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "approved_at" TIMESTAMP(3),
    "approved_by" INTEGER,
    "approved_by_name" VARCHAR(100),
    "processed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "fraud_score" INTEGER NOT NULL DEFAULT 0,
    "fraud_flags" JSONB,
    "fraud_cleared" BOOLEAN NOT NULL DEFAULT false,
    "fraud_cleared_by" INTEGER,
    "notes" TEXT,
    "admin_notes" TEXT,
    "extra_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_balances" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "balance" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "pending" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "locked" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lands" (
    "id" SERIAL NOT NULL,
    "title_number" VARCHAR(100) NOT NULL,
    "land_name" VARCHAR(255),
    "owner_id" INTEGER,
    "current_owner" VARCHAR(255) NOT NULL,
    "owner_id_type" VARCHAR(50),
    "owner_id_number" VARCHAR(100),
    "region" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100),
    "town" VARCHAR(100),
    "neighborhood" VARCHAR(100),
    "area_sqm" DECIMAL(12,2),
    "polygon_coords" JSONB NOT NULL,
    "polygon_wkt" TEXT,
    "center_lat" DECIMAL(10,8),
    "center_lng" DECIMAL(11,8),
    "land_use" VARCHAR(50),
    "status" VARCHAR(30) NOT NULL DEFAULT 'submitted',
    "verification_status" VARCHAR(30) NOT NULL DEFAULT 'submitted',
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "lock_reason" TEXT,
    "verification_date" TIMESTAMP(3),
    "verified_by" INTEGER,
    "verified_by_name" VARCHAR(255),
    "approved_at" TIMESTAMP(3),
    "approved_by" INTEGER,
    "approved_by_name" VARCHAR(255),
    "land_hash" VARCHAR(64),
    "purchase_date" TIMESTAMP(3),
    "purchase_price" DECIMAL(15,2),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'XAF',
    "seller_name" VARCHAR(255),
    "seller_id_number" VARCHAR(100),
    "documents" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "property_id" INTEGER,

    CONSTRAINT "lands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_sections" (
    "id" SERIAL NOT NULL,
    "land_id" INTEGER NOT NULL,
    "section_name" VARCHAR(100) NOT NULL,
    "section_type" VARCHAR(50) NOT NULL,
    "area_sqm" DECIMAL(10,2),
    "polygon_coords" JSONB,
    "polygon_wkt" TEXT,
    "center_lat" DECIMAL(10,8),
    "center_lng" DECIMAL(11,8),
    "description" TEXT,
    "capacity" INTEGER,
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "land_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_ownerships" (
    "id" SERIAL NOT NULL,
    "land_id" INTEGER NOT NULL,
    "owner_name" VARCHAR(255) NOT NULL,
    "owner_id_type" VARCHAR(50),
    "owner_id_number" VARCHAR(100),
    "user_id" INTEGER,
    "ownership_type" VARCHAR(50) NOT NULL DEFAULT 'full',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "acquired_date" TIMESTAMP(3) NOT NULL,
    "acquired_price" DECIMAL(15,2),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'XAF',
    "seller_name" VARCHAR(255),
    "seller_id" VARCHAR(100),
    "transfer_date" TIMESTAMP(3),
    "transferred_to" INTEGER,
    "documents" JSONB,
    "verification" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "verified_by" INTEGER,
    "verified_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "land_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_leads" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "land_id" INTEGER,
    "lead_type" VARCHAR(50) NOT NULL DEFAULT 'inquiry',
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "whatsapp" VARCHAR(50),
    "message" TEXT,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "status" VARCHAR(20) NOT NULL DEFAULT 'new',
    "offer_amount" DECIMAL(15,2),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'XAF',
    "agent_id" INTEGER,
    "user_id" INTEGER,
    "source" VARCHAR(50),
    "notes" TEXT,
    "responded_at" TIMESTAMP(3),
    "responded_by" INTEGER,
    "closed_at" TIMESTAMP(3),
    "closed_reason" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_audit_logs" (
    "id" SERIAL NOT NULL,
    "land_id" INTEGER NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "actor_id" INTEGER,
    "actor_name" VARCHAR(255),
    "actor_role" VARCHAR(50),
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_address" VARCHAR(45),
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "land_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_networks" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "parent_slug" VARCHAR(50),
    "api_base" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_networks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_clicks" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "product_id" INTEGER,
    "network" VARCHAR(50) NOT NULL,
    "click_id" VARCHAR(255) NOT NULL,
    "subid" VARCHAR(255),
    "product_url" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "conversion_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automobiles" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "brand" VARCHAR(100),
    "model" VARCHAR(100),
    "year" INTEGER,
    "mileage" INTEGER,
    "fuel_type" VARCHAR(50),
    "transmission" VARCHAR(50),
    "condition" VARCHAR(50),
    "price" DECIMAL(12,2),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "location" VARCHAR(150),
    "images" JSONB,
    "description" TEXT,
    "seller_id" INTEGER,
    "listing_type" VARCHAR(30) NOT NULL DEFAULT 'direct',
    "affiliate_network" VARCHAR(50),
    "affiliate_url" TEXT,
    "commission_rate" DECIMAL(5,2),
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automobiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "access_token" TEXT,
    "page_id" VARCHAR(255),
    "page_name" VARCHAR(255),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_posts" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "user_id" INTEGER,
    "platform" VARCHAR(50) NOT NULL,
    "content" TEXT NOT NULL,
    "post_url" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "dailyBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIContent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Click" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,

    CONSTRAINT "Click_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversion" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "commission" DOUBLE PRECISION NOT NULL,
    "network" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "credit_wallets_user_id_key" ON "credit_wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_user_id_key" ON "bank_accounts"("user_id");

-- CreateIndex
CREATE INDEX "payouts_user_id_idx" ON "payouts"("user_id");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE INDEX "payouts_created_at_idx" ON "payouts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_balances_user_id_currency_key" ON "wallet_balances"("user_id", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "lands_title_number_key" ON "lands"("title_number");

-- CreateIndex
CREATE INDEX "lands_region_city_idx" ON "lands"("region", "city");

-- CreateIndex
CREATE INDEX "lands_current_owner_idx" ON "lands"("current_owner");

-- CreateIndex
CREATE INDEX "lands_verification_status_idx" ON "lands"("verification_status");

-- CreateIndex
CREATE INDEX "lands_land_hash_idx" ON "lands"("land_hash");

-- CreateIndex
CREATE INDEX "land_sections_land_id_idx" ON "land_sections"("land_id");

-- CreateIndex
CREATE INDEX "land_sections_section_type_idx" ON "land_sections"("section_type");

-- CreateIndex
CREATE INDEX "land_ownerships_land_id_idx" ON "land_ownerships"("land_id");

-- CreateIndex
CREATE INDEX "land_ownerships_user_id_idx" ON "land_ownerships"("user_id");

-- CreateIndex
CREATE INDEX "property_leads_property_id_idx" ON "property_leads"("property_id");

-- CreateIndex
CREATE INDEX "property_leads_status_idx" ON "property_leads"("status");

-- CreateIndex
CREATE INDEX "property_leads_priority_idx" ON "property_leads"("priority");

-- CreateIndex
CREATE INDEX "land_audit_logs_land_id_idx" ON "land_audit_logs"("land_id");

-- CreateIndex
CREATE INDEX "land_audit_logs_action_idx" ON "land_audit_logs"("action");

-- CreateIndex
CREATE INDEX "land_audit_logs_created_at_idx" ON "land_audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_networks_slug_key" ON "affiliate_networks"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_clicks_click_id_key" ON "affiliate_clicks"("click_id");

-- CreateIndex
CREATE INDEX "affiliate_clicks_user_id_idx" ON "affiliate_clicks"("user_id");

-- CreateIndex
CREATE INDEX "affiliate_clicks_network_idx" ON "affiliate_clicks"("network");

-- CreateIndex
CREATE INDEX "affiliate_clicks_created_at_idx" ON "affiliate_clicks"("created_at");

-- CreateIndex
CREATE INDEX "automobiles_status_idx" ON "automobiles"("status");

-- CreateIndex
CREATE INDEX "automobiles_seller_id_idx" ON "automobiles"("seller_id");

-- CreateIndex
CREATE INDEX "automobiles_brand_idx" ON "automobiles"("brand");

-- CreateIndex
CREATE INDEX "automobiles_created_at_idx" ON "automobiles"("created_at");

-- CreateIndex
CREATE INDEX "social_accounts_user_id_idx" ON "social_accounts"("user_id");

-- CreateIndex
CREATE INDEX "social_accounts_platform_idx" ON "social_accounts"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_user_id_platform_page_id_key" ON "social_accounts"("user_id", "platform", "page_id");

-- CreateIndex
CREATE INDEX "social_posts_product_id_idx" ON "social_posts"("product_id");

-- CreateIndex
CREATE INDEX "social_posts_user_id_idx" ON "social_posts"("user_id");

-- CreateIndex
CREATE INDEX "social_posts_status_idx" ON "social_posts"("status");

-- CreateIndex
CREATE INDEX "social_posts_platform_idx" ON "social_posts"("platform");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_boosts" ADD CONSTRAINT "ad_boosts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "real_estate_properties" ADD CONSTRAINT "real_estate_properties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_payments" ADD CONSTRAINT "property_payments_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "real_estate_properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_ads" ADD CONSTRAINT "property_ads_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "real_estate_properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_connections" ADD CONSTRAINT "network_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_wallets" ADD CONSTRAINT "credit_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_methods" ADD CONSTRAINT "payout_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_payout_method_id_fkey" FOREIGN KEY ("payout_method_id") REFERENCES "payout_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_sections" ADD CONSTRAINT "land_sections_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_ownerships" ADD CONSTRAINT "land_ownerships_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_audit_logs" ADD CONSTRAINT "land_audit_logs_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automobiles" ADD CONSTRAINT "automobiles_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
