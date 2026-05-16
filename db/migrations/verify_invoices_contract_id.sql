-- ============================================================================
-- VERIFICATION SCRIPT: Check if invoices table has contract_id column
-- Run this in pgAdmin to diagnose the 500 error
-- ============================================================================

-- 1. Check if contract_id column exists in invoices table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
  AND column_name = 'contract_id';

-- Expected result:
-- column_name | data_type | is_nullable | column_default
-- contract_id | integer   | NO          | null

-- If NO rows returned, the column is MISSING!

-- 2. Check all columns in invoices table
SELECT 
  ordinal_position,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;

-- 3. Check if migration 007 was applied
SELECT * FROM information_schema.tables 
WHERE table_name = 'contracts';

-- Should return the contracts table if migration ran

-- 4. Check foreign key constraints on invoices table
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'invoices';

-- Expected to see:
-- constraint_name              | table_name | column_name | foreign_table_name | foreign_column_name
-- invoices_contract_id_fkey    | invoices   | contract_id | contracts          | id

-- 5. Quick test: Try to SELECT contract_id from invoices
SELECT contract_id FROM invoices LIMIT 1;

-- If this fails with "column does not exist", then the column is definitely missing!

-- ============================================================================
-- FIX: If contract_id is missing, run this ALTER TABLE command
-- ============================================================================

-- ONLY RUN THIS IF THE COLUMN IS MISSING!
-- ALTER TABLE invoices ADD COLUMN contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE;
-- CREATE INDEX IF NOT EXISTS idx_invoices_contract ON invoices(contract_id);
-- COMMENT ON COLUMN invoices.contract_id IS 'Link to contracts table for billing';

-- ============================================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================================

DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'contract_id'
  ) INTO column_exists;
  
  IF column_exists THEN
    RAISE NOTICE '✅ PASS: contract_id column EXISTS in invoices table';
  ELSE
    RAISE NOTICE '❌ FAIL: contract_id column is MISSING from invoices table';
    RAISE NOTICE '💡 SOLUTION: Run migration 007_phase2_contracts_finance.sql';
    RAISE NOTICE '   OR run the ALTER TABLE command above';
  END IF;
END $$;
