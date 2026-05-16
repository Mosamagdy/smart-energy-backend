BEGIN;

-- ============================================================================
-- Migration 022: Seed Payroll COA Accounts
-- ============================================================================
-- Inserts 17 accounts for payroll expenses and liabilities
-- Uses dynamic parent_id resolution via subqueries
-- ============================================================================

-- 1. Insert 'Salaries & Allowances (Ops)' accounts under '31'
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type,
  parent_id, level, normal_balance, financial_statement, report_category, is_active
) VALUES
  ('313', 'Salaries & Allowances (Ops)', 'الرواتب والبدلات التشغيلية', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '31'),
    3, 'debit', 'income_statement', 'payroll_expense', TRUE),
  ('31301', 'Sales Dept Salaries', 'رواتب قسم المبيعات', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '313'),
    4, 'debit', 'income_statement', 'payroll_expense', TRUE),
  ('31302', 'Design Dept Salaries', 'رواتب قسم التصميم', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '313'),
    4, 'debit', 'income_statement', 'payroll_expense', TRUE),
  ('31303', 'Operations Dept Salaries', 'رواتب قسم التنفيذ', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '313'),
    4, 'debit', 'income_statement', 'payroll_expense', TRUE),
  ('31304', 'Housing Allowance (Ops)', 'بدل سكن تشغيلي', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '313'),
    4, 'debit', 'income_statement', 'payroll_expense', TRUE),
  ('31305', 'Overtime (Ops)', 'إضافي تشغيلي', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '313'),
    4, 'debit', 'income_statement', 'payroll_expense', TRUE),
  ('31306', 'Sales Commissions', 'عمولات المبيعات', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '313'),
    4, 'debit', 'income_statement', 'payroll_expense', TRUE)
ON CONFLICT (account_code) DO NOTHING;

-- 2. Insert 'Admin Salaries' accounts under '32'
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type,
  parent_id, level, normal_balance, financial_statement, report_category, is_active
) VALUES
  ('322', 'Admin Salaries', 'رواتب الإدارة', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '32'),
    3, 'debit', 'income_statement', 'payroll_expense', TRUE),
  ('32201', 'Admin Staff Salaries', 'رواتب الإدارة', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '322'),
    4, 'debit', 'income_statement', 'payroll_expense', TRUE),
  ('32202', 'Housing Allowance (Admin)', 'بدل سكن إدارة', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '322'),
    4, 'debit', 'income_statement', 'payroll_expense', TRUE),
  ('32203', 'Leave Allowance (Admin)', 'بدل إجازة إدارة', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '322'),
    4, 'debit', 'income_statement', 'payroll_expense', TRUE),
  ('32204', 'Other Allowances (Admin)', 'بدلات أخرى', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '322'),
    4, 'debit', 'income_statement', 'payroll_expense', TRUE)
ON CONFLICT (account_code) DO NOTHING;

-- 3. Insert 'Accrued Salaries & Payables' under '22' (Current Liabilities)
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type,
  parent_id, level, normal_balance, financial_statement, report_category, is_active
) VALUES
  ('22301', 'Accrued Salaries', 'مصاريف الرواتب مستحقة', 'liability',
    (SELECT id FROM chart_of_accounts WHERE account_code = '22'),
    3, 'credit', 'balance_sheet', 'payroll_liability', TRUE),
  ('22401', 'Leave Allowance Payable', 'مخصص بدل إجازة مستحق', 'liability',
    (SELECT id FROM chart_of_accounts WHERE account_code = '22'),
    3, 'credit', 'balance_sheet', 'payroll_liability', TRUE),
  ('22402', 'Ticket Allowance Payable', 'مخصص بدل تذاكر مستحق', 'liability',
    (SELECT id FROM chart_of_accounts WHERE account_code = '22'),
    3, 'credit', 'balance_sheet', 'payroll_liability', TRUE)
ON CONFLICT (account_code) DO NOTHING;

-- 4. Insert 'End of Service Provision' under '23' (Non-current Liabilities)
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type,
  parent_id, level, normal_balance, financial_statement, report_category, is_active
) VALUES
  ('23201', 'End of Service Provision', 'مستحقات مكافأة نهاية الخدمة', 'liability',
    (SELECT id FROM chart_of_accounts WHERE account_code = '23'),
    3, 'credit', 'balance_sheet', 'payroll_liability', TRUE)
ON CONFLICT (account_code) DO NOTHING;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  inserted_count INTEGER;
  parent_check INTEGER;
BEGIN
  -- Check total count
  SELECT COUNT(*) INTO inserted_count
  FROM chart_of_accounts
  WHERE account_code IN (
    '313', '31301', '31302', '31303', '31304', '31305', '31306',
    '322', '32201', '32202', '32203', '32204',
    '22301', '22401', '22402',
    '23201'
  );

  IF inserted_count < 16 THEN
    RAISE EXCEPTION '❌ Expected 16 accounts but found %. Check for missing parent accounts.', inserted_count;
  END IF;

  -- Verify parent-child relationships
  SELECT COUNT(*) INTO parent_check
  FROM chart_of_accounts c
  WHERE c.account_code IN ('313', '322')
    AND c.parent_id IS NOT NULL;

  IF parent_check < 2 THEN
    RAISE EXCEPTION '❌ Parent accounts missing. Expected 2 but found %', parent_check;
  END IF;

  RAISE NOTICE '✅ Migration 022: Successfully verified % payroll accounts', inserted_count;
END $$;

COMMIT;
