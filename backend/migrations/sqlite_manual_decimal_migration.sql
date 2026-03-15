-- sqlite_manual_decimal_migration.sql
-- Manual SQLite migration to convert monetary FLOAT columns to NUMERIC
-- Generated: 2026-02-19
-- IMPORTANT: Review and backup your DB before running. Run each section separately.

-- General strategy for each table:
-- 1. Disable foreign keys enforcement: PRAGMA foreign_keys=off;
-- 2. Create a new table <table>_new with the same columns but using NUMERIC for money fields.
-- 3. Copy data from the old table into the new table, casting monetary fields to NUMERIC.
-- 4. Drop the old table and rename the new table to the original name.
-- 5. Recreate indexes and triggers (if any). Re-enable foreign keys.

-- NOTE: The CREATE statements below are conservative reconstructions based on model definitions.
-- If your actual SQLite table has additional constraints, indexes, triggers or columns, adapt the SQL
-- accordingly (check PRAGMA table_info(<table>) and PRAGMA index_list(<table>)).

-- BACKUP your database first, e.g.: copy the .db file or run sqlite3 dump

-- === users: convert `balance` to NUMERIC ===
BEGIN TRANSACTION;
PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS users_new (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  balance NUMERIC NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_blocked INTEGER NOT NULL DEFAULT 0,
  blocked_until DATETIME,
  block_reason TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by TEXT,
  created_at DATETIME
);

INSERT INTO users_new (id, name, email, password_hash, role, is_admin, balance, verified, is_active, is_blocked, blocked_until, block_reason, referral_code, referred_by, created_at)
SELECT id, name, email, password_hash, role, is_admin, CAST(balance AS NUMERIC), verified, is_active, is_blocked, blocked_until, block_reason, referral_code, referred_by, created_at FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
PRAGMA foreign_keys=on;
COMMIT;

-- === transactions: convert `amount` to NUMERIC ===
BEGIN TRANSACTION;
PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS transactions_new (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  reference TEXT,
  extra_data TEXT,
  created_at DATETIME
);

INSERT INTO transactions_new (id, user_id, type, amount, description, status, reference, extra_data, created_at)
SELECT id, user_id, type, CAST(amount AS NUMERIC), description, status, reference, extra_data, created_at FROM transactions;

DROP TABLE transactions;
ALTER TABLE transactions_new RENAME TO transactions;
PRAGMA foreign_keys=on;
COMMIT;

-- === withdrawal_requests: convert `amount` to NUMERIC ===
BEGIN TRANSACTION;
PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS withdrawal_requests_new (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  bank_account_id INTEGER,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL,
  admin_notes TEXT,
  requested_at DATETIME,
  reviewed_at DATETIME,
  reviewed_by INTEGER
);

INSERT INTO withdrawal_requests_new (id, user_id, bank_account_id, amount, status, admin_notes, requested_at, reviewed_at, reviewed_by)
SELECT id, user_id, bank_account_id, CAST(amount AS NUMERIC), status, admin_notes, requested_at, reviewed_at, reviewed_by FROM withdrawal_requests;

DROP TABLE withdrawal_requests;
ALTER TABLE withdrawal_requests_new RENAME TO withdrawal_requests;
PRAGMA foreign_keys=on;
COMMIT;

-- === referral_payouts: convert `amount` to NUMERIC ===
BEGIN TRANSACTION;
PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS referral_payouts_new (
  id INTEGER PRIMARY KEY,
  referrer_id INTEGER NOT NULL,
  referred_id INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  commission_type TEXT NOT NULL,
  status TEXT NOT NULL,
  transaction_id INTEGER,
  created_at DATETIME,
  paid_at DATETIME
);

INSERT INTO referral_payouts_new (id, referrer_id, referred_id, amount, commission_type, status, transaction_id, created_at, paid_at)
SELECT id, referrer_id, referred_id, CAST(amount AS NUMERIC), commission_type, status, transaction_id, created_at, paid_at FROM referral_payouts;

DROP TABLE referral_payouts;
ALTER TABLE referral_payouts_new RENAME TO referral_payouts;
PRAGMA foreign_keys=on;
COMMIT;

-- === commissions: convert `amount` to NUMERIC ===
BEGIN TRANSACTION;
PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS commissions_new (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  network TEXT,
  product_id INTEGER,
  campaign_id INTEGER,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL,
  external_ref TEXT,
  webhook_data TEXT,
  rejection_reason TEXT,
  approved_at DATETIME,
  approved_by INTEGER,
  created_at DATETIME,
  paid_at DATETIME
);

INSERT INTO commissions_new (id, user_id, network, product_id, campaign_id, amount, status, external_ref, webhook_data, rejection_reason, approved_at, approved_by, created_at, paid_at)
SELECT id, user_id, network, product_id, campaign_id, CAST(amount AS NUMERIC), status, external_ref, webhook_data, rejection_reason, approved_at, approved_by, created_at, paid_at FROM commissions;

DROP TABLE commissions;
ALTER TABLE commissions_new RENAME TO commissions;
PRAGMA foreign_keys=on;
COMMIT;

-- === plans: convert `price` to NUMERIC ===
BEGIN TRANSACTION;
PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS plans_new (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  features TEXT,
  max_products INTEGER,
  max_ad_boosts INTEGER,
  priority_boost INTEGER NOT NULL DEFAULT 0,
  commission_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME
);

INSERT INTO plans_new (id, name, price, duration_days, features, max_products, max_ad_boosts, priority_boost, commission_multiplier, is_active, created_at)
SELECT id, name, CAST(price AS NUMERIC), duration_days, features, max_products, max_ad_boosts, priority_boost, commission_multiplier, is_active, created_at FROM plans;

DROP TABLE plans;
ALTER TABLE plans_new RENAME TO plans;
PRAGMA foreign_keys=on;
COMMIT;

-- === credit_packages: convert `price` to NUMERIC ===
BEGIN TRANSACTION;
PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS credit_packages_new (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  bonus_credits INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME
);

INSERT INTO credit_packages_new (id, name, credits, price, bonus_credits, is_active, display_order, created_at)
SELECT id, name, credits, CAST(price AS NUMERIC), bonus_credits, is_active, display_order, created_at FROM credit_packages;

DROP TABLE credit_packages;
ALTER TABLE credit_packages_new RENAME TO credit_packages;
PRAGMA foreign_keys=on;
COMMIT;

-- === payment_requests: convert `amount` to NUMERIC ===
BEGIN TRANSACTION;
PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS payment_requests_new (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  purpose TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  package_id INTEGER,
  credits_to_add INTEGER,
  plan_id INTEGER,
  subscription_id INTEGER,
  receipt_url TEXT,
  receipt_filename TEXT,
  status TEXT NOT NULL,
  reviewed_by INTEGER,
  review_note TEXT,
  reviewed_at DATETIME,
  stripe_payment_intent_id TEXT,
  extra_data TEXT,
  created_at DATETIME
);

INSERT INTO payment_requests_new (id, user_id, purpose, amount, currency, payment_method, package_id, credits_to_add, plan_id, subscription_id, receipt_url, receipt_filename, status, reviewed_by, review_note, reviewed_at, stripe_payment_intent_id, extra_data, created_at)
SELECT id, user_id, purpose, CAST(amount AS NUMERIC), currency, payment_method, package_id, credits_to_add, plan_id, subscription_id, receipt_url, receipt_filename, status, reviewed_by, review_note, reviewed_at, stripe_payment_intent_id, extra_data, created_at FROM payment_requests;

DROP TABLE payment_requests;
ALTER TABLE payment_requests_new RENAME TO payment_requests;
PRAGMA foreign_keys=on;
COMMIT;

-- === properties: convert `price` to NUMERIC ===
BEGIN TRANSACTION;
PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS properties_new (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  property_type TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  price NUMERIC,
  currency TEXT NOT NULL,
  price_type TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  size_sqm NUMERIC,
  amenities TEXT,
  status TEXT NOT NULL,
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  reviewed_by INTEGER,
  review_note TEXT,
  reviewed_at DATETIME,
  created_at DATETIME,
  updated_at DATETIME
);

INSERT INTO properties_new (id, user_id, title, description, property_type, country, city, address, price, currency, price_type, bedrooms, bathrooms, size_sqm, amenities, status, is_featured, is_active, reviewed_by, review_note, reviewed_at, created_at, updated_at)
SELECT id, user_id, title, description, property_type, country, city, address, CAST(price AS NUMERIC), currency, price_type, bedrooms, bathrooms, size_sqm, amenities, status, is_featured, is_active, reviewed_by, review_note, reviewed_at, created_at, updated_at FROM properties;

DROP TABLE properties;
ALTER TABLE properties_new RENAME TO properties;
PRAGMA foreign_keys=on;
COMMIT;

-- === rental_details: convert rates and deposit to NUMERIC ===
BEGIN TRANSACTION;
PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS rental_details_new (
  id INTEGER PRIMARY KEY,
  property_id INTEGER NOT NULL UNIQUE,
  daily_rate NUMERIC,
  weekly_rate NUMERIC,
  monthly_rate NUMERIC,
  min_stay_days INTEGER NOT NULL DEFAULT 1,
  max_stay_days INTEGER,
  max_guests INTEGER,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_type TEXT,
  deposit_required NUMERIC,
  cancellation_policy TEXT
);

INSERT INTO rental_details_new (id, property_id, daily_rate, weekly_rate, monthly_rate, min_stay_days, max_stay_days, max_guests, vehicle_make, vehicle_model, vehicle_year, vehicle_type, deposit_required, cancellation_policy)
SELECT id, property_id, CAST(daily_rate AS NUMERIC), CAST(weekly_rate AS NUMERIC), CAST(monthly_rate AS NUMERIC), min_stay_days, max_stay_days, max_guests, vehicle_make, vehicle_model, vehicle_year, vehicle_type, CAST(deposit_required AS NUMERIC), cancellation_policy FROM rental_details;

DROP TABLE rental_details;
ALTER TABLE rental_details_new RENAME TO rental_details;
PRAGMA foreign_keys=on;
COMMIT;

-- === property_bookings: convert `total_price` and `deposit_paid` to NUMERIC ===
BEGIN TRANSACTION;
PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS property_bookings_new (
  id INTEGER PRIMARY KEY,
  property_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  check_in DATETIME NOT NULL,
  check_out DATETIME NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  deposit_paid NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  guest_notes TEXT,
  owner_notes TEXT,
  created_at DATETIME,
  confirmed_at DATETIME,
  cancelled_at DATETIME
);

INSERT INTO property_bookings_new (id, property_id, user_id, check_in, check_out, guests, total_price, currency, deposit_paid, status, guest_notes, owner_notes, created_at, confirmed_at, cancelled_at)
SELECT id, property_id, user_id, check_in, check_out, guests, CAST(total_price AS NUMERIC), currency, CAST(deposit_paid AS NUMERIC), status, guest_notes, owner_notes, created_at, confirmed_at, cancelled_at FROM property_bookings;

DROP TABLE property_bookings;
ALTER TABLE property_bookings_new RENAME TO property_bookings;
PRAGMA foreign_keys=on;
COMMIT;

-- === End of manual SQLite migration script ===

-- After running above blocks, you should recreate any indexes, triggers, or constraints that are not handled automatically.
-- Verify schema with: PRAGMA table_info(<table>);
-- And validate data correctness: SELECT COUNT(*) FROM <table>; SELECT SUM(CAST(amount AS NUMERIC)) FROM <table>;
