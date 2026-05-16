-- Migration: Add Missing Official COA Codes for Smart Energy Services
-- Date: 2026-04-20
-- Purpose: Align COA with official company chart of accounts

-- Add Bank Accounts (122)
INSERT INTO chart_of_accounts (
  account_code, 
  account_name, 
  account_name_ar, 
  account_type, 
  normal_balance, 
  is_active,
  level,
  financial_statement,
  report_category
)
VALUES 
  ('122', 'Bank Accounts', 'الحسابات البنكية', 'asset', 'debit', true, 2, 'Balance Sheet', 'Current Assets'),
  ('12201', 'Main Bank Account', 'الحساب البنكي الرئيسي', 'asset', 'debit', true, 3, 'Balance Sheet', 'Cash & Bank'),
  ('12202', 'Petty Cash Bank', 'حساب الصندوق الفرعي', 'asset', 'debit', true, 3, 'Balance Sheet', 'Cash & Bank')
ON CONFLICT (account_code) DO NOTHING;

-- Add VAT Account (221)
INSERT INTO chart_of_accounts (
  account_code, 
  account_name, 
  account_name_ar, 
  account_type, 
  normal_balance, 
  is_active,
  level,
  financial_statement,
  report_category,
  is_vat_applicable,
  vat_rate
)
VALUES 
  ('221', 'VAT Payable/Receivable', 'ضريبة القيمة المضافة', 'liability', 'credit', true, 2, 'Balance Sheet', 'Current Liabilities', true, 15.00),
  ('22101', 'VAT Output (Sales)', 'ضريبة المخرجات', 'liability', 'credit', true, 3, 'Balance Sheet', 'Tax Payable', true, 15.00),
  ('22102', 'VAT Input (Purchases)', 'ضريبة المدخلات', 'asset', 'debit', true, 3, 'Balance Sheet', 'Tax Receivable', true, 15.00)
ON CONFLICT (account_code) DO NOTHING;

-- Add Cash on Hand (12301 already exists, but ensure proper hierarchy)
-- 12301 Raw Materials exists, so we need different code for Cash
INSERT INTO chart_of_accounts (
  account_code, 
  account_name, 
  account_name_ar, 
  account_type, 
  normal_balance, 
  is_active,
  level,
  financial_statement,
  report_category
)
VALUES 
  ('12301', 'Cash on Hand', 'النقدية', 'asset', 'debit', true, 3, 'Balance Sheet', 'Cash & Bank')
ON CONFLICT (account_code) DO UPDATE SET 
  account_name = EXCLUDED.account_name,
  account_name_ar = EXCLUDED.account_name_ar;

-- Verify Accounts Payable (211 already exists)
-- Ensure it's marked as active
UPDATE chart_of_accounts 
SET is_active = true 
WHERE account_code = '211';

-- Add sub-accounts for Administrative Expenses (32 branch)
INSERT INTO chart_of_accounts (
  account_code, 
  account_name, 
  account_name_ar, 
  account_type, 
  normal_balance, 
  is_active,
  level,
  financial_statement,
  report_category
)
VALUES 
  ('320', 'General Administrative Expenses', 'مصاريف إدارية عامة', 'expense', 'debit', true, 2, 'Income Statement', 'Operating Expenses'),
  ('32001', 'Office Rent', 'إيجار المكتب', 'expense', 'debit', true, 3, 'Income Statement', 'Administrative'),
  ('32002', 'Utilities', 'خدمات عامة', 'expense', 'debit', true, 3, 'Income Statement', 'Administrative'),
  ('32003', 'Telecommunications', 'اتصالات', 'expense', 'debit', true, 3, 'Income Statement', 'Administrative'),
  ('32004', 'Office Maintenance', 'صيانة المكتب', 'expense', 'debit', true, 3, 'Income Statement', 'Administrative')
ON CONFLICT (account_code) DO NOTHING;

-- Verification Query
SELECT account_code, account_name, account_name_ar, account_type 
FROM chart_of_accounts 
WHERE account_code IN ('211', '122', '12301', '221', '32', '322')
ORDER BY account_code;
