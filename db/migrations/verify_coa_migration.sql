-- ============================================================================
-- VERIFICATION SCRIPT: Chart of Accounts Migration
-- Run this AFTER executing migrations 012 and 013
-- ============================================================================

BEGIN;

-- 1. Verify schema enhancements
SELECT 
  'Schema Check' as test_name,
  COUNT(*) as result,
  CASE 
    WHEN COUNT(*) = 10 THEN '✅ PASS - All 10 new columns exist'
    ELSE '❌ FAIL - Missing columns'
  END as status
FROM information_schema.columns
WHERE table_name = 'chart_of_accounts'
  AND column_name IN (
    'account_name_ar', 'is_vat_applicable', 'vat_rate',
    'cost_center_type', 'linked_entity_id', 'financial_statement',
    'report_category', 'depreciation_method', 'useful_life_years',
    'salvage_value'
  );

-- 2. Verify account count
SELECT 
  'Account Count' as test_name,
  COUNT(*) as total_accounts,
  CASE 
    WHEN COUNT(*) >= 100 THEN '✅ PASS - 100+ accounts created'
    ELSE '❌ FAIL - Insufficient accounts'
  END as status
FROM chart_of_accounts;

-- 3. Verify level distribution
SELECT 
  'Level Distribution' as test_name,
  json_build_object(
    'level_1', SUM(CASE WHEN level = 1 THEN 1 ELSE 0 END),
    'level_2', SUM(CASE WHEN level = 2 THEN 1 ELSE 0 END),
    'level_3', SUM(CASE WHEN level = 3 THEN 1 ELSE 0 END),
    'level_4_plus', SUM(CASE WHEN level >= 4 THEN 1 ELSE 0 END)
  ) as distribution,
  '✅ INFO - Check distribution above' as status
FROM chart_of_accounts;

-- 4. Verify Arabic names coverage
SELECT 
  'Arabic Names' as test_name,
  COUNT(*) as with_arabic,
  (SELECT COUNT(*) FROM chart_of_accounts) as total,
  CASE 
    WHEN COUNT(*) = (SELECT COUNT(*) FROM chart_of_accounts) THEN '✅ PASS - All accounts have Arabic names'
    ELSE '❌ FAIL - Some accounts missing Arabic names'
  END as status
FROM chart_of_accounts
WHERE account_name_ar IS NOT NULL;

-- 5. Verify VAT-applicable accounts
SELECT 
  'VAT Configuration' as test_name,
  COUNT(*) as vat_enabled_accounts,
  '✅ INFO - VAT accounts configured' as status
FROM chart_of_accounts
WHERE is_vat_applicable = TRUE;

-- 6. Verify cost center linked accounts
SELECT 
  'Cost Center Links' as test_name,
  cost_center_type,
  COUNT(*) as count,
  '✅ INFO - Cost centers linked' as status
FROM chart_of_accounts
WHERE cost_center_type IS NOT NULL
GROUP BY cost_center_type
ORDER BY count DESC;

-- 7. Verify financial statement classification
SELECT 
  'Financial Statement Classification' as test_name,
  financial_statement,
  COUNT(*) as count,
  '✅ INFO - Statements classified' as status
FROM chart_of_accounts
WHERE financial_statement IS NOT NULL
GROUP BY financial_statement
ORDER BY count DESC;

-- 8. Verify parent-child relationships
WITH RECURSIVE account_tree AS (
  SELECT id, account_code, parent_id, 1 as depth
  FROM chart_of_accounts
  WHERE parent_id IS NULL
  
  UNION ALL
  
  SELECT c.id, c.account_code, c.parent_id, at.depth + 1
  FROM chart_of_accounts c
  INNER JOIN account_tree at ON c.parent_id = at.id
)
SELECT 
  'Hierarchy Depth' as test_name,
  MAX(depth) as max_depth,
  CASE 
    WHEN MAX(depth) >= 4 THEN '✅ PASS - 4+ level hierarchy achieved'
    ELSE '⚠️  WARNING - Hierarchy less than 4 levels'
  END as status
FROM account_tree;

-- 9. Check for orphaned accounts (parent_id set but parent doesn't exist)
SELECT 
  'Orphaned Accounts' as test_name,
  COUNT(*) as orphaned_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - No orphaned accounts'
    ELSE '❌ FAIL - Orphaned accounts found'
  END as status
FROM chart_of_accounts c
WHERE c.parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM chart_of_accounts p WHERE p.id = c.parent_id
  );

-- 10. Sample specific accounts from PDF
SELECT 
  'Sample Account Verification' as test_name,
  account_code,
  account_name_ar,
  level,
  '✅ EXISTS' as status
FROM chart_of_accounts
WHERE account_code IN (
  '1210101',   -- Huawei customer
  '2220101',   -- Output VAT
  '2220102',   -- Input VAT
  '31112403',  -- Isuzu fuel
  '321002702'  -- Corolla fuel
)
ORDER BY account_code;

-- 11. Verify views created
SELECT 
  'Helper Views' as test_name,
  viewname,
  '✅ EXISTS' as status
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'v_balance_sheet_accounts',
    'v_income_statement_accounts',
    'v_vat_applicable_accounts',
    'v_cost_center_accounts'
  )
ORDER BY viewname;

-- 12. Test tree query performance
EXPLAIN ANALYZE
WITH RECURSIVE account_hierarchy AS (
  SELECT 
    id, account_code, account_name, account_name_ar,
    account_type, parent_id, level,
    ARRAY[account_code]::varchar[] as code_path
  FROM chart_of_accounts
  WHERE parent_id IS NULL AND is_active = TRUE
  
  UNION ALL
  
  SELECT 
    c.id, c.account_code, c.account_name, c.account_name_ar,
    c.account_type, c.parent_id, c.level,
    (ah.code_path || c.account_code)::varchar[]
  FROM chart_of_accounts c
  INNER JOIN account_hierarchy ah ON c.parent_id = ah.id
  WHERE c.is_active = TRUE
)
SELECT COUNT(*) FROM account_hierarchy;

COMMIT;
