-- Migration 082: Remove dept_head role from users table
-- This migration ensures ZERO dept_head roles remain in the users table
-- dept_head has been replaced by more specific roles: dep_pr_manager, tech_head, mc_manager, qs_manager

-- Step 1: Update users with dept_head role to appropriate new roles
-- Based on their department or context, migrate to the new role structure

-- For users in departments that would use dep_pr_manager
UPDATE users 
SET role = 'dep_pr_manager' 
WHERE role = 'dept_head' 
AND department_id IN (
  SELECT id FROM departments 
  WHERE name_ar LIKE '%إنتاج%' OR name LIKE '%Production%'
  OR name_ar LIKE '%تسويق%' OR name LIKE '%Marketing%'
  OR name_ar LIKE '%علاقات%' OR name LIKE '%PR%'
);

-- For users in technical departments, migrate to tech_head
UPDATE users 
SET role = 'tech_head' 
WHERE role = 'dept_head' 
AND department_id IN (
  SELECT id FROM departments 
  WHERE name_ar LIKE '%هندسة%' OR name LIKE '%Engineering%'
  OR name_ar LIKE '%فني%' OR name LIKE '%Technical%'
  OR name_ar LIKE '%صيانة%' OR name LIKE '%Maintenance%'
);

-- For users in MC/QS departments, migrate to mc_manager or qs_manager
UPDATE users 
SET role = 'mc_manager' 
WHERE role = 'dept_head' 
AND department_id IN (
  SELECT id FROM departments 
  WHERE name_ar LIKE '%مراقبة%' OR name LIKE '%MC%'
  OR name_ar LIKE '%إدارة مواد%' OR name LIKE '%Materials%'
);

UPDATE users 
SET role = 'qs_manager' 
WHERE role = 'dept_head' 
AND department_id IN (
  SELECT id FROM departments 
  WHERE name_ar LIKE '%كمية%' OR name LIKE '%QS%'
  OR name_ar LIKE '%مساحة%' OR name LIKE '%Survey%'
);

-- For any remaining dept_head users, default to general_manager as fallback
UPDATE users 
SET role = 'general_manager' 
WHERE role = 'dept_head';

-- Step 2: Remove dept_head role from the roles table
DELETE FROM roles WHERE role_name = 'dept_head';

-- Step 3: Verify no dept_head roles remain
-- This should return 0 rows if successful
SELECT COUNT(*) as remaining_dept_head_users FROM users WHERE role = 'dept_head';
SELECT COUNT(*) as remaining_dept_head_role FROM roles WHERE role_name = 'dept_head';
