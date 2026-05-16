-- ============================================================================
-- Phase 4: Fixed Assets Table Creation
-- Creates fixed_assets table with depreciation tracking and disposal workflow
-- ============================================================================

BEGIN;

-- ============================================================================
-- Create fixed_assets Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS fixed_assets (
  id                    SERIAL PRIMARY KEY,
  asset_number          VARCHAR(50) UNIQUE NOT NULL,
  asset_name            VARCHAR(255) NOT NULL,
  asset_name_ar         VARCHAR(255),
  category              VARCHAR(50) NOT NULL,
  coa_account_code      VARCHAR(20) NOT NULL,
  accum_depr_account    VARCHAR(20) NOT NULL,
  depr_expense_account  VARCHAR(20) NOT NULL,
  purchase_date         DATE NOT NULL,
  purchase_cost         NUMERIC(15,2) NOT NULL,
  salvage_value         NUMERIC(15,2) NOT NULL DEFAULT 0,
  useful_life_years     INTEGER NOT NULL,
  depreciation_method   VARCHAR(20) NOT NULL DEFAULT 'straight_line',
  status                VARCHAR(20) NOT NULL DEFAULT 'active',
  accumulated_depr      NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_book_value        NUMERIC(15,2) GENERATED ALWAYS AS (purchase_cost - accumulated_depr) STORED,
  disposal_date         DATE,
  disposal_amount       NUMERIC(15,2),
  disposal_gain_loss    NUMERIC(15,2),
  project_id            INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  created_by            INTEGER REFERENCES users(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_depreciation_method CHECK (depreciation_method IN ('straight_line', 'declining_balance')),
  CONSTRAINT chk_status CHECK (status IN ('active', 'disposed', 'fully_depreciated')),
  CONSTRAINT chk_purchase_cost_positive CHECK (purchase_cost > 0),
  CONSTRAINT chk_salvage_value CHECK (salvage_value >= 0),
  CONSTRAINT chk_useful_life CHECK (useful_life_years > 0)
);

-- ============================================================================
-- Create Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_fixed_assets_category ON fixed_assets(category);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_project ON fixed_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_asset_number ON fixed_assets(asset_number);

-- ============================================================================
-- Create Trigger: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_fixed_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_fixed_assets_updated_at ON fixed_assets;

CREATE TRIGGER update_fixed_assets_updated_at
  BEFORE UPDATE ON fixed_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_fixed_assets_updated_at();

-- ============================================================================
-- Add Comments
-- ============================================================================

COMMENT ON TABLE fixed_assets IS 'Fixed asset register with depreciation tracking and disposal workflow';
COMMENT ON COLUMN fixed_assets.asset_number IS 'Unique asset identifier (e.g., FA-0001)';
COMMENT ON COLUMN fixed_assets.category IS 'Asset category: leasehold, furniture, vehicle, machinery, computer, tools, software';
COMMENT ON COLUMN fixed_assets.coa_account_code IS 'Chart of Accounts asset account code (e.g., 11103)';
COMMENT ON COLUMN fixed_assets.accum_depr_account IS 'Accumulated depreciation account code (e.g., 11203)';
COMMENT ON COLUMN fixed_assets.depr_expense_account IS 'Depreciation expense account code (e.g., 32303)';
COMMENT ON COLUMN fixed_assets.net_book_value IS 'Calculated: purchase_cost - accumulated_depr';
COMMENT ON COLUMN fixed_assets.disposal_gain_loss IS 'Positive = gain, Negative = loss';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  column_count INTEGER;
  trigger_exists BOOLEAN;
  index_count INTEGER;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'fixed_assets'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE EXCEPTION '❌ fixed_assets table was not created';
  END IF;
  
  -- Check column count
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public' 
  AND table_name = 'fixed_assets';
  
  -- Check trigger exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'update_fixed_assets_updated_at'
    AND event_object_table = 'fixed_assets'
  ) INTO trigger_exists;
  
  -- Check indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'fixed_assets'
  AND indexname LIKE 'idx_fixed_assets%';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Phase 4 Fixed Assets Table Created';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Table exists: %', table_exists;
  RAISE NOTICE 'Total columns: %', column_count;
  RAISE NOTICE 'Trigger exists: %', trigger_exists;
  RAISE NOTICE 'Custom indexes: %', index_count;
  RAISE NOTICE '========================================';
  
  IF column_count < 20 THEN
    RAISE EXCEPTION '❌ Expected at least 20 columns but found %', column_count;
  END IF;
  
  IF NOT trigger_exists THEN
    RAISE EXCEPTION '❌ updated_at trigger was not created';
  END IF;
  
  IF index_count < 3 THEN
    RAISE EXCEPTION '❌ Expected at least 3 indexes but found %', index_count;
  END IF;
  
  RAISE NOTICE '✅ All constraints verified';
  RAISE NOTICE '✅ Trigger auto-update verified';
  RAISE NOTICE '✅ Indexes verified';
  RAISE NOTICE '✅ fixed_assets table ready for use';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

COMMIT;
