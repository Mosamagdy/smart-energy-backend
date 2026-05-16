-- Tax Invoice Enhancement Migration
-- Adds ZATCA compliance fields to existing invoices table
-- Date: 2026-04-23

BEGIN;

-- 1. Add tax invoice tracking fields to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_tax_invoice BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_invoice_no VARCHAR(100) UNIQUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS zatca_uuid UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS zatca_status VARCHAR(20) DEFAULT 'not_applicable' 
  CHECK (zatca_status IN ('pending', 'cleared', 'rejected', 'not_applicable'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS zatca_cleared_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS zatca_invoice_hash VARCHAR(256);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS previous_invoice_hash VARCHAR(256);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_vat_number VARCHAR(15);

-- 2. Create tax invoice logs table for audit trail
CREATE TABLE IF NOT EXISTS tax_invoice_logs (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- generated, printed, sent_to_zatca, cleared, rejected
  zatca_response JSONB,
  performed_by INTEGER REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_tax_invoice ON invoices(is_tax_invoice);
CREATE INDEX IF NOT EXISTS idx_invoices_zatca_status ON invoices(zatca_status);
CREATE INDEX IF NOT EXISTS idx_invoices_tax_invoice_no ON invoices(tax_invoice_no);
CREATE INDEX IF NOT EXISTS idx_tax_logs_invoice ON tax_invoice_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_tax_logs_action ON tax_invoice_logs(action);

COMMIT;
