-- ============================================================================
-- PHASE 1: Chart of Accounts Schema Enhancement
-- Purpose: Add bilingual support, VAT tagging, cost center linking, 
--          and financial reporting classifications
-- Date: 2026-04-06
-- Reference: دليل ومتطلبات حسابات شركة الطاقة الذكية.md
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENHANCE CHART OF ACCOUNTS TABLE
-- ============================================================================

-- Add Arabic name support (bilingual requirement)
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS account_name_ar VARCHAR(255);

COMMENT ON COLUMN chart_of_accounts.account_name_ar IS 'Arabic account name for bilingual support';

-- Add VAT configuration columns
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS is_vat_applicable BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 15.00;

COMMENT ON COLUMN chart_of_accounts.is_vat_applicable IS 'Whether VAT applies to transactions on this account';
COMMENT ON COLUMN chart_of_accounts.vat_rate IS 'VAT rate percentage (default 15%)';

-- Add cost center linking for projects, vehicles, employees
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS cost_center_type VARCHAR(50) CHECK (cost_center_type IN ('project', 'vehicle', 'employee', 'department', NULL));

ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS linked_entity_id INTEGER;

COMMENT ON COLUMN chart_of_accounts.cost_center_type IS 'Type of cost center: project, vehicle, employee, or department';
COMMENT ON COLUMN chart_of_accounts.linked_entity_id IS 'ID of linked entity (project_id, employee_id, etc.)';

-- Add financial statement classification for reporting
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS financial_statement VARCHAR(50) CHECK (financial_statement IN ('balance_sheet', 'income_statement', 'cash_flow', 'equity_statement', NULL));

ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS report_category VARCHAR(50);

COMMENT ON COLUMN chart_of_accounts.financial_statement IS 'Which financial statement this account belongs to';
COMMENT ON COLUMN chart_of_accounts.report_category IS 'Detailed category for reporting (e.g., current_asset, operating_expense)';

-- Add fixed asset depreciation parameters
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS depreciation_method VARCHAR(50) CHECK (depreciation_method IN ('straight_line', 'declining_balance', 'units_of_production', NULL));

ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS useful_life_years INTEGER;

ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS salvage_value DECIMAL(15,2) DEFAULT 0.00;

COMMENT ON COLUMN chart_of_accounts.depreciation_method IS 'Depreciation method for fixed asset accounts';
COMMENT ON COLUMN chart_of_accounts.useful_life_years IS 'Expected useful life in years for depreciation calculation';
COMMENT ON COLUMN chart_of_accounts.salvage_value IS 'Estimated salvage/residual value at end of useful life';

-- Increase account_code length to support 7-digit hierarchical codes
ALTER TABLE chart_of_accounts 
ALTER COLUMN account_code TYPE VARCHAR(20);

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_coa_vat_applicable 
ON chart_of_accounts(is_vat_applicable) WHERE is_vat_applicable = TRUE;

CREATE INDEX IF NOT EXISTS idx_coa_cost_center 
ON chart_of_accounts(cost_center_type, linked_entity_id) 
WHERE cost_center_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coa_financial_statement 
ON chart_of_accounts(financial_statement);

CREATE INDEX IF NOT EXISTS idx_coa_name_ar 
ON chart_of_accounts(account_name_ar);

-- ============================================================================
-- 2. UPDATE EXISTING ACCOUNTS WITH FINANCIAL STATEMENT CLASSIFICATION
-- ============================================================================

-- Assets -> Balance Sheet
UPDATE chart_of_accounts 
SET financial_statement = 'balance_sheet',
    report_category = CASE 
      WHEN account_code LIKE '11%' THEN 'current_asset'
      WHEN account_code LIKE '12%' THEN 'fixed_asset'
      WHEN account_code LIKE '13%' THEN 'cash_equivalent'
      ELSE 'asset'
    END
WHERE account_type = 'asset';

-- Liabilities -> Balance Sheet
UPDATE chart_of_accounts 
SET financial_statement = 'balance_sheet',
    report_category = CASE 
      WHEN account_code LIKE '21%' THEN 'current_liability'
      WHEN account_code LIKE '22%' THEN 'long_term_liability'
      ELSE 'liability'
    END
WHERE account_type = 'liability';

-- Equity -> Balance Sheet & Equity Statement
UPDATE chart_of_accounts 
SET financial_statement = 'balance_sheet',
    report_category = 'equity'
WHERE account_type = 'equity';

-- Revenue -> Income Statement
UPDATE chart_of_accounts 
SET financial_statement = 'income_statement',
    report_category = 'revenue'
WHERE account_type = 'revenue';

-- Expenses -> Income Statement
UPDATE chart_of_accounts 
SET financial_statement = 'income_statement',
    report_category = CASE 
      WHEN account_code LIKE '51%' OR account_code LIKE '52%' THEN 'direct_expense'
      WHEN account_code LIKE '6%' THEN 'operating_expense'
      ELSE 'expense'
    END
WHERE account_type = 'expense';

-- ============================================================================
-- 3. CREATE HELPER VIEWS FOR REPORTING
-- ============================================================================

-- View: Balance Sheet Accounts
CREATE OR REPLACE VIEW v_balance_sheet_accounts AS
SELECT *
FROM chart_of_accounts
WHERE financial_statement = 'balance_sheet'
  AND is_active = TRUE
ORDER BY account_code;

COMMENT ON VIEW v_balance_sheet_accounts IS 'All active balance sheet accounts';

-- View: Income Statement Accounts
CREATE OR REPLACE VIEW v_income_statement_accounts AS
SELECT *
FROM chart_of_accounts
WHERE financial_statement = 'income_statement'
  AND is_active = TRUE
ORDER BY account_code;

COMMENT ON VIEW v_income_statement_accounts IS 'All active income statement accounts';

-- View: VAT Applicable Accounts
CREATE OR REPLACE VIEW v_vat_applicable_accounts AS
SELECT id, account_code, account_name, account_name_ar, vat_rate
FROM chart_of_accounts
WHERE is_vat_applicable = TRUE
  AND is_active = TRUE
ORDER BY account_code;

COMMENT ON VIEW v_vat_applicable_accounts IS 'Accounts that require VAT calculation';

-- View: Cost Center Accounts (Projects/Vehicles/Employees)
CREATE OR REPLACE VIEW v_cost_center_accounts AS
SELECT 
  id,
  account_code,
  account_name,
  account_name_ar,
  cost_center_type,
  linked_entity_id
FROM chart_of_accounts
WHERE cost_center_type IS NOT NULL
  AND is_active = TRUE
ORDER BY cost_center_type, account_code;

COMMENT ON VIEW v_cost_center_accounts IS 'Accounts linked to specific cost centers';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'chart_of_accounts'
    AND column_name IN (
      'account_name_ar', 'is_vat_applicable', 'vat_rate',
      'cost_center_type', 'linked_entity_id', 'financial_statement',
      'report_category', 'depreciation_method', 'useful_life_years',
      'salvage_value'
    );
  
  IF col_count = 10 THEN
    RAISE NOTICE '✅ SUCCESS: All 10 new columns added to chart_of_accounts';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Only % of 10 columns were added', col_count;
  END IF;
END $$;

COMMIT;
