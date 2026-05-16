-- Migration: Add Account 4113 (الحسم الممنوح / Discounts Allowed)
-- Purpose: Create the discount account required for sales invoice discount functionality
-- Date: 2026-04-24

-- Step 1: Ensure parent account 411 (صافي المبيعات / Net Sales) exists
INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, is_active, financial_statement)
SELECT '411', 'Net Sales', 'صافي المبيعات', 'revenue', 
       (SELECT id FROM chart_of_accounts WHERE account_code = '41'),
       3, 'credit', TRUE, 'income_statement'
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts WHERE account_code = '411'
);

-- Step 2: Ensure account 4111 (Sales Revenue) exists
INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, is_active, financial_statement)
SELECT '4111', 'Sales Revenue', 'إيرادات المبيعات', 'revenue',
       (SELECT id FROM chart_of_accounts WHERE account_code = '411'),
       4, 'credit', TRUE, 'income_statement'
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts WHERE account_code = '4111'
);

-- Step 3: Ensure account 4112 (Sales Returns) exists
INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, is_active, financial_statement)
SELECT '4112', 'Sales Returns', 'مردودات المبيعات', 'revenue',
       (SELECT id FROM chart_of_accounts WHERE account_code = '411'),
       4, 'debit', TRUE, 'income_statement'
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts WHERE account_code = '4112'
);

-- Step 4: CREATE Account 4113 (الحسم الممنوح / Discounts Allowed)
-- This is a contra-revenue account (normal balance is DEBIT)
INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, is_active, financial_statement)
SELECT '4113', 'Discounts Allowed', 'الحسم الممنوح', 'revenue',
       (SELECT id FROM chart_of_accounts WHERE account_code = '411'),
       4, 'debit', TRUE, 'income_statement'
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts WHERE account_code = '4113'
);

-- Verification: Show the created accounts
SELECT 
  account_code,
  account_name,
  account_name_ar,
  account_type,
  normal_balance,
  financial_statement
FROM chart_of_accounts
WHERE account_code IN ('411', '4111', '4112', '4113')
ORDER BY account_code;
