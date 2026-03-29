-- Fix existing clicks in database to assign to admin user
-- Run this SQL to update NULL user_id values

-- Step 1: Update existing clicks with NULL user_id to admin user (id = 1)
UPDATE clicks
SET user_id = 1
WHERE user_id IS NULL;

-- Step 2: Verify the update
SELECT COUNT(*) as total_clicks_for_user_1 FROM clicks WHERE user_id = 1;

-- Step 3: Check all clicks
SELECT 
  user_id,
  COUNT(*) as click_count
FROM clicks
GROUP BY user_id
ORDER BY user_id;

-- Step 4: View recent clicks
SELECT 
  id,
  user_id,
  offerId,
  network,
  created_at
FROM clicks
ORDER BY id DESC
LIMIT 10;
