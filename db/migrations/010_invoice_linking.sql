-- ============================================================================
-- PHASE 6C: INVOICE LINKING & FINANCE AUTOMATION
-- ============================================================================

-- Add purchase_request_id to invoices table for referential integrity
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS purchase_request_id INTEGER REFERENCES purchase_requests(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_invoices_purchase_request 
ON invoices(purchase_request_id);

-- Add comment for documentation
COMMENT ON COLUMN invoices.purchase_request_id IS 'Links invoice to originating purchase request';

-- Add finance_manager role if not exists (NOTE: Role already exists per user confirmation)
-- This is just a safety check
INSERT INTO roles (name, description) 
VALUES ('finance_manager', 'Manages financial approvals, budget control, and invoice posting')
ON CONFLICT (name) DO NOTHING;

-- Ensure general_manager role exists
INSERT INTO roles (name, description) 
VALUES ('general_manager', 'Oversees all company operations with full visibility')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify invoice linking column exists
SELECT 
  'Invoice Linking Status' as check_type,
  COUNT(*) as has_column
FROM information_schema.columns 
WHERE table_name = 'invoices' AND column_name = 'purchase_request_id';

-- Verify roles exist
SELECT 
  'Roles Available' as check_type,
  STRING_AGG(name, ', ') as roles
FROM roles 
WHERE name IN ('finance_manager', 'general_manager', 'procurement_manager');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
