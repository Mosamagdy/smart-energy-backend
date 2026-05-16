-- ================================================================
-- Migration: Fix sales_invoices status constraint to allow 'final'
-- Purpose: Add 'final' to allowed status values
-- Date: 2026-04-23
-- ================================================================

BEGIN;

-- Drop the old constraint
ALTER TABLE sales_invoices 
DROP CONSTRAINT IF EXISTS sales_invoices_status_check;

-- Recreate with 'final' included
ALTER TABLE sales_invoices 
ADD CONSTRAINT sales_invoices_status_check 
CHECK (status IN ('draft', 'final', 'pending', 'approved', 'paid', 'overdue', 'cancelled', 'sent'));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'sales_invoices'::regclass
AND conname = 'sales_invoices_status_check';

COMMIT;
