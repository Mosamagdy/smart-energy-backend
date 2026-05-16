-- ============================================================================
-- Migration 052: Add Purchase Invoice Items Table
-- Purpose: Store line items for purchase invoices (auto-generated from PR)
-- ============================================================================

BEGIN;

-- Create purchase_invoice_items table
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id SERIAL PRIMARY KEY,
  purchase_invoice_id INTEGER NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(16,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(16,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_invoice 
ON purchase_invoice_items(purchase_invoice_id);

-- Add columns to purchase_requests for tracking rejections
ALTER TABLE purchase_requests 
ADD COLUMN IF NOT EXISTS procurement_rejected_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS finance_rejected_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id);

COMMENT ON TABLE purchase_invoice_items IS 'Line items for purchase invoices, auto-generated from approved purchase requests';
COMMENT ON COLUMN purchase_requests.procurement_rejected_by IS 'User ID who rejected at procurement stage';
COMMENT ON COLUMN purchase_requests.finance_rejected_by IS 'User ID who rejected at finance stage';
COMMENT ON COLUMN purchase_requests.approved_by IS 'User ID who gave final approval (finance manager)';

COMMIT;
