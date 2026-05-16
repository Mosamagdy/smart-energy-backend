-- ============================================================================
-- Phase 4: Fixed Assets COA Seed Migration
-- Inserts 24 fixed asset accounts (tangible assets, accumulated depreciation, depreciation expenses)
-- ============================================================================

BEGIN;

-- ============================================================================
-- Level 3 & 4: Tangible Fixed Assets (under '11')
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- 111. Tangible Fixed Assets (parent: '11')
('111', 'Tangible Fixed Assets', 'الموجودات الثابتة', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '11'), 3, 'debit', 'balance_sheet', 'fixed_asset', TRUE),

-- 11101. Leasehold Improvements (parent: '111')
('11101', 'Leasehold Improvements', 'صيانة وتعديلات المباني', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '111'), 4, 'debit', 'balance_sheet', 'fixed_asset', TRUE),

-- 11102. Furniture & Office Equipment (parent: '111')
('11102', 'Furniture & Office Equipment', 'أثاث وتجهيزات مكتبية', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '111'), 4, 'debit', 'balance_sheet', 'fixed_asset', TRUE),

-- 11103. Vehicles & Transport (parent: '111')
('11103', 'Vehicles & Transport', 'وسائط النقل والسيارات', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '111'), 4, 'debit', 'balance_sheet', 'fixed_asset', TRUE),

-- 11104. Machinery & Equipment (parent: '111')
('11104', 'Machinery & Equipment', 'آلات ومعدات التشغيل', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '111'), 4, 'debit', 'balance_sheet', 'fixed_asset', TRUE),

-- 11105. Computer Equipment (parent: '111')
('11105', 'Computer Equipment', 'تجهيزات الكمبيوتر', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '111'), 4, 'debit', 'balance_sheet', 'fixed_asset', TRUE),

-- 11106. Tools & Instruments (parent: '111')
('11106', 'Tools & Instruments', 'العدد والأدوات', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '111'), 4, 'debit', 'balance_sheet', 'fixed_asset', TRUE),

-- 11107. Accounting Software (parent: '111')
('11107', 'Accounting Software', 'برامج المحاسبة', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '111'), 4, 'debit', 'balance_sheet', 'fixed_asset', TRUE)

ON CONFLICT (account_code) DO NOTHING;

-- ============================================================================
-- Level 3 & 4: Accumulated Depreciation (under '11')
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- 112. Accumulated Depreciation (parent: '11')
('112', 'Accumulated Depreciation', 'مجمع إهلاك الأصول الثابتة', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '11'), 3, 'credit', 'balance_sheet', 'accumulated_depreciation', TRUE),

-- 11201. Accum. Depr - Leasehold (parent: '112')
('11201', 'Accum. Depr - Leasehold', 'مجمع إهلاك تحسينات المباني', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '112'), 4, 'credit', 'balance_sheet', 'accumulated_depreciation', TRUE),

-- 11202. Accum. Depr - Furniture (parent: '112')
('11202', 'Accum. Depr - Furniture', 'مجمع إهلاك أثاث ومكتبية', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '112'), 4, 'credit', 'balance_sheet', 'accumulated_depreciation', TRUE),

-- 11203. Accum. Depr - Vehicles (parent: '112')
('11203', 'Accum. Depr - Vehicles', 'مجمع إهلاك السيارات', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '112'), 4, 'credit', 'balance_sheet', 'accumulated_depreciation', TRUE),

-- 11204. Accum. Depr - Machinery (parent: '112')
('11204', 'Accum. Depr - Machinery', 'مجمع إهلاك معدات التشغيل', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '112'), 4, 'credit', 'balance_sheet', 'accumulated_depreciation', TRUE),

-- 11205. Accum. Depr - Computers (parent: '112')
('11205', 'Accum. Depr - Computers', 'مجمع إهلاك الكمبيوتر', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '112'), 4, 'credit', 'balance_sheet', 'accumulated_depreciation', TRUE),

-- 11206. Accum. Depr - Tools (parent: '112')
('11206', 'Accum. Depr - Tools', 'مجمع إهلاك العدد والأدوات', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '112'), 4, 'credit', 'balance_sheet', 'accumulated_depreciation', TRUE),

-- 11207. Accum. Depr - Software (parent: '112')
('11207', 'Accum. Depr - Software', 'مجمع إهلاك البرامج', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '112'), 4, 'credit', 'balance_sheet', 'accumulated_depreciation', TRUE)

ON CONFLICT (account_code) DO NOTHING;

-- ============================================================================
-- Level 3 & 4: Depreciation Expenses (under '32')
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- 323. Depreciation Expenses (parent: '32')
('323', 'Depreciation Expenses', 'مصاريف إهلاك الأصول', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '32'), 3, 'debit', 'income_statement', 'depreciation_expense', TRUE),

-- 32301. Depr - Leasehold (parent: '323')
('32301', 'Depr - Leasehold', 'إهلاك تحسينات الأصول', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '323'), 4, 'debit', 'income_statement', 'depreciation_expense', TRUE),

-- 32302. Depr - Furniture (parent: '323')
('32302', 'Depr - Furniture', 'إهلاك الأثاث', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '323'), 4, 'debit', 'income_statement', 'depreciation_expense', TRUE),

-- 32303. Depr - Vehicles (parent: '323')
('32303', 'Depr - Vehicles', 'إهلاك السيارات', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '323'), 4, 'debit', 'income_statement', 'depreciation_expense', TRUE),

-- 32304. Depr - Machinery (parent: '323')
('32304', 'Depr - Machinery', 'إهلاك معدات التشغيل', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '323'), 4, 'debit', 'income_statement', 'depreciation_expense', TRUE),

-- 32305. Depr - Computers (parent: '323')
('32305', 'Depr - Computers', 'إهلاك أجهزة الكمبيوتر', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '323'), 4, 'debit', 'income_statement', 'depreciation_expense', TRUE),

-- 32306. Depr - Tools (parent: '323')
('32306', 'Depr - Tools', 'إهلاك العدد والأدوات', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '323'), 4, 'debit', 'income_statement', 'depreciation_expense', TRUE)

ON CONFLICT (account_code) DO NOTHING;

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  inserted_count INTEGER;
  tangible_count INTEGER;
  accum_depr_count INTEGER;
  expense_count INTEGER;
BEGIN
  -- Count all Phase 4 fixed asset accounts
  SELECT COUNT(*) INTO inserted_count
  FROM chart_of_accounts
  WHERE account_code IN (
    '111', '11101', '11102', '11103', '11104', '11105', '11106', '11107',
    '112', '11201', '11202', '11203', '11204', '11205', '11206', '11207',
    '323', '32301', '32302', '32303', '32304', '32305', '32306'
  );

  -- Count by category
  SELECT COUNT(*) INTO tangible_count
  FROM chart_of_accounts
  WHERE account_code LIKE '111%' AND account_type = 'asset' AND financial_statement = 'balance_sheet';

  SELECT COUNT(*) INTO accum_depr_count
  FROM chart_of_accounts
  WHERE account_code LIKE '112%' AND account_type = 'asset' AND normal_balance = 'credit';

  SELECT COUNT(*) INTO expense_count
  FROM chart_of_accounts
  WHERE account_code LIKE '323%' AND account_type = 'expense' AND financial_statement = 'income_statement';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Phase 4 Fixed Assets COA Seed Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total accounts inserted: %', inserted_count;
  RAISE NOTICE 'Tangible fixed assets: %', tangible_count;
  RAISE NOTICE 'Accumulated depreciation: %', accum_depr_count;
  RAISE NOTICE 'Depreciation expenses: %', expense_count;
  RAISE NOTICE '========================================';

  IF inserted_count < 24 THEN
    RAISE EXCEPTION '❌ Expected 24 accounts but found %. Check for missing parent accounts.', inserted_count;
  END IF;

  -- Verify parent-child relationships
  IF EXISTS (
    SELECT 1 FROM chart_of_accounts c
    LEFT JOIN chart_of_accounts p ON c.parent_id = p.id
    WHERE c.account_code LIKE '111%' OR c.account_code LIKE '112%' OR c.account_code LIKE '323%'
    AND c.parent_id IS NOT NULL AND p.id IS NULL
  ) THEN
    RAISE EXCEPTION '❌ Found orphaned accounts with invalid parent_id';
  END IF;

  RAISE NOTICE '✅ All parent-child relationships verified';
  RAISE NOTICE '✅ Phase 4 COA accounts ready for use';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

COMMIT;
