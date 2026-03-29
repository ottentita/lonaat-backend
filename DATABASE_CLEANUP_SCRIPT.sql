-- ============================================
-- DATABASE CLEANUP SCRIPT - REMOVE MOCK DATA
-- ============================================
-- This script removes all seed/test/mock data from the database
-- Run this ONLY if you have seed data in your database
-- BACKUP YOUR DATABASE BEFORE RUNNING THIS SCRIPT

-- ============================================
-- STEP 1: CHECK FOR SEED DATA
-- ============================================

-- Check for seed users
SELECT 'SEED USERS:' as check_type, COUNT(*) as count 
FROM users 
WHERE email IN ('admin@lonaat.com', 'aff1@lonaat.com', 'aff2@lonaat.com', 'aff3@lonaat.com', 'aff4@lonaat.com');

-- Check for seed offers
SELECT 'SEED OFFERS:' as check_type, COUNT(*) as count 
FROM offers 
WHERE network = 'seed-net';

-- Check for seed clicks
SELECT 'SEED CLICKS:' as check_type, COUNT(*) as count 
FROM clicks 
WHERE "clickId" LIKE 'seed_click_%';

-- Check for seed conversions
SELECT 'SEED CONVERSIONS:' as check_type, COUNT(*) as count 
FROM conversions 
WHERE "clickId" LIKE 'seed_click_%';

-- Check for seed commissions
SELECT 'SEED COMMISSIONS:' as check_type, COUNT(*) as count 
FROM commissions 
WHERE external_ref LIKE 'seed_comm_%';

-- Check for seed payouts
SELECT 'SEED PAYOUTS:' as check_type, COUNT(*) as count 
FROM payments 
WHERE "transactionId" LIKE 'seed_payout_%';

-- ============================================
-- STEP 2: DELETE SEED DATA (CASCADING)
-- ============================================

-- Delete seed payouts
DELETE FROM payments 
WHERE "transactionId" LIKE 'seed_payout_%';

-- Delete seed commissions
DELETE FROM commissions 
WHERE external_ref LIKE 'seed_comm_%';

-- Delete seed conversions
DELETE FROM conversions 
WHERE "clickId" LIKE 'seed_click_%';

-- Delete seed clicks
DELETE FROM clicks 
WHERE "clickId" LIKE 'seed_click_%';

-- Delete seed offers
DELETE FROM offers 
WHERE network = 'seed-net';

-- Delete seed users (KEEP REAL ADMIN)
-- WARNING: This will delete users and all their related data
-- Make sure to keep your real admin user (titasembi@gmail.com)
DELETE FROM users 
WHERE email IN ('admin@lonaat.com', 'aff1@lonaat.com', 'aff2@lonaat.com', 'aff3@lonaat.com', 'aff4@lonaat.com');

-- ============================================
-- STEP 3: VERIFY CLEANUP
-- ============================================

-- Verify all seed data is removed
SELECT 'REMAINING SEED USERS:' as check_type, COUNT(*) as count 
FROM users 
WHERE email IN ('admin@lonaat.com', 'aff1@lonaat.com', 'aff2@lonaat.com', 'aff3@lonaat.com', 'aff4@lonaat.com');

SELECT 'REMAINING SEED OFFERS:' as check_type, COUNT(*) as count 
FROM offers 
WHERE network = 'seed-net';

SELECT 'REMAINING SEED CLICKS:' as check_type, COUNT(*) as count 
FROM clicks 
WHERE "clickId" LIKE 'seed_click_%';

SELECT 'REMAINING SEED CONVERSIONS:' as check_type, COUNT(*) as count 
FROM conversions 
WHERE "clickId" LIKE 'seed_click_%';

SELECT 'REMAINING SEED COMMISSIONS:' as check_type, COUNT(*) as count 
FROM commissions 
WHERE external_ref LIKE 'seed_comm_%';

SELECT 'REMAINING SEED PAYOUTS:' as check_type, COUNT(*) as count 
FROM payments 
WHERE "transactionId" LIKE 'seed_payout_%';

-- ============================================
-- STEP 4: CHECK REAL DATA
-- ============================================

-- Check remaining real users
SELECT 'REAL USERS:' as check_type, COUNT(*) as count FROM users;

-- Check remaining real offers
SELECT 'REAL OFFERS:' as check_type, COUNT(*) as count FROM offers;

-- Check remaining real clicks
SELECT 'REAL CLICKS:' as check_type, COUNT(*) as count FROM clicks;

-- Check remaining real conversions
SELECT 'REAL CONVERSIONS:' as check_type, COUNT(*) as count FROM conversions;

-- ============================================
-- USAGE INSTRUCTIONS
-- ============================================
-- 
-- To run this script:
-- 
-- docker exec -i lonaat-postgres psql -U postgres -d lonaat < DATABASE_CLEANUP_SCRIPT.sql
-- 
-- OR connect to database and run manually:
-- 
-- docker exec -it lonaat-postgres psql -U postgres -d lonaat
-- 
-- Then copy/paste sections of this script
-- 
-- ============================================
