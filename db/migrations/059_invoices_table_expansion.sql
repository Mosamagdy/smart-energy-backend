-- ================================================================
-- Migration: Add missing columns to invoices table for tax invoice INSERT
-- Purpose: Enable invoices table to receive data from sales_invoices
-- Date: 2026-04-23
-- ================================================================

BEGIN;

-- Add client_id reference
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add financial breakdown columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(16,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(16,2);

-- Add payment tracking
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'unpaid' 
  CHECK (payment_status IN ('unpaid', 'partial', 'paid'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(16,2) DEFAULT 0;

-- Add PDF path
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_path VARCHAR(500);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);

-- Add comments
COMMENT ON COLUMN invoices.client_id IS 'Client reference (mapped from sales_invoices)';
COMMENT ON COLUMN invoices.subtotal IS 'Amount before tax';
COMMENT ON COLUMN invoices.tax_amount IS 'VAT amount (15%)';
COMMENT ON COLUMN invoices.payment_status IS 'Payment tracking: unpaid, partial, paid';
COMMENT ON COLUMN invoices.amount_paid IS 'Total amount paid so far';
COMMENT ON COLUMN invoices.pdf_path IS 'Path to generated PDF file';

COMMIT;
