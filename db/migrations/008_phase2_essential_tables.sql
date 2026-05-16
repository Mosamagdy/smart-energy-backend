-- Quick PHASE 2 Tables Setup (Essential Only)
-- For full-cycle testing

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id SERIAL PRIMARY KEY,
  account_code VARCHAR(50) UNIQUE NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  account_type VARCHAR(50) NOT NULL, -- asset, liability, equity, revenue, expense
  parent_id INTEGER REFERENCES chart_of_accounts(id),
  normal_balance VARCHAR(10) NOT NULL DEFAULT 'debit', -- debit or credit
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  reference_type VARCHAR(50), -- invoice, payment, expense, petty_cash_fund
  reference_id INTEGER,
  project_id INTEGER REFERENCES projects(id),
  contract_id INTEGER, -- Will add FK later when contracts table exists
  created_by INTEGER REFERENCES users(id),
  is_posted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Journal Entry Lines
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id SERIAL PRIMARY KEY,
  journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
  description TEXT,
  debit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  credit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Petty Cash Funds
CREATE TABLE IF NOT EXISTS petty_cash_funds (
  id SERIAL PRIMARY KEY,
  fund_name VARCHAR(200) NOT NULL,
  engineer_id INTEGER REFERENCES users(id),
  project_id INTEGER REFERENCES projects(id),
  initial_amount DECIMAL(15, 2) NOT NULL,
  current_balance DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'SAR',
  status VARCHAR(30) DEFAULT 'active',
  approved_by INTEGER REFERENCES users(id),
  last_reconciliation_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Petty Cash Transactions
CREATE TABLE IF NOT EXISTS petty_cash_transactions (
  id SERIAL PRIMARY KEY,
  petty_cash_fund_id INTEGER NOT NULL REFERENCES petty_cash_funds(id),
  transaction_type VARCHAR(50) NOT NULL, -- fund, expense, reimbursement
  amount DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  expense_id INTEGER,
  description TEXT,
  receipt_url VARCHAR(500),
  performed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  expense_number VARCHAR(100) UNIQUE NOT NULL,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
  amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(50), -- petty_cash, cash, bank_transfer
  petty_cash_fund_id INTEGER REFERENCES petty_cash_funds(id),
  description TEXT,
  receipt_url VARCHAR(500),
  notes TEXT,
  status VARCHAR(30) DEFAULT 'pending', -- pending, approved, rejected
  created_by INTEGER REFERENCES users(id),
  expense_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default COA accounts if they don't exist
INSERT INTO chart_of_accounts (account_code, account_name, account_type, normal_balance) VALUES
('1000', 'Assets', 'asset', 'debit'),
('1100', 'Current Assets', 'asset', 'debit'),
('1110', 'Accounts Receivable', 'asset', 'debit'),
('1120', 'Cash and Bank', 'asset', 'debit'),
('1310', 'Cash on Hand', 'asset', 'debit'),
('1320', 'Petty Cash', 'asset', 'debit'),
('1330', 'Bank Account', 'asset', 'debit'),
('2000', 'Liabilities', 'liability', 'credit'),
('2100', 'Current Liabilities', 'liability', 'credit'),
('2110', 'VAT Payable', 'liability', 'credit'),
('4000', 'Revenue', 'revenue', 'credit'),
('4100', 'Project Revenue', 'revenue', 'credit'),
('4120', 'Construction Revenue', 'revenue', 'credit'),
('5000', 'Expenses', 'expense', 'debit'),
('5100', 'Project Expenses', 'expense', 'debit'),
('5110', 'Materials Expense', 'expense', 'debit')
ON CONFLICT (account_code) DO NOTHING;

COMMENT ON TABLE chart_of_accounts IS 'Recursive tree structure for accounting';
COMMENT ON TABLE journal_entries IS 'Double-entry accounting core';
COMMENT ON TABLE journal_entry_lines IS 'Individual debit/credit lines';
COMMENT ON TABLE petty_cash_funds IS 'Engineer petty cash management';
COMMENT ON TABLE expenses IS 'Site expense tracking';
