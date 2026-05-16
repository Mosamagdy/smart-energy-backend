-- Payment Vouchers Module Migration
-- Phase 3: سند الصرف (Payment Vouchers)
-- Date: April 20, 2026

-- ══════════════════════════════════════════════════════════════════════
-- TABLE 1: payment_vouchers
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_vouchers (
  id SERIAL PRIMARY KEY,
  voucher_number VARCHAR(50) NOT NULL UNIQUE, -- PV-2026-0001
  invoice_id INTEGER NOT NULL REFERENCES purchase_invoices(id) ON DELETE RESTRICT,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Payment Details
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer', -- cash, bank_transfer, check
  payment_amount NUMERIC(15,2) NOT NULL CHECK (payment_amount > 0),
  currency VARCHAR(3) DEFAULT 'SAR',
  
  -- Bank/Cash Details
  payment_account_type VARCHAR(50) NOT NULL, -- cash, bank
  bank_account_number VARCHAR(100),
  check_number VARCHAR(100),
  bank_name VARCHAR(200),
  
  -- Status & Accounting
  status VARCHAR(50) DEFAULT 'completed', -- draft, completed, cancelled
  journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL,
  
  -- Metadata
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_invoice ON payment_vouchers(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_supplier ON payment_vouchers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_date ON payment_vouchers(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_status ON payment_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_journal ON payment_vouchers(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_created_by ON payment_vouchers(created_by);

-- Comments
COMMENT ON TABLE payment_vouchers IS 'سندات الصرف - Payment vouchers for supplier invoices';
COMMENT ON COLUMN payment_vouchers.voucher_number IS 'رقم السند - Auto-generated: PV-2026-XXXX';
COMMENT ON COLUMN payment_vouchers.payment_method IS 'طريقة الدفع: cash, bank_transfer, check';
COMMENT ON COLUMN payment_vouchers.payment_account_type IS 'نوع الحساب: cash أو bank';
COMMENT ON COLUMN payment_vouchers.status IS 'الحالة: draft, completed, cancelled';

-- ══════════════════════════════════════════════════════════════════════
-- TABLE 2: purchase_invoices (ADD remaining_amount column)
-- ══════════════════════════════════════════════════════════════════════

-- Add remaining_amount if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_invoices' AND column_name = 'remaining_amount'
  ) THEN
    ALTER TABLE purchase_invoices ADD COLUMN remaining_amount NUMERIC(15,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED;
  END IF;
END $$;

-- Add constraint to prevent overpayment
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'chk_paid_amount'
  ) THEN
    ALTER TABLE purchase_invoices ADD CONSTRAINT chk_paid_amount CHECK (paid_amount >= 0 AND paid_amount <= total_amount);
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN purchase_invoices.remaining_amount IS 'المبلغ المتبقي - Auto-calculated: total_amount - paid_amount';
COMMENT ON CONSTRAINT chk_paid_amount ON purchase_invoices IS 'Prevent overpayment: paid_amount cannot exceed total_amount';

-- ══════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ══════════════════════════════════════════════════════════════════════

-- Check if tables were created
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('payment_vouchers');

-- Check payment_vouchers columns
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'payment_vouchers'
-- ORDER BY ordinal_position;

-- Check purchase_invoices constraints
-- SELECT constraint_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_name = 'purchase_invoices' AND constraint_name LIKE 'chk_%';
