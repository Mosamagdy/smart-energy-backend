-- ============================================================================
-- Quick Reference: Common COA Queries
-- Smart Energy Company - Post-Migration
-- ============================================================================

-- 1. Get Full Account Tree (Recursive)
WITH RECURSIVE account_tree AS (
  SELECT 
    id, account_code, account_name, account_name_ar,
    account_type, parent_id, level,
    ARRAY[account_code]::varchar[] as path
  FROM chart_of_accounts
  WHERE parent_id IS NULL AND is_active = TRUE
  
  UNION ALL
  
  SELECT 
    c.id, c.account_code, c.account_name, c.account_name_ar,
    c.account_type, c.parent_id, c.level,
    at.path || c.account_code
  FROM chart_of_accounts c
  INNER JOIN account_tree at ON c.parent_id = at.id
  WHERE c.is_active = TRUE
)
SELECT * FROM account_tree ORDER BY path;

-- 2. Find All VAT-Applicable Accounts
SELECT 
  account_code,
  account_name,
  account_name_ar,
  vat_rate
FROM v_vat_applicable_accounts
ORDER BY account_code;

-- 3. Get Vehicle-Specific Expense Accounts
SELECT 
  account_code,
  account_name_ar,
  cost_center_type,
  linked_entity_id
FROM chart_of_accounts
WHERE cost_center_type = 'vehicle'
  AND is_active = TRUE
ORDER BY account_code;

-- 4. List Customer Subsidiary Ledgers
SELECT 
  account_code,
  account_name_ar as customer_name,
  level
FROM chart_of_accounts
WHERE account_code LIKE '1210%'
  AND level >= 5
  AND is_active = TRUE
ORDER BY account_code;

-- 5. Get Fixed Assets with Depreciation Settings
SELECT 
  account_code,
  account_name_ar,
  depreciation_method,
  useful_life_years,
  salvage_value
FROM chart_of_accounts
WHERE depreciation_method IS NOT NULL
  AND is_active = TRUE
ORDER BY account_code;

-- 6. Balance Sheet Accounts Only
SELECT * FROM v_balance_sheet_accounts
ORDER BY account_code;

-- 7. Income Statement Accounts Only
SELECT * FROM v_income_statement_accounts
ORDER BY account_code;

-- 8. Find Accounts by Financial Statement Type
SELECT 
  financial_statement,
  COUNT(*) as account_count
FROM chart_of_accounts
WHERE is_active = TRUE
GROUP BY financial_statement
ORDER BY account_count DESC;

-- 9. Get Account Hierarchy Path for Specific Account
WITH RECURSIVE account_path AS (
  SELECT 
    id, account_code, account_name_ar, parent_id,
    account_name_ar as full_path
  FROM chart_of_accounts
  WHERE account_code = '31112403'  -- Change this code
  
  UNION ALL
  
  SELECT 
    c.id, c.account_code, c.account_name_ar, c.parent_id,
    c.account_name_ar || ' > ' || ap.full_path
  FROM chart_of_accounts c
  INNER JOIN account_path ap ON c.id = ap.parent_id
)
SELECT full_path FROM account_path WHERE parent_id IS NULL;

-- Expected output for 31112403:
-- مصادر الإنفاق > تكلفة المبيعات المباشرة > المصاريف المباشرة > المصاريف التشغيلية > محروقات السيارات > محروقات ايسوزو بكب 2011 / لوحة 5636

-- 10. Count Accounts by Level
SELECT 
  level,
  COUNT(*) as count
FROM chart_of_accounts
WHERE is_active = TRUE
GROUP BY level
ORDER BY level;

-- 11. Find Orphaned Accounts (if any)
SELECT 
  c.id,
  c.account_code,
  c.account_name_ar,
  c.parent_id
FROM chart_of_accounts c
WHERE c.parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM chart_of_accounts p WHERE p.id = c.parent_id
  );

-- 12. Get All Accounts with Cost Centers
SELECT 
  account_code,
  account_name_ar,
  cost_center_type,
  linked_entity_id
FROM v_cost_center_accounts
ORDER BY cost_center_type, account_code;

-- 13. Search Accounts by Arabic Name
SELECT 
  account_code,
  account_name,
  account_name_ar,
  level
FROM chart_of_accounts
WHERE account_name_ar ILIKE '%سيارات%'  -- Search for "vehicles"
  AND is_active = TRUE
ORDER BY account_code;

-- 14. Get VAT Summary Configuration
SELECT 
  account_code,
  account_name_ar,
  vat_rate,
  CASE 
    WHEN account_code = '2220101' THEN 'Output VAT (Sales)'
    WHEN account_code = '2220102' THEN 'Input VAT (Purchases)'
    WHEN account_code = '2220103' THEN 'Net VAT Payable'
    ELSE 'Other'
  END as vat_type
FROM chart_of_accounts
WHERE account_code LIKE '22201%'
ORDER BY account_code;

-- 15. Verify Parent-Child Relationships
SELECT 
  child.account_code as child_code,
  child.account_name_ar as child_name,
  parent.account_code as parent_code,
  parent.account_name_ar as parent_name,
  child.level as child_level,
  parent.level as parent_level,
  CASE 
    WHEN child.level = parent.level + 1 THEN '✅ Valid'
    ELSE '❌ Invalid'
  END as validation
FROM chart_of_accounts child
LEFT JOIN chart_of_accounts parent ON child.parent_id = parent.id
WHERE child.parent_id IS NOT NULL
  AND child.is_active = TRUE
ORDER BY child.account_code;

-- 16. Get Departmental Salary Accounts
SELECT 
  account_code,
  account_name_ar,
  cost_center_type
FROM chart_of_accounts
WHERE account_code LIKE '3131%' OR account_code LIKE '322%'
  AND is_active = TRUE
ORDER BY account_code;

-- 17. List All Rent-Related Accounts
SELECT 
  account_code,
  account_name_ar,
  financial_statement
FROM chart_of_accounts
WHERE account_name_ar ILIKE '%إيجار%'
  AND is_active = TRUE
ORDER BY account_code;

-- 18. Get Maintenance Expense Accounts
SELECT 
  account_code,
  account_name_ar,
  cost_center_type
FROM chart_of_accounts
WHERE account_name_ar ILIKE '%صيانة%'
  AND is_active = TRUE
ORDER BY account_code;

-- 19. Calculate Total Account Depth
WITH RECURSIVE depth_calc AS (
  SELECT id, parent_id, 1 as depth
  FROM chart_of_accounts
  WHERE parent_id IS NULL
  
  UNION ALL
  
  SELECT c.id, c.parent_id, dc.depth + 1
  FROM chart_of_accounts c
  INNER JOIN depth_calc dc ON c.parent_id = dc.id
)
SELECT MAX(depth) as max_depth FROM depth_calc;

-- 20. Export COA to CSV Format (for Excel)
COPY (
  SELECT 
    account_code,
    account_name,
    account_name_ar,
    account_type,
    level,
    normal_balance,
    is_vat_applicable,
    vat_rate,
    cost_center_type,
    financial_statement,
    report_category
  FROM chart_of_accounts
  WHERE is_active = TRUE
  ORDER BY account_code
) TO 'D:/coa_export.csv' WITH CSV HEADER;
