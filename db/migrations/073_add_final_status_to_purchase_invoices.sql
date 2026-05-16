-- Migration 073: Add 'final' status to purchase_invoices
-- Date: 2026-04-26
-- Purpose: Update CHECK constraint to allow 'final' status for finalized purchase invoices

BEGIN;

-- Drop existing constraint
ALTER TABLE purchase_invoices DROP CONSTRAINT IF EXISTS chk_pi_status;

-- Add new constraint with 'final' status
ALTER TABLE purchase_invoices 
  ADD CONSTRAINT chk_pi_status 
  CHECK (status IN ('draft', 'final', 'partial', 'paid'));

COMMIT;
