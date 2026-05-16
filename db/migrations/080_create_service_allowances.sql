-- Smart Energy ERP
-- Migration 080: Create Housing & Overtime Allowance Accounts for Services
-- Separates allowance accounts from salary accounts

BEGIN;

-- Create Housing Allowance accounts for each service (314xx range)
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type, 
  normal_balance, financial_statement, report_category, level, is_active
) VALUES
  ('31401', 'Industrial Automation Housing', 'بدل سكن الأتمتة الصناعية', 'expense', 'debit', 'income_statement', 'payroll_expense', 4, true),
  ('31402', 'Digital Transformation Housing', 'بدل سكن التحول الرقمي', 'expense', 'debit', 'income_statement', 'payroll_expense', 4, true),
  ('31403', 'Execution & Operations Housing', 'بدل سكن التنفيذ والتشغيل', 'expense', 'debit', 'income_statement', 'payroll_expense', 4, true),
  ('31404', 'Infrastructure Housing', 'بدل سكن البنية التحتية', 'expense', 'debit', 'income_statement', 'payroll_expense', 4, true),
  ('31405', 'Smart Buildings Housing', 'بدل سكن المباني الذكية', 'expense', 'debit', 'income_statement', 'payroll_expense', 4, true),
  ('31406', 'Energy Efficiency Housing', 'بدل سكن كفاءة الطاقة', 'expense', 'debit', 'income_statement', 'payroll_expense', 4, true),
  ('31407', 'Renewable Energy Housing', 'بدل سكن الطاقة المتجددة', 'expense', 'debit', 'income_statement', 'payroll_expense', 4, true)
ON CONFLICT (account_code) DO UPDATE 
  SET account_name = EXCLUDED.account_name, 
      account_name_ar = EXCLUDED.account_name_ar, 
      is_active = true;

-- Create Overtime accounts for each service (315xx range)
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type, 
  normal_balance, financial_statement, report_category, level, is_active
) VALUES
  ('31501', 'Industrial Automation Overtime', 'إضافي الأتمتة الصناعية', 'expense', 'debit', 'income_statement', 'payroll_expense', 4, true),
  ('31502', 'Digital Transformation Overtime', 'إضافي التحول الرقمي', 'expense', 'debit', 'income_statement', 'payroll_expense', 4, true),
  ('31503', 'Execution & Operations Overtime', 'إضافي التنفيذ والتشغيل', 'expense', 'debit', 'income_statement', 'payroll_expense', 4, true),
  ('31504', 'Infrastructure Overtime', 'إضافي البنية التحتية', 'expense', 'debit', 'income_statement', 'payroll_expense', 4, true),
  ('31506', 'Smart Buildings Overtime', 'إضافي المباني الذكية', 'expense', 'debit', 'income_statement', 'payroll_expense', 4, true),
  ('31507', 'Energy Efficiency Overtime', 'إضافي كفاءة الطاقة', 'expense', 'debit', 'income_statement', 'payroll_expense', 4, true),
  ('31508', 'Renewable Energy Overtime', 'إضافي الطاقة المتجددة', 'expense', 'debit', 'income_statement', 'payroll_expense', 4, true)
ON CONFLICT (account_code) DO UPDATE 
  SET account_name = EXCLUDED.account_name, 
      account_name_ar = EXCLUDED.account_name_ar, 
      is_active = true;

-- Update GOSI Expense account code (move from 31401 to 31601 to avoid conflict)
UPDATE chart_of_accounts 
SET account_code = '31601'
WHERE account_code = '31401' AND account_name ILIKE '%gosi%';

-- Verify
SELECT 'Service Housing Accounts' as info;
SELECT account_code, account_name, account_name_ar
FROM chart_of_accounts
WHERE account_code LIKE '314%' AND is_active = true
ORDER BY account_code;

SELECT 'Service Overtime Accounts' as info;
SELECT account_code, account_name, account_name_ar
FROM chart_of_accounts
WHERE account_code LIKE '315%' AND report_category = 'payroll_expense' AND is_active = true
ORDER BY account_code;

COMMIT;
