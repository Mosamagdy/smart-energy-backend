-- ============================================================================
-- Migration 051: Add Approval Workflow to purchase_orders
-- ============================================================================
-- Purpose: Add finance/procurement approval tracking to purchase_orders table
-- Date: 2026-04-14
-- ============================================================================

-- STEP 1: Update status constraint to include approval workflow statuses
-- Current: 'draft', 'sent', 'partial', 'received', 'cancelled'
-- New: 'draft', 'pending', 'pending_procurement', 'pending_finance', 'approved', 'sent', 'partial', 'received', 'cancelled'

ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS chk_po_status;

ALTER TABLE purchase_orders 
ADD CONSTRAINT chk_po_status CHECK (
  status IN (
    'draft',              -- Initial state
    'pending',            -- Created by PM, awaiting procurement review
    'pending_procurement',-- Procurement manager reviewing
    'pending_finance',    -- Procurement approved, awaiting finance approval
    'approved',           -- Finance approved, ready to send to supplier
    'sent',               -- Sent to supplier
    'partial',            -- Partially received
    'received',           -- Fully received
    'cancelled'           -- Cancelled
  )
);

-- STEP 2: Add approval tracking columns

-- Procurement approval fields
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS procurement_approved_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS procurement_approved_at TIMESTAMPTZ;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS procurement_notes TEXT;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS procurement_rejected_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS procurement_rejection_reason TEXT;

-- Finance approval fields
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS finance_approved_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS finance_approved_at TIMESTAMPTZ;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS finance_notes TEXT;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS finance_rejected_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS finance_rejection_reason TEXT;

-- Final approval (who gave the final go-ahead)
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- STEP 3: Add indexes for performance

CREATE INDEX IF NOT EXISTS idx_po_procurement_approved_by ON purchase_orders(procurement_approved_by);
CREATE INDEX IF NOT EXISTS idx_po_finance_approved_by ON purchase_orders(finance_approved_by);
CREATE INDEX IF NOT EXISTS idx_po_approved_by ON purchase_orders(approved_by);
CREATE INDEX IF NOT EXISTS idx_po_procurement_status ON purchase_orders(status) WHERE status IN ('pending', 'pending_procurement', 'pending_finance');

-- STEP 4: Add comments

COMMENT ON COLUMN purchase_orders.procurement_approved_by IS 'Procurement manager who approved';
COMMENT ON COLUMN purchase_orders.procurement_approved_at IS 'Timestamp of procurement approval';
COMMENT ON COLUMN purchase_orders.procurement_notes IS 'Procurement manager notes during approval';
COMMENT ON COLUMN purchase_orders.procurement_rejected_by IS 'Procurement manager who rejected';
COMMENT ON COLUMN purchase_orders.procurement_rejection_reason IS 'Reason for procurement rejection';

COMMENT ON COLUMN purchase_orders.finance_approved_by IS 'Finance manager who gave final approval';
COMMENT ON COLUMN purchase_orders.finance_approved_at IS 'Timestamp of finance approval';
COMMENT ON COLUMN purchase_orders.finance_notes IS 'Finance manager approval notes';
COMMENT ON COLUMN purchase_orders.finance_rejected_by IS 'Finance manager who rejected';
COMMENT ON COLUMN purchase_orders.finance_rejection_reason IS 'Reason for finance rejection';

COMMENT ON COLUMN purchase_orders.approved_by IS 'User who gave final approval (finance manager)';

-- STEP 5: Update existing 'draft' orders that should be in workflow
-- (Optional: migrate old data if needed)
-- UPDATE purchase_orders SET status = 'pending' WHERE status = 'draft' AND created_at > '2026-01-01';
