-- ============================================================================
-- HOTFIX: Add contract_id to invoices table if missing
-- This fixes the 500 error: "column i.contract_id does not exist"
-- Date: 2026-04-06
-- Reference: Critical Bug Fix - Syncing Contracts, Invoices, and Clients
-- ============================================================================

BEGIN;

-- Check if column exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'contract_id'
  ) THEN
    -- Add contract_id column
    ALTER TABLE invoices 
    ADD COLUMN contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Added contract_id column to invoices table';
  ELSE
    RAISE NOTICE 'ℹ️  contract_id column already exists - skipping';
  END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_invoices_contract ON invoices(contract_id);

-- Add comment
COMMENT ON COLUMN invoices.contract_id IS 'Link to contracts table for billing (FK to contracts.id)';

-- Verify the fix
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'contract_id'
  ) INTO column_exists;
  
  IF column_exists THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ HOTFIX SUCCESSFUL';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'contract_id column is now present in invoices table';
    RAISE NOTICE 'You can now create invoices with contract_id';
    RAISE NOTICE '========================================';
  ELSE
    RAISE EXCEPTION '❌ HOTFIX FAILED: contract_id column still missing!';
  END IF;
END $$;

COMMIT;
