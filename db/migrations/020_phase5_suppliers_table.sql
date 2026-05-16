BEGIN;

-- ============================================================================
-- Migration 020: Create suppliers Table
-- ============================================================================
-- Stores supplier/vendor information for purchasing module
-- Links to Chart of Accounts via coa_account_code
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id                  SERIAL PRIMARY KEY,
  supplier_code       VARCHAR(50) UNIQUE NOT NULL,  -- e.g. SUP-0001
  name                VARCHAR(255) NOT NULL,
  name_ar             VARCHAR(255),
  supplier_type       VARCHAR(20) NOT NULL DEFAULT 'local',  -- local | foreign
  vat_number          VARCHAR(50),
  cr_number           VARCHAR(50),                 -- Commercial Registration
  contact_person      VARCHAR(255),
  phone               VARCHAR(50),
  email               VARCHAR(255),
  address             TEXT,
  payment_terms       VARCHAR(50) DEFAULT 'Net 30',
  coa_account_code    VARCHAR(20) DEFAULT '21301', -- links to Accounts Payable
  is_active           BOOLEAN DEFAULT true,
  notes               TEXT,
  created_by          INTEGER REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_supplier_type CHECK (supplier_type IN ('local', 'foreign'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_type ON suppliers(supplier_type);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_suppliers_updated_at();

-- Comments
COMMENT ON TABLE suppliers IS 'Supplier/vendor master data for purchasing module';
COMMENT ON COLUMN suppliers.supplier_code IS 'Unique supplier identifier (auto-generated)';
COMMENT ON COLUMN suppliers.supplier_type IS 'local or foreign supplier';
COMMENT ON COLUMN suppliers.vat_number IS 'VAT registration number (Saudi)';
COMMENT ON COLUMN suppliers.cr_number IS 'Commercial Registration number';
COMMENT ON COLUMN suppliers.coa_account_code IS 'Links to accounts payable in Chart of Accounts';

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  table_exists BOOLEAN;
  trigger_exists BOOLEAN;
  column_count INTEGER;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'suppliers'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION '❌ Table suppliers was not created';
  END IF;

  -- Check trigger exists
  SELECT EXISTS (
    SELECT FROM pg_trigger 
    WHERE tgname = 'update_suppliers_updated_at'
  ) INTO trigger_exists;

  IF NOT trigger_exists THEN
    RAISE EXCEPTION '❌ Trigger update_suppliers_updated_at was not created';
  END IF;

  -- Check column count (should have 17 columns + constraints)
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'suppliers';

  IF column_count < 17 THEN
    RAISE EXCEPTION '❌ Table suppliers has only % columns, expected at least 17', column_count;
  END IF;

  RAISE NOTICE '✅ Migration 020: Successfully created suppliers table with trigger';
END $$;

COMMIT;
