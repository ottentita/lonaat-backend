-- MANUAL FINANCIAL DATA RESET
-- Use this if the /api/test/reset-financial-data endpoint doesn't work

-- Find your user ID first
SELECT id, email FROM users WHERE email = 'lonaat64@gmail.com';

-- Replace 'YOUR_USER_ID' with the actual user ID from above query

-- Delete all transactions for user
DELETE FROM "Transaction" WHERE "userId" = 3;  -- Replace 3 with your user ID

-- Reset wallet balance
UPDATE "wallet" SET balance = 0 WHERE "userId" = '3';  -- Replace '3' with your user ID (as string)

-- Verify cleanup
SELECT COUNT(*) as transaction_count FROM "Transaction" WHERE "userId" = 3;
SELECT balance FROM "wallet" WHERE "userId" = '3';

-- Expected results:
-- transaction_count: 0
-- balance: 0
