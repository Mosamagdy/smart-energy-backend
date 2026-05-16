-- ================================================================
-- Migration: Create sales_invoices table
-- Purpose: Track sales invoices generated from won leads/projects
-- Date: 2026-04-21
-- ================================================================

BEGIN;

-- Create sales_invoices table
CREATE TABLE IF NOT EXISTS sales_invoices (
  id SERIAL PRIMARY KEY,
  
  -- Reference Links
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Invoice Details
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(15,2) NOT NULL CHECK (subtotal >= 0),
  vat_rate NUMERIC(5,2) DEFAULT 15.00 CHECK (vat_rate >= 0 AND vat_rate <= 100),
  vat_amount NUMERIC(15,2) NOT NULL CHECK (vat_amount >= 0),
  total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount >= 0),
  
  -- COA Links for Journal Entry
  receivable_account_id INTEGER REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  revenue_account_id INTEGER REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  vat_account_id INTEGER REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  
  -- Status & Tracking
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'paid', 'overdue', 'cancelled')),
  payment_status VARCHAR(50) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  amount_paid NUMERIC(15,2) DEFAULT 0 CHECK (amount_paid >= 0),
  journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL,
  
  -- Notes
  description TEXT,
  notes TEXT,
  
  -- Metadata
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_invoices_project ON sales_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_client ON sales_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_lead ON sales_invoices(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_status ON sales_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_issue_date ON sales_invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_journal ON sales_invoices(journal_entry_id);

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sales_invoices_updated_at
    BEFORE UPDATE ON sales_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE sales_invoices IS 'Sales invoices generated from won leads/projects with automatic journal entries';
COMMENT ON COLUMN sales_invoices.invoice_number IS 'Unique invoice number (format: SI-YYYY-NNNN)';
COMMENT ON COLUMN sales_invoices.receivable_account_id IS 'Client sub-account under 121 (Accounts Receivable)';
COMMENT ON COLUMN sales_invoices.revenue_account_id IS 'Revenue account (41xxx branch)';
COMMENT ON COLUMN sales_invoices.vat_account_id IS 'VAT Output account (22101)';
COMMENT ON COLUMN sales_invoices.journal_entry_id IS 'Auto-generated journal entry for this invoice';

COMMIT;
