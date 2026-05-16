-- ================================================================
-- Migration: Add tax invoice tracking to sales_invoices
-- Purpose: Link sales invoices to their generated tax invoices
-- Date: 2026-04-23
-- ================================================================

BEGIN;

-- Add tax invoice tracking columns to sales_invoices
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS is_tax_invoice BOOLEAN DEFAULT false;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS tax_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sales_invoices_tax_invoice ON sales_invoices(is_tax_invoice);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_tax_invoice_id ON sales_invoices(tax_invoice_id);

-- Add comments
COMMENT ON COLUMN sales_invoices.is_tax_invoice IS 'True if tax invoice has been generated for this sales invoice';
COMMENT ON COLUMN sales_invoices.tax_invoice_id IS 'Reference to the generated tax invoice in invoices table';

COMMIT;
