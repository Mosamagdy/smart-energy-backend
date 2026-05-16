-- ============================================================================
-- Add journal_entry_id to invoices table
-- This links each invoice to its automatically generated journal entry
-- ============================================================================

BEGIN;

-- Add journal_entry_id column to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_journal_entry_id 
ON invoices(journal_entry_id);

-- Add comment
COMMENT ON COLUMN invoices.journal_entry_id IS 'ID of the auto-generated journal entry for this invoice';

-- Verify the column was added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' 
    AND column_name = 'journal_entry_id'
  ) THEN
    RAISE EXCEPTION '❌ journal_entry_id column was not added to invoices table!';
  END IF;
  
  RAISE NOTICE '✅ journal_entry_id column added to invoices table successfully!';
END $$;

COMMIT;
