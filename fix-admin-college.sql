-- Fix ADMIN users without college assignment
-- Run this script if ADMIN users cannot create instructors due to missing college

-- Step 1: Check current ADMIN users and their college assignments
SELECT 
  id, 
  name, 
  email, 
  role, 
  college_id, 
  college_name 
FROM users 
WHERE role = 'ADMIN'
ORDER BY id;

-- Step 2: Get available colleges
SELECT id, name FROM colleges ORDER BY id;

-- Step 3: Update ADMIN users without college to use the first available college
-- (Change the college ID if you want to use a different college)
UPDATE users 
SET 
  college_id = (SELECT id FROM colleges ORDER BY id LIMIT 1),
  college_name = (SELECT name FROM colleges ORDER BY id LIMIT 1)
WHERE role = 'ADMIN' 
  AND college_id IS NULL;

-- Step 4: Verify the fix
SELECT 
  id, 
  name, 
  email, 
  role, 
  college_id, 
  college_name 
FROM users 
WHERE role = 'ADMIN'
ORDER BY id;
