-- Smart Energy ERP
-- Migration 079: Update to 7 Core Services and Clean Up COA Duplicates
-- Replaces example departments with actual business lines

BEGIN;

-- ============================================================================
-- PART 1: Update Departments to 7 Core Services
-- ============================================================================

-- Deactivate all existing departments
UPDATE departments SET is_active = false;

-- Insert/Update the 7 Core Services
INSERT INTO departments (name, description, is_active) VALUES
  ('industrial_automation', 'خدمات الأتمتة الصناعية والتحكم الصناعي', true),
  ('digital_transformation', 'التحول الرقمي', true),
  ('execution_operations_maintenance', 'خدمات التنفيذ والتشغيل والصيانة', true),
  ('infrastructure_smart_cities', 'خدمات البنية التحتية والمدن الذكية', true),
  ('smart_buildings_homes', 'خدمات المباني والمنازل الذكية', true),
  ('energy_efficiency', 'خدمات كفاءة الطاقة', true),
  ('renewable_energy_storage', 'خدمات الطاقة المتجددة وأنظمة تخزين الطاقة', true)
ON CONFLICT (name) DO UPDATE 
  SET description = EXCLUDED.description, is_active = true;

-- ============================================================================
-- PART 2: Create COA Accounts for 7 Core Services (313xxx range)
-- ============================================================================

-- 31301: Industrial Automation Salaries
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type, 
  normal_balance, financial_statement, report_category, level, is_active
) VALUES (
  '31301', 'Industrial Automation Salaries', 'رواتب الأتمتة الصناعية', 
  'expense', 'debit', 'income_statement', 'payroll_expense', 4, true
) ON CONFLICT (account_code) DO UPDATE 
  SET account_name = EXCLUDED.account_name, 
      account_name_ar = EXCLUDED.account_name_ar, 
      is_active = true;

-- 31302: Digital Transformation Salaries
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type, 
  normal_balance, financial_statement, report_category, level, is_active
) VALUES (
  '31302', 'Digital Transformation Salaries', 'رواتب التحول الرقمي', 
  'expense', 'debit', 'income_statement', 'payroll_expense', 4, true
) ON CONFLICT (account_code) DO UPDATE 
  SET account_name = EXCLUDED.account_name, 
      account_name_ar = EXCLUDED.account_name_ar, 
      is_active = true;

-- 31303: Execution & Operations Salaries
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type, 
  normal_balance, financial_statement, report_category, level, is_active
) VALUES (
  '31303', 'Execution & Operations Salaries', 'رواتب التنفيذ والتشغيل', 
  'expense', 'debit', 'income_statement', 'payroll_expense', 4, true
) ON CONFLICT (account_code) DO UPDATE 
  SET account_name = EXCLUDED.account_name, 
      account_name_ar = EXCLUDED.account_name_ar, 
      is_active = true;

-- 31304: Infrastructure & Smart Cities Salaries
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type, 
  normal_balance, financial_statement, report_category, level, is_active
) VALUES (
  '31304', 'Infrastructure & Smart Cities Salaries', 'رواتب البنية التحتية والمدن الذكية', 
  'expense', 'debit', 'income_statement', 'payroll_expense', 4, true
) ON CONFLICT (account_code) DO UPDATE 
  SET account_name = EXCLUDED.account_name, 
      account_name_ar = EXCLUDED.account_name_ar, 
      is_active = true;

-- 31305: Smart Buildings & Homes Salaries
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type, 
  normal_balance, financial_statement, report_category, level, is_active
) VALUES (
  '31305', 'Smart Buildings & Homes Salaries', 'رواتب المباني والمنازل الذكية', 
  'expense', 'debit', 'income_statement', 'payroll_expense', 4, true
) ON CONFLICT (account_code) DO UPDATE 
  SET account_name = EXCLUDED.account_name, 
      account_name_ar = EXCLUDED.account_name_ar, 
      is_active = true;

-- 31306: Energy Efficiency Salaries
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type, 
  normal_balance, financial_statement, report_category, level, is_active
) VALUES (
  '31306', 'Energy Efficiency Salaries', 'رواتب كفاءة الطاقة', 
  'expense', 'debit', 'income_statement', 'payroll_expense', 4, true
) ON CONFLICT (account_code) DO UPDATE 
  SET account_name = EXCLUDED.account_name, 
      account_name_ar = EXCLUDED.account_name_ar, 
      is_active = true;

-- 31307: Renewable Energy Salaries
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type, 
  normal_balance, financial_statement, report_category, level, is_active
) VALUES (
  '31307', 'Renewable Energy Salaries', 'رواتب الطاقة المتجددة', 
  'expense', 'debit', 'income_statement', 'payroll_expense', 4, true
) ON CONFLICT (account_code) DO UPDATE 
  SET account_name = EXCLUDED.account_name, 
      account_name_ar = EXCLUDED.account_name_ar, 
      is_active = true;

-- ============================================================================
-- PART 3: Deactivate Duplicate/Old Salary Accounts
-- ============================================================================

-- Deactivate old 311xx accounts (Sales Staff, Installation Staff)
UPDATE chart_of_accounts 
SET is_active = false 
WHERE account_code IN ('311', '31101', '31102', '312', '31201', '31202', '31203', '31204');

-- Deactivate old 313xx utility accounts that conflict with new service codes
UPDATE chart_of_accounts 
SET is_active = false, account_code = '31505'
WHERE account_code = '313' AND account_name = 'Utilities';

UPDATE chart_of_accounts 
SET is_active = false 
WHERE account_code IN ('31304', '31305', '31306') 
  AND account_code NOT IN ('31304', '31305', '31306'); -- Keep new service accounts

-- Deactivate old Sales Commissions if it conflicts
UPDATE chart_of_accounts 
SET is_active = false 
WHERE account_code = '31306' AND account_name ILIKE '%commission%';

-- ============================================================================
-- PART 4: Verification Queries
-- ============================================================================

-- Show active departments
SELECT 'Active Departments' as info;
SELECT id, name, description, is_active
FROM departments
WHERE is_active = true
ORDER BY id;

-- Show active salary accounts for services
SELECT 'Service Salary Accounts' as info;
SELECT account_code, account_name, account_name_ar, account_type, is_active
FROM chart_of_accounts
WHERE account_code LIKE '313%' 
  AND report_category = 'payroll_expense'
  AND is_active = true
ORDER BY account_code;

-- Show active admin salary accounts
SELECT 'Admin Salary Accounts' as info;
SELECT account_code, account_name, account_name_ar, account_type, is_active
FROM chart_of_accounts
WHERE account_code LIKE '322%' 
  AND is_active = true
ORDER BY account_code;

COMMIT;
