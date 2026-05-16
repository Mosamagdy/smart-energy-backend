-- ============================================================================
-- CRITICAL FIX: Rebuild Chart of Accounts with Correct Parent IDs
-- This fixes the corrupted COA where parent_id values are mismatched
-- ============================================================================

BEGIN;

-- STEP 1: Clear all existing COA data
TRUNCATE TABLE chart_of_accounts RESTART IDENTITY CASCADE;

-- STEP 2: Insert Level 1 - Main Categories (No parent)
INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
('1', 'Assets', 'الأصول', 'asset', NULL, 1, 'debit', 'balance_sheet', 'asset', TRUE),
('2', 'Liabilities', 'الخصوم', 'liability', NULL, 1, 'credit', 'balance_sheet', 'liability', TRUE),
('3', 'Expenses', 'مصادر الإنفاق', 'expense', NULL, 1, 'debit', 'income_statement', 'expense', TRUE),
('4', 'Revenue', 'مصادر الدخل', 'revenue', NULL, 1, 'credit', 'income_statement', 'revenue', TRUE);

-- STEP 3: Insert Level 2 - Sub-categories (Reference Level 1 by account_code)
INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- Assets children (parent: '1')
('12', 'Current Assets', 'الأصول المتداولة', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1'), 2, 'debit', 'balance_sheet', 'current_asset', TRUE),
('11', 'Fixed Assets', 'الأصول الثابتة', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1'), 2, 'debit', 'balance_sheet', 'fixed_asset', TRUE),

-- Liabilities children (parent: '2')
('22', 'Long-term Liabilities', 'الخصوم طويلة الأجل', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '2'), 2, 'credit', 'balance_sheet', 'long_term_liability', TRUE),
('21', 'Current Liabilities', 'الخصوم المتداولة', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '2'), 2, 'credit', 'balance_sheet', 'current_liability', TRUE),

-- Expenses children (parent: '3')
('31', 'Operating Expenses', 'مصاريف التشغيل', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '3'), 2, 'debit', 'income_statement', 'operating_expense', TRUE),
('32', 'Administrative Expenses', 'مصاريف إدارية', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '3'), 2, 'debit', 'income_statement', 'administrative_expense', TRUE),

-- Revenue children (parent: '4')
('41', 'Sales Revenue', 'إيرادات المبيعات', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4'), 2, 'credit', 'income_statement', 'sales_revenue', TRUE),
('42', 'Other Income', 'إيرادات أخرى', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4'), 2, 'credit', 'income_statement', 'other_income', TRUE);

-- STEP 4: Insert Level 3 - Detail accounts (Reference Level 2)
INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- Current Assets children (parent: '12')
('121', 'Accounts Receivable', 'العملاء', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '12'), 3, 'debit', 'balance_sheet', 'accounts_receivable', TRUE),
('124', 'Bank & Cash', 'البنك والصندوق', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '12'), 3, 'debit', 'balance_sheet', 'cash_and_bank', TRUE),

-- Current Liabilities children (parent: '21')
('211', 'Accounts Payable', 'الدائنون', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '21'), 3, 'credit', 'balance_sheet', 'accounts_payable', TRUE),

-- Long-term Liabilities children (parent: '22')
('222', 'VAT Payable', 'ضريبة القيمة المضافة', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '22'), 3, 'credit', 'balance_sheet', 'tax_payable', TRUE),

-- Operating Expenses children (parent: '31')
('311', 'Salaries & Wages', 'رواتب وأجور', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '31'), 3, 'debit', 'income_statement', 'salaries', TRUE),
('315', 'Fuel & Gas', 'وقود ومحروقات', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '31'), 3, 'debit', 'income_statement', 'fuel', TRUE),

-- Sales Revenue children (parent: '41')
('412', 'Project Contracts Revenue', 'إيرادات عقود المشاريع', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '41'), 3, 'credit', 'income_statement', 'project_revenue', TRUE);

-- STEP 5: Insert Level 4 - Specific accounts (Reference Level 3)
INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active, is_vat_applicable, vat_rate) VALUES
-- VAT accounts (parent: '222' - VAT Payable under Liabilities)
('2220101', 'VAT - Sales (Output)', 'ضريبة القيمة المضافة - مبيعات', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '222'), 4, 'credit', 'balance_sheet', 'output_vat', TRUE, TRUE, 15.00),
('2220102', 'VAT - Purchases (Input)', 'ضريبة القيمة المضافة - مشتريات', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '222'), 4, 'credit', 'balance_sheet', 'input_vat', TRUE, TRUE, 15.00),
('2220103', 'Net VAT Payable', 'ضريبة القيمة المضافة المستحقة', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '222'), 4, 'credit', 'balance_sheet', 'net_vat_payable', TRUE, TRUE, 15.00),

-- Bank accounts (parent: '124')
('12401', 'Bank - Al Rajhi', 'البنك - الراجحي', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '124'), 4, 'debit', 'balance_sheet', 'bank_account', TRUE, FALSE, 0),
('12403', 'Main Cash', 'الصندوق الرئيسي', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '124'), 4, 'debit', 'balance_sheet', 'cash', TRUE, FALSE, 0),

-- Project Revenue accounts (parent: '412')
('4120', 'Project Revenue', 'إيرادات مشروع', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '412'), 4, 'credit', 'income_statement', 'project_revenue', TRUE, FALSE, 0);

-- STEP 6: Add essential expense accounts
INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active, cost_center_type) VALUES
('31101', 'Sales Staff Salaries', 'رواتب المبيعات', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '311'), 4, 'debit', 'income_statement', 'salaries', TRUE, 'department'),
('31102', 'Installation Staff Salaries', 'رواتب التركيب', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '311'), 4, 'debit', 'income_statement', 'salaries', TRUE, 'department'),
('312', 'Rent Expenses', 'إيجارات', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '31'), 3, 'debit', 'income_statement', 'rent', TRUE, NULL),
('313', 'Utilities', 'كهرباء وماء', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '31'), 3, 'debit', 'income_statement', 'utilities', TRUE, NULL),
('314', 'Vehicle Maintenance', 'صيانة مركبات', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '31'), 3, 'debit', 'income_statement', 'vehicle_maintenance', TRUE, 'vehicle'),
('321', 'Office Supplies', 'مصاريف مكتبية', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '32'), 3, 'debit', 'income_statement', 'office_supplies', TRUE, NULL);

-- STEP 7: Verification
DO $$
DECLARE
  ar_parent_type VARCHAR(10);
  revenue_parent_type VARCHAR(10);
  vat_parent_type VARCHAR(10);
  orphaned_count INTEGER;
BEGIN
  -- Verify Account 121 (AR) parent is Asset (1)
  SELECT parent_account.account_type INTO ar_parent_type
  FROM chart_of_accounts acc
  JOIN chart_of_accounts parent_account ON acc.parent_id = parent_account.id
  WHERE acc.account_code = '121';
  
  -- Verify Account 4120 (Revenue) parent is Revenue (4)
  SELECT parent_account.account_type INTO revenue_parent_type
  FROM chart_of_accounts acc
  JOIN chart_of_accounts parent_account ON acc.parent_id = parent_account.id
  WHERE acc.account_code = '4120';
  
  -- Verify Account 2220101 (VAT) parent is Liability (2)
  SELECT parent_account.account_type INTO vat_parent_type
  FROM chart_of_accounts acc
  JOIN chart_of_accounts parent_account ON acc.parent_id = parent_account.id
  WHERE acc.account_code = '2220101';
  
  -- Check for orphaned accounts
  SELECT COUNT(*) INTO orphaned_count
  FROM chart_of_accounts c
  LEFT JOIN chart_of_accounts p ON c.parent_id = p.id
  WHERE c.parent_id IS NOT NULL AND p.id IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ COA REBUILD COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Critical Account Verification:';
  RAISE NOTICE '  Account 121 (AR) parent type: % (Expected: asset)', ar_parent_type;
  RAISE NOTICE '  Account 4120 (Revenue) parent type: % (Expected: revenue)', revenue_parent_type;
  RAISE NOTICE '  Account 2220101 (VAT) parent type: % (Expected: liability)', vat_parent_type;
  RAISE NOTICE '';
  RAISE NOTICE 'Orphaned accounts: %', orphaned_count;
  RAISE NOTICE '';
  
  -- Validate
  IF ar_parent_type != 'asset' THEN
    RAISE EXCEPTION '❌ Account 121 parent is %, expected asset!', ar_parent_type;
  END IF;
  
  IF revenue_parent_type != 'revenue' THEN
    RAISE EXCEPTION '❌ Account 4120 parent is %, expected revenue!', revenue_parent_type;
  END IF;
  
  IF vat_parent_type != 'liability' THEN
    RAISE EXCEPTION '❌ Account 2220101 parent is %, expected liability!', vat_parent_type;
  END IF;
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION '❌ Found % orphaned accounts!', orphaned_count;
  END IF;
  
  RAISE NOTICE '✅ All parent-child relationships verified!';
  RAISE NOTICE '✅ COA is ready for invoice generation!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

COMMIT;
