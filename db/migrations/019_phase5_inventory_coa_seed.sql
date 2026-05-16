BEGIN;

-- ============================================================================
-- Migration 019: Seed Inventory & Purchasing COA Accounts
-- ============================================================================
-- Inserts 18 accounts for inventory, payables, and cost of revenue
-- Uses dynamic parent_id resolution via subqueries
-- ============================================================================

-- 1. Insert 'Current Assets - Inventory' accounts under '12'
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type,
  parent_id, level, normal_balance, financial_statement, report_category, is_active
) VALUES
  ('123', 'Inventory', 'المخزون', 'asset',
    (SELECT id FROM chart_of_accounts WHERE account_code = '12'),
    3, 'debit', 'balance_sheet', 'inventory', TRUE),
  ('12301', 'Raw Materials', 'مواد خام', 'asset',
    (SELECT id FROM chart_of_accounts WHERE account_code = '123'),
    4, 'debit', 'balance_sheet', 'inventory', TRUE),
  ('12302', 'Solar Panels Stock', 'مخزون الألواح الشمسية', 'asset',
    (SELECT id FROM chart_of_accounts WHERE account_code = '123'),
    4, 'debit', 'balance_sheet', 'inventory', TRUE),
  ('12303', 'Inverters Stock', 'مخزون المحولات', 'asset',
    (SELECT id FROM chart_of_accounts WHERE account_code = '123'),
    4, 'debit', 'balance_sheet', 'inventory', TRUE),
  ('12304', 'Cables & Accessories', 'كابلات وملحقات', 'asset',
    (SELECT id FROM chart_of_accounts WHERE account_code = '123'),
    4, 'debit', 'balance_sheet', 'inventory', TRUE),
  ('12305', 'Work in Progress', 'إنتاج تحت التشغيل', 'asset',
    (SELECT id FROM chart_of_accounts WHERE account_code = '123'),
    4, 'debit', 'balance_sheet', 'inventory', TRUE)
ON CONFLICT (account_code) DO NOTHING;

-- 2. Insert 'Accounts Payable' accounts under '21'
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type,
  parent_id, level, normal_balance, financial_statement, report_category, is_active
) VALUES
  ('213', 'Accounts Payable', 'الموردون / الدائنون', 'liability',
    (SELECT id FROM chart_of_accounts WHERE account_code = '21'),
    3, 'credit', 'balance_sheet', 'accounts_payable', TRUE),
  ('21301', 'Local Suppliers Payable', 'موردون محليون', 'liability',
    (SELECT id FROM chart_of_accounts WHERE account_code = '213'),
    4, 'credit', 'balance_sheet', 'accounts_payable', TRUE),
  ('21302', 'Foreign Suppliers Payable', 'موردون خارجيون', 'liability',
    (SELECT id FROM chart_of_accounts WHERE account_code = '213'),
    4, 'credit', 'balance_sheet', 'accounts_payable', TRUE)
ON CONFLICT (account_code) DO NOTHING;

-- 3. Insert 'Cost of Revenue' accounts under '3'
-- First create parent level-2 account
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type,
  parent_id, level, normal_balance, financial_statement, report_category, is_active
) VALUES
  ('33', 'Cost of Revenue', 'تكلفة الإيراد', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '3'),
    2, 'debit', 'income_statement', 'cost_of_revenue', TRUE)
ON CONFLICT (account_code) DO NOTHING;

-- Then insert level-3 and level-4 accounts
INSERT INTO chart_of_accounts (
  account_code, account_name, account_name_ar, account_type,
  parent_id, level, normal_balance, financial_statement, report_category, is_active
) VALUES
  ('331', 'Materials Cost', 'تكلفة المواد', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '33'),
    3, 'debit', 'income_statement', 'cost_of_revenue', TRUE),
  ('33101', 'Solar Panels Cost', 'تكلفة الألواح الشمسية', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '331'),
    4, 'debit', 'income_statement', 'cost_of_revenue', TRUE),
  ('33102', 'Inverters Cost', 'تكلفة المحولات', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '331'),
    4, 'debit', 'income_statement', 'cost_of_revenue', TRUE),
  ('33103', 'Cables & Accessories Cost', 'تكلفة الكابلات', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '331'),
    4, 'debit', 'income_statement', 'cost_of_revenue', TRUE),
  ('332', 'Subcontractors Cost', 'تكلفة مقاولي الباطن', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '33'),
    3, 'debit', 'income_statement', 'cost_of_revenue', TRUE),
  ('33201', 'Installation Labor', 'عمالة تركيب', 'expense',
    (SELECT id FROM chart_of_accounts WHERE account_code = '332'),
    4, 'debit', 'income_statement', 'cost_of_revenue', TRUE)
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
    '123', '12301', '12302', '12303', '12304', '12305',
    '213', '21301', '21302',
    '33', '331', '33101', '33102', '33103', '332', '33201'
  );

  IF inserted_count < 16 THEN
    RAISE EXCEPTION '❌ Expected 16 accounts but found %. Check for missing parent accounts.', inserted_count;
  END IF;

  -- Verify parent-child relationships
  SELECT COUNT(*) INTO parent_check
  FROM chart_of_accounts c
  WHERE c.account_code IN ('123', '213', '33', '331', '332')
    AND c.parent_id IS NOT NULL;

  IF parent_check < 5 THEN
    RAISE EXCEPTION '❌ Parent accounts missing. Expected 5 but found %', parent_check;
  END IF;

  RAISE NOTICE '✅ Migration 019: Successfully verified % inventory & purchasing accounts', inserted_count;
END $$;

COMMIT;
