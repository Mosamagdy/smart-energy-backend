BEGIN;

-- ============================================================================
-- Migration 024: Create Budgeting Tables
-- ============================================================================
-- Creates budgets table for budget tracking and cost center management
-- ============================================================================

CREATE TABLE IF NOT EXISTS budgets (
  id                  SERIAL PRIMARY KEY,
  budget_code         VARCHAR(50) UNIQUE NOT NULL,  -- e.g. BGT-2026-0001
  name                VARCHAR(255) NOT NULL,
  name_ar             VARCHAR(255),
  fiscal_year         INTEGER NOT NULL,
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  total_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  department          VARCHAR(50),  -- sales | design | operations | admin (NULL = company-wide)
  cost_center         VARCHAR(100),  -- Optional cost center identifier
  status              VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft | active | completed | cancelled
  notes               TEXT,
  created_by          INTEGER REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_budget_status CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  CONSTRAINT chk_budget_amount CHECK (total_amount >= 0),
  CONSTRAINT chk_budget_dates CHECK (end_date > start_date)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_budgets_fiscal_year ON budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budgets_department ON budgets(department);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_code ON budgets(budget_code);
CREATE INDEX IF NOT EXISTS idx_budgets_dates ON budgets(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_budgets_cost_center ON budgets(cost_center);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_budgets_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE budgets IS 'Budget tracking and cost center management';
COMMENT ON COLUMN budgets.budget_code IS 'Unique budget identifier (auto-generated)';
COMMENT ON COLUMN budgets.fiscal_year IS 'Fiscal year for the budget';
COMMENT ON COLUMN budgets.department IS 'Department this budget applies to (NULL = company-wide)';
COMMENT ON COLUMN budgets.cost_center IS 'Optional cost center identifier for granular tracking';
COMMENT ON COLUMN budgets.status IS 'draft: initial, active: in use, completed: ended, cancelled: voided';

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  table_exists BOOLEAN;
  trigger_exists BOOLEAN;
  index_count INTEGER;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'budgets'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION '❌ Table budgets was not created';
  END IF;

  -- Check trigger exists
  SELECT EXISTS (
    SELECT FROM pg_trigger 
    WHERE tgname = 'update_budgets_updated_at'
  ) INTO trigger_exists;

  IF NOT trigger_exists THEN
    RAISE EXCEPTION '❌ Trigger update_budgets_updated_at was not created';
  END IF;

  -- Check indexes (should have at least 6)
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'budgets'
    AND indexname LIKE 'idx_%';

  IF index_count < 6 THEN
    RAISE EXCEPTION '❌ Expected at least 6 indexes but found %', index_count;
  END IF;

  RAISE NOTICE '✅ Migration 024: Successfully created budgets table with triggers and indexes';
END $$;

COMMIT;
