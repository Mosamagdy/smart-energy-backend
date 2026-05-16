-- Migration: Create Credit Notes Table (مرتجع المبيعات)
-- Purpose: ZATCA-compliant credit note system for sales returns
-- Date: 2026-04-24

-- Step 1: Create credit_notes table
CREATE TABLE IF NOT EXISTS credit_notes (
  id SERIAL PRIMARY KEY,
  credit_note_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Financial amounts
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 15.00,
  tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15,2) NOT NULL,
  
  -- Return details
  reason TEXT NOT NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'cancelled')),
  
  -- Accounting
  revenue_account_id INTEGER REFERENCES chart_of_accounts(id),
  tax_account_id INTEGER REFERENCES chart_of_accounts(id),
  discount_account_id INTEGER REFERENCES chart_of_accounts(id),
  receivable_account_id INTEGER REFERENCES chart_of_accounts(id),
  
  -- ZATCA compliance
  qr_code TEXT,
  Zatca_uuid UUID,
  
  -- Metadata
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_client ON credit_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_status ON credit_notes(status);
CREATE INDEX IF NOT EXISTS idx_credit_notes_date ON credit_notes(return_date);
CREATE INDEX IF NOT EXISTS idx_credit_notes_number ON credit_notes(credit_note_number);

-- Step 3: Create credit_note_items table for line items
CREATE TABLE IF NOT EXISTS credit_note_items (
  id SERIAL PRIMARY KEY,
  credit_note_id INTEGER NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(15,2) NOT NULL,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 15.00,
  tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note ON credit_note_items(credit_note_id);

-- Step 4: Add comments for documentation
COMMENT ON TABLE credit_notes IS 'Credit notes for sales returns (ZATCA compliant)';
COMMENT ON COLUMN credit_notes.credit_note_number IS 'Unique credit note number (CN-YYYY-NNNN)';
COMMENT ON COLUMN credit_notes.invoice_id IS 'Original sales invoice being returned';
COMMENT ON COLUMN credit_notes.status IS 'draft, final, or cancelled';
COMMENT ON COLUMN credit_notes.qr_code IS 'ZATCA QR code for compliance';
COMMENT ON COLUMN credit_note_items.credit_note_id IS 'Parent credit note';

-- Step 5: Create function to generate credit note number
CREATE OR REPLACE FUNCTION generate_credit_note_number()
RETURNS TRIGGER AS $$
DECLARE
  year INTEGER;
  next_num INTEGER;
BEGIN
  year := EXTRACT(YEAR FROM NEW.return_date);
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(credit_note_number FROM 'CN-' || year || '-(\\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM credit_notes
  WHERE credit_note_number LIKE 'CN-' || year || '-%';
  
  NEW.credit_note_number := 'CN-' || year || '-' || LPAD(next_num::TEXT, 5, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to auto-generate credit note number
DROP TRIGGER IF EXISTS trg_generate_credit_note_number ON credit_notes;
CREATE TRIGGER trg_generate_credit_note_number
  BEFORE INSERT ON credit_notes
  FOR EACH ROW
  WHEN (NEW.credit_note_number IS NULL)
  EXECUTE FUNCTION generate_credit_note_number();

-- Verification
SELECT 
  'credit_notes' AS table_name,
  COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_name = 'credit_notes'
UNION ALL
SELECT 
  'credit_note_items' AS table_name,
  COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_name = 'credit_note_items';
