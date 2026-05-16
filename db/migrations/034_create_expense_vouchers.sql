-- Migration: Create Expense Vouchers Table
-- Date: 2026-04-20
-- Purpose: Track general expenses with automatic journal entries

CREATE TABLE IF NOT EXISTS expense_vouchers (
  id SERIAL PRIMARY KEY,
  voucher_number VARCHAR(50) NOT NULL UNIQUE, -- EX-2026-0001
  
  -- Expense Details
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_amount NUMERIC(15,2) NOT NULL CHECK (expense_amount > 0),
  
  -- Account References (Official COA)
  expense_account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id), -- 32xxx branch
  payment_account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id), -- 12301 (Cash) or 122 (Bank)
  
  -- Payment Method
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash', -- 'cash' or 'bank_transfer'
  
  -- Additional Info
  description TEXT NOT NULL,
  reference_number VARCHAR(100), -- Receipt number, invoice number, etc.
  notes TEXT,
  
  -- Approval Workflow
  status VARCHAR(50) DEFAULT 'completed', -- 'draft', 'pending', 'completed', 'cancelled'
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Journal Entry Link
  journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expense_vouchers_number ON expense_vouchers(voucher_number);
CREATE INDEX IF NOT EXISTS idx_expense_vouchers_date ON expense_vouchers(expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_vouchers_expense_account ON expense_vouchers(expense_account_id);
CREATE INDEX IF NOT EXISTS idx_expense_vouchers_payment_account ON expense_vouchers(payment_account_id);
CREATE INDEX IF NOT EXISTS idx_expense_vouchers_journal_entry ON expense_vouchers(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_expense_vouchers_status ON expense_vouchers(status);

-- Comments
COMMENT ON TABLE expense_vouchers IS 'General expense vouchers with automatic journal entry generation';
COMMENT ON COLUMN expense_vouchers.voucher_number IS 'Auto-generated format: EX-YYYY-XXXX';
COMMENT ON COLUMN expense_vouchers.expense_account_id IS 'References COA 32xxx (Administrative Expenses)';
COMMENT ON COLUMN expense_vouchers.payment_account_id IS 'References COA 12301 (Cash) or 122 (Bank)';
COMMENT ON COLUMN expense_vouchers.journal_entry_id IS 'Link to auto-generated journal entry';

-- Verify COA accounts exist for expenses
DO $$
BEGIN
  -- Verify expense accounts exist (32xxx)
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE account_code = '32' AND is_active = true) THEN
    RAISE EXCEPTION 'COA account 32 (Administrative Expenses) not found';
  END IF;
  
  -- Verify payment accounts exist
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE account_code = '12301' AND is_active = true) THEN
    RAISE EXCEPTION 'COA account 12301 (Cash on Hand) not found';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE account_code = '122' AND is_active = true) THEN
    RAISE EXCEPTION 'COA account 122 (Bank Accounts) not found';
  END IF;
  
  RAISE NOTICE 'All required COA accounts verified';
END $$;
