-- Smart Energy ERP
-- Migration 078: Add GOSI Accounts for Payroll
-- Adds GOSI Expense and GOSI Payable accounts

BEGIN;

-- Add GOSI Expense account (employer contribution)
INSERT INTO chart_of_accounts (
  account_code, 
  account_name, 
  account_name_ar, 
  account_type, 
  normal_balance, 
  financial_statement,
  report_category,
  level,
  is_active
) VALUES (
  '31401',
  'GOSI Employer Expense',
  'مصروف التأمينات الاجتماعية - صاحب العمل',
  'expense',
  'debit',
  'income_statement',
  'payroll_expense',
  4,
  true
) ON CONFLICT (account_code) DO NOTHING;

-- Add GOSI Payable account (liability)
INSERT INTO chart_of_accounts (
  account_code, 
  account_name, 
  account_name_ar, 
  account_type, 
  normal_balance, 
  financial_statement,
  report_category,
  level,
  is_active
) VALUES (
  '22302',
  'GOSI Payable',
  'التأمينات الاجتماعية مستحقة',
  'liability',
  'credit',
  'balance_sheet',
  'accrued_expenses',
  4,
  true
) ON CONFLICT (account_code) DO NOTHING;

-- Verify
SELECT account_code, account_name, account_name_ar, account_type, normal_balance
FROM chart_of_accounts
WHERE account_code IN ('31401', '22302')
ORDER BY account_code;

COMMIT;
