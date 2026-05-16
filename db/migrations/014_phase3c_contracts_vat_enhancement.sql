-- ============================================================================
-- PHASE 3C: Contracts Module Enhancement for VAT/Finance Integration
-- Purpose: Add VAT fields and contract_items table for full finance compatibility
-- Date: 2026-04-06
-- Reference: CONTRACTS_MODULE_AUDIT_AND_FINANCE_INTEGRATION.md
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENHANCE CONTRACTS TABLE WITH VAT FIELDS
-- ============================================================================

-- Add VAT applicability flag
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS vat_applicable BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN contracts.vat_applicable IS 'Whether VAT applies to this contract (default true)';

-- Add VAT rate
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5, 2) DEFAULT 15.00;

COMMENT ON COLUMN contracts.vat_rate IS 'VAT rate percentage (default 15% for Saudi Arabia)';

-- Update existing contracts to enable VAT by default
UPDATE contracts 
SET vat_applicable = TRUE, 
    vat_rate = 15.00
WHERE vat_applicable IS NULL;

-- ============================================================================
-- 2. CREATE CONTRACT ITEMS TABLE (Optional - For Complex Contracts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contract_items (
  id SERIAL PRIMARY KEY,
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Item Details (Bilingual)
  item_name VARCHAR(200) NOT NULL,
  item_name_ar VARCHAR(200),
  description TEXT,
  
  -- Quantities & Pricing
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_of_measure VARCHAR(20) DEFAULT 'unit', -- unit, hour, day, month, etc.
  unit_price DECIMAL(15, 2) NOT NULL,
  
  -- VAT Configuration
  vat_applicable BOOLEAN NOT NULL DEFAULT TRUE,
  vat_rate DECIMAL(5, 2) DEFAULT 15.00,
  
  -- Calculated Fields (auto-computed)
  line_total DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  vat_amount DECIMAL(15, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN vat_applicable THEN ROUND(quantity * unit_price * vat_rate / 100, 2)
      ELSE 0 
    END
  ) STORED,
  
  -- Ordering
  sort_order INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contract_items_contract_id ON contract_items(contract_id);

COMMENT ON TABLE contract_items IS 'Detailed line items for contracts with automatic VAT calculation';
COMMENT ON COLUMN contract_items.item_name_ar IS 'Arabic item name for bilingual support';
COMMENT ON COLUMN contract_items.line_total IS 'Auto-calculated: quantity × unit_price';
COMMENT ON COLUMN contract_items.vat_amount IS 'Auto-calculated VAT based on rate';

-- ============================================================================
-- 3. CREATE CONTRACT MILESTONES TABLE (Payment Schedule)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contract_milestones (
  id SERIAL PRIMARY KEY,
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Milestone Details (Bilingual)
  milestone_name VARCHAR(200) NOT NULL,
  milestone_name_ar VARCHAR(200),
  description TEXT,
  
  -- Payment Terms
  milestone_percentage DECIMAL(5, 2) NOT NULL, -- e.g., 30.00 for 30%
  milestone_amount DECIMAL(15, 2) NOT NULL,
  
  -- Dates
  due_date DATE,
  completed_date DATE,
  
  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- Statuses: pending, invoiced, paid, overdue
  
  -- Linked Invoice
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  
  -- Ordering
  sort_order INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contract_milestones_contract ON contract_milestones(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_milestones_status ON contract_milestones(status);
CREATE INDEX IF NOT EXISTS idx_contract_milestones_invoice ON contract_milestones(invoice_id);

COMMENT ON TABLE contract_milestones IS 'Payment milestones/schedule for contracts linked to invoices';
COMMENT ON COLUMN contract_milestones.milestone_percentage IS 'Percentage of total contract value';
COMMENT ON COLUMN contract_milestones.invoice_id IS 'Links to generated invoice when milestone is billed';

-- ============================================================================
-- 4. CREATE CONTRACT AMENDMENTS TABLE (Version Control)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contract_amendments (
  id SERIAL PRIMARY KEY,
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Amendment Details
  amendment_number VARCHAR(20) NOT NULL,
  amendment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  
  -- Changes
  field_changed VARCHAR(50) NOT NULL, -- e.g., 'total_value', 'end_date'
  old_value TEXT,
  new_value TEXT,
  
  -- Approval
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Document
  attachment_url VARCHAR(500),
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contract_amendments_contract ON contract_amendments(contract_id);

COMMENT ON TABLE contract_amendments IS 'Track amendments and changes to contracts for audit trail';

-- ============================================================================
-- 5. CREATE HELPER VIEWS FOR REPORTING
-- ============================================================================

-- View: Active Contracts with VAT Summary
CREATE OR REPLACE VIEW v_active_contracts_vat_summary AS
SELECT 
  c.id,
  c.contract_number,
  c.project_id,
  p.name AS project_name,
  c.client_id,
  u.first_name || ' ' || u.last_name AS client_name,
  c.total_value,
  c.vat_applicable,
  c.vat_rate,
  CASE 
    WHEN c.vat_applicable THEN ROUND(c.total_value * c.vat_rate / 100, 2)
    ELSE 0 
  END AS vat_amount,
  CASE 
    WHEN c.vat_applicable THEN ROUND(c.total_value * (1 + c.vat_rate / 100), 2)
    ELSE c.total_value 
  END AS total_with_vat,
  c.currency,
  c.start_date,
  c.end_date,
  c.status
FROM contracts c
LEFT JOIN projects p ON p.id = c.project_id
LEFT JOIN users u ON u.id = c.client_id
WHERE c.status = 'active';

COMMENT ON VIEW v_active_contracts_vat_summary IS 'Active contracts with calculated VAT amounts';

-- View: Contract Payment Status
CREATE OR REPLACE VIEW v_contract_payment_status AS
SELECT 
  c.id AS contract_id,
  c.contract_number,
  c.total_value,
  COUNT(DISTINCT cm.id) AS total_milestones,
  COUNT(DISTINCT CASE WHEN cm.status = 'paid' THEN cm.id END) AS paid_milestones,
  COUNT(DISTINCT CASE WHEN cm.status = 'invoiced' THEN cm.id END) AS invoiced_milestones,
  COUNT(DISTINCT CASE WHEN cm.status = 'pending' THEN cm.id END) AS pending_milestones,
  COALESCE(SUM(cm.milestone_amount) FILTER (WHERE cm.status = 'paid'), 0) AS amount_paid,
  COALESCE(SUM(cm.milestone_amount) FILTER (WHERE cm.status = 'invoiced'), 0) AS amount_invoiced,
  c.total_value - COALESCE(SUM(cm.milestone_amount) FILTER (WHERE cm.status = 'paid'), 0) AS remaining_balance
FROM contracts c
LEFT JOIN contract_milestones cm ON cm.contract_id = c.id
GROUP BY c.id, c.contract_number, c.total_value;

COMMENT ON VIEW v_contract_payment_status IS 'Contract payment tracking with milestone breakdown';

-- ============================================================================
-- 6. ADD TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger: Auto-update contract milestone amounts when contract value changes
CREATE OR REPLACE FUNCTION update_milestone_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate milestone amounts based on new contract value
  UPDATE contract_milestones
  SET milestone_amount = ROUND(NEW.total_value * milestone_percentage / 100, 2),
      updated_at = NOW()
  WHERE contract_id = NEW.id
    AND status = 'pending';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_milestone_amounts ON contracts;
CREATE TRIGGER trg_update_milestone_amounts
  AFTER UPDATE OF total_value ON contracts
  FOR EACH ROW
  WHEN (OLD.total_value != NEW.total_value)
  EXECUTE FUNCTION update_milestone_amounts();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  contracts_vat_count INTEGER;
  items_table_exists BOOLEAN;
  milestones_table_exists BOOLEAN;
  amendments_table_exists BOOLEAN;
BEGIN
  -- Check VAT fields added
  SELECT COUNT(*) INTO contracts_vat_count
  FROM information_schema.columns
  WHERE table_name = 'contracts'
    AND column_name IN ('vat_applicable', 'vat_rate');
  
  -- Check tables created
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'contract_items'
  ) INTO items_table_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'contract_milestones'
  ) INTO milestones_table_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'contract_amendments'
  ) INTO amendments_table_exists;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CONTRACTS MODULE ENHANCEMENT COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VAT fields added: %', contracts_vat_count;
  RAISE NOTICE 'contract_items table: %', CASE WHEN items_table_exists THEN '✅ Created' ELSE '❌ Failed' END;
  RAISE NOTICE 'contract_milestones table: %', CASE WHEN milestones_table_exists THEN '✅ Created' ELSE '❌ Failed' END;
  RAISE NOTICE 'contract_amendments table: %', CASE WHEN amendments_table_exists THEN '✅ Created' ELSE '❌ Failed' END;
  RAISE NOTICE '========================================';
  
  IF contracts_vat_count != 2 THEN
    RAISE EXCEPTION '❌ VAT fields not properly added to contracts table';
  END IF;
END $$;

COMMIT;
