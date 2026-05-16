-- ============================================================================
-- PHASE 2: Contracts Management & Finance Module
-- Smart Energy ERP System
-- ============================================================================

-- ============================================================================
-- 1. CONTRACTS MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  contract_number VARCHAR(100) UNIQUE NOT NULL,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contract_type VARCHAR(50) NOT NULL DEFAULT 'service', -- service, maintenance, supply
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_value DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'SAR',
  payment_terms TEXT, -- JSON: {milestones: [{percentage, amount, description}]}
  description TEXT,
  attachment_url VARCHAR(500), -- PDF upload path
  status VARCHAR(30) NOT NULL DEFAULT 'active', -- active, expired, terminated, pending_signature
  signed_by_client BOOLEAN DEFAULT FALSE,
  signed_by_company BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON contracts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_number ON contracts(contract_number);

-- Comments
COMMENT ON TABLE contracts IS 'Contract management linked to projects and clients';
COMMENT ON COLUMN contracts.contract_type IS 'Type: service, maintenance, supply';
COMMENT ON COLUMN contracts.payment_terms IS 'JSON structure with payment milestones';
COMMENT ON COLUMN contracts.status IS 'Status: active, expired, terminated, pending_signature';

-- ============================================================================
-- 2. CHART OF ACCOUNTS (Tree Structure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id SERIAL PRIMARY KEY,
  account_code VARCHAR(20) UNIQUE NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  account_type VARCHAR(50) NOT NULL, -- asset, liability, equity, revenue, expense
  parent_id INTEGER REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  level INTEGER NOT NULL DEFAULT 1,
  normal_balance VARCHAR(10) NOT NULL DEFAULT 'debit', -- debit or credit
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recursive index for tree queries
CREATE INDEX IF NOT EXISTS idx_coa_parent_id ON chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_coa_level ON chart_of_accounts(level);
CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(account_type);

-- Comments
COMMENT ON TABLE chart_of_accounts IS 'Chart of Accounts with recursive tree structure';
COMMENT ON COLUMN chart_of_accounts.account_code IS 'Unique account code (e.g., 1000, 1100, 1110)';
COMMENT ON COLUMN chart_of_accounts.parent_id IS 'Parent account for hierarchical structure';
COMMENT ON COLUMN chart_of_accounts.level IS 'Account level in hierarchy (1=root, 2=sub, 3=detail)';

-- ============================================================================
-- 3. PETTY CASH & ENGINEER SUB-ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS petty_cash_funds (
  id SERIAL PRIMARY KEY,
  fund_name VARCHAR(200) NOT NULL,
  engineer_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  initial_amount DECIMAL(15, 2) NOT NULL,
  current_balance DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'SAR',
  status VARCHAR(30) NOT NULL DEFAULT 'active', -- active, suspended, closed
  last_reconciliation_date TIMESTAMP WITH TIME ZONE,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_petty_cash_engineer ON petty_cash_funds(engineer_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_project ON petty_cash_funds(project_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_status ON petty_cash_funds(status);

COMMENT ON TABLE petty_cash_funds IS 'Petty cash funds assigned to engineers for site expenses';

-- ============================================================================
-- 4. INVOICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_type VARCHAR(50) NOT NULL DEFAULT 'progress', -- progress, final, advance, credit_note
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal DECIMAL(15, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 15.00,
  tax_amount DECIMAL(15, 2) DEFAULT 0.00,
  total_amount DECIMAL(15, 2) NOT NULL,
  amount_paid DECIMAL(15, 2) DEFAULT 0.00,
  outstanding_amount DECIMAL(15, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  status VARCHAR(30) NOT NULL DEFAULT 'draft', -- draft, sent, paid, partial, overdue, cancelled
  payment_terms TEXT,
  notes TEXT,
  attachment_url VARCHAR(500), -- Invoice PDF
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_contract ON invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_dates ON invoices(issue_date, due_date);

COMMENT ON TABLE invoices IS 'Customer invoices linked to contracts and projects';
COMMENT ON COLUMN invoices.invoice_type IS 'Type: progress, final, advance, credit_note';

-- ============================================================================
-- 5. JOURNAL ENTRIES (Double-Entry Accounting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  entry_number VARCHAR(100) UNIQUE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  reference_type VARCHAR(50), -- invoice, payment, expense, petty_cash
  reference_id INTEGER, -- ID of the source document
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
  posted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_posted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_entry_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_reference ON journal_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_journal_project ON journal_entries(project_id);

COMMENT ON TABLE journal_entries IS 'General journal entries for double-entry accounting';
COMMENT ON COLUMN journal_entries.is_posted IS 'True when entry is finalized and cannot be modified';

-- ============================================================================
-- 6. JOURNAL ENTRY LINES (Debits & Credits)
-- ============================================================================

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id SERIAL PRIMARY KEY,
  journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  description TEXT,
  debit_amount DECIMAL(15, 2) DEFAULT 0.00,
  credit_amount DECIMAL(15, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_entry_lines(account_id);

-- Constraint: Each entry must balance (debits = credits)
-- This is enforced at application layer

COMMENT ON TABLE journal_entry_lines IS 'Individual debit/credit lines in journal entries';
COMMENT ON COLUMN journal_entry_lines.debit_amount IS 'Debit amount (positive)';
COMMENT ON COLUMN journal_entry_lines.credit_amount IS 'Credit amount (positive)';

-- ============================================================================
-- 7. EXPENSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  expense_number VARCHAR(100) UNIQUE NOT NULL,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_name VARCHAR(200),
  category VARCHAR(100), -- materials, labor, equipment, travel, misc
  account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  amount DECIMAL(15, 2) NOT NULL,
  tax_amount DECIMAL(15, 2) DEFAULT 0.00,
  total_amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(50), -- cash, petty_cash, bank_transfer, credit_card
  petty_cash_fund_id INTEGER REFERENCES petty_cash_funds(id) ON DELETE SET NULL,
  receipt_url VARCHAR(500), -- Receipt image/PDF
  description TEXT,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, reimbursed
  submitted_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_account ON expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_petty_cash ON expenses(petty_cash_fund_id);

COMMENT ON TABLE expenses IS 'Project expenses linked to COA accounts and petty cash';
COMMENT ON COLUMN expenses.payment_method IS 'Payment method: cash, petty_cash, bank_transfer, credit_card';

-- ============================================================================
-- 8. PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  payment_number VARCHAR(100) UNIQUE NOT NULL,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- bank_transfer, check, cash, online
  reference_number VARCHAR(200), -- Bank reference, check number
  bank_name VARCHAR(200),
  notes TEXT,
  received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

COMMENT ON TABLE payments IS 'Customer payments against invoices';

-- ============================================================================
-- 9. PETTY CASH TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS petty_cash_transactions (
  id SERIAL PRIMARY KEY,
  petty_cash_fund_id INTEGER NOT NULL REFERENCES petty_cash_funds(id) ON DELETE CASCADE,
  transaction_type VARCHAR(30) NOT NULL, -- fund, expense, reimbursement
  amount DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  expense_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL,
  description TEXT,
  receipt_url VARCHAR(500),
  performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pct_fund ON petty_cash_transactions(petty_cash_fund_id);
CREATE INDEX IF NOT EXISTS idx_pct_expense ON petty_cash_transactions(expense_id);

COMMENT ON TABLE petty_cash_transactions IS 'Transaction history for petty cash funds';

-- ============================================================================
-- SEED DATA: Chart of Accounts (Tree Structure)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id, level, normal_balance, description) VALUES
-- Level 1: Main Categories
('1000', 'Assets', 'asset', NULL, 1, 'debit', 'All asset accounts'),
('2000', 'Liabilities', 'liability', NULL, 1, 'credit', 'All liability accounts'),
('3000', 'Equity', 'equity', NULL, 1, 'credit', 'Owner''s equity'),
('4000', 'Revenue', 'revenue', NULL, 1, 'credit', 'Income and revenue'),
('5000', 'Expenses', 'expense', NULL, 1, 'debit', 'Operating expenses'),

-- Level 2: Asset Sub-categories
('1100', 'Current Assets', 'asset', 1, 2, 'debit', 'Short-term assets'),
('1200', 'Fixed Assets', 'asset', 1, 2, 'debit', 'Long-term tangible assets'),
('1300', 'Cash & Cash Equivalents', 'asset', 1, 2, 'debit', 'Cash and bank balances'),

-- Level 2: Liability Sub-categories
('2100', 'Current Liabilities', 'liability', 2, 2, 'credit', 'Short-term liabilities'),
('2200', 'Long-term Liabilities', 'liability', 2, 2, 'credit', 'Long-term debt'),

-- Level 2: Revenue Sub-categories
('4100', 'Sales Revenue', 'revenue', 4, 2, 'credit', 'Revenue from sales'),
('4200', 'Service Revenue', 'revenue', 4, 2, 'credit', 'Revenue from services'),

-- Level 3: Current Assets Detail
('1110', 'Accounts Receivable', 'asset', 5, 3, 'debit', 'Money owed by customers'),
('1120', 'Inventory', 'asset', 5, 3, 'debit', 'Goods and materials'),
('1130', 'Prepaid Expenses', 'asset', 5, 3, 'debit', 'Prepaid costs'),

-- Level 3: Fixed Assets Detail
('1210', 'Property & Equipment', 'asset', 6, 3, 'debit', 'Buildings and equipment'),
('1220', 'Accumulated Depreciation', 'asset', 6, 3, 'credit', 'Accumulated depreciation contra-account'),

-- Level 3: Cash Detail
('1310', 'Cash on Hand', 'asset', 7, 3, 'debit', 'Physical cash'),
('1320', 'Petty Cash', 'asset', 7, 3, 'debit', 'Petty cash funds'),
('1330', 'Bank Accounts', 'asset', 7, 3, 'debit', 'Bank balances'),

-- Level 3: Current Liabilities Detail
('2110', 'Accounts Payable', 'liability', 8, 3, 'credit', 'Money owed to suppliers'),
('2120', 'Accrued Expenses', 'liability', 8, 3, 'credit', 'Accrued but unpaid expenses'),
('2130', 'Unearned Revenue', 'liability', 8, 3, 'credit', 'Advance payments from customers'),

-- Level 3: Sales Revenue Detail
('4110', 'Product Sales', 'revenue', 10, 3, 'credit', 'Revenue from product sales'),
('4120', 'Project Revenue', 'revenue', 10, 3, 'credit', 'Revenue from projects'),

-- Level 3: Service Revenue Detail
('4210', 'Maintenance Services', 'revenue', 11, 3, 'credit', 'Revenue from maintenance'),
('4220', 'Consulting Services', 'revenue', 11, 3, 'credit', 'Revenue from consulting'),

-- Level 3: Expense Detail
('5100', 'Cost of Goods Sold', 'expense', 5, 2, 'debit', 'Direct costs of products sold'),
('5110', 'Materials Expense', 'expense', 25, 3, 'debit', 'Cost of materials used'),
('5120', 'Labor Expense', 'expense', 25, 3, 'debit', 'Direct labor costs'),
('5200', 'Operating Expenses', 'expense', 5, 2, 'debit', 'General operating costs'),
('5210', 'Salaries & Wages', 'expense', 28, 3, 'debit', 'Employee compensation'),
('5220', 'Rent Expense', 'expense', 28, 3, 'debit', 'Office/facility rent'),
('5230', 'Utilities Expense', 'expense', 28, 3, 'debit', 'Electricity, water, internet'),
('5240', 'Travel Expense', 'expense', 28, 3, 'debit', 'Business travel costs'),
('5250', 'Office Supplies', 'expense', 28, 3, 'debit', 'Office consumables');

-- Update parent references with correct IDs
UPDATE chart_of_accounts c SET parent_id = p.id
FROM chart_of_accounts p
WHERE c.parent_id IS NOT NULL AND c.account_code LIKE p.account_code || '%' 
AND LENGTH(c.account_code) > LENGTH(p.account_code);

-- Recalculate levels based on hierarchy
WITH RECURSIVE account_hierarchy AS (
  SELECT id, account_code, parent_id, 1 as level
  FROM chart_of_accounts
  WHERE parent_id IS NULL
  
  UNION ALL
  
  SELECT c.id, c.account_code, c.parent_id, ah.level + 1
  FROM chart_of_accounts c
  INNER JOIN account_hierarchy ah ON c.parent_id = ah.id
)
UPDATE chart_of_accounts c
SET level = ah.level
FROM account_hierarchy ah
WHERE c.id = ah.id;

-- Create view for account tree
CREATE OR REPLACE VIEW v_chart_of_accounts_tree AS
WITH RECURSIVE account_tree AS (
  SELECT 
    id,
    account_code,
    account_name,
    account_type,
    parent_id,
    level,
    account_code as full_path,
    account_name as full_name
  FROM chart_of_accounts
  WHERE parent_id IS NULL
  
  UNION ALL
  
  SELECT 
    c.id,
    c.account_code,
    c.account_name,
    c.account_type,
    c.parent_id,
    c.level,
    at.full_path || ' > ' || c.account_code,
    at.full_name || ' - ' || c.account_name
  FROM chart_of_accounts c
  INNER JOIN account_tree at ON c.parent_id = at.id
)
SELECT * FROM account_tree
ORDER BY full_path;

COMMENT ON VIEW v_chart_of_accounts_tree IS 'Hierarchical view of chart of accounts with full paths';

-- ============================================================================
-- VALIDATION: Ensure all tables created successfully
-- ============================================================================

SELECT 
  'Contracts' as table_name, COUNT(*) as row_count FROM contracts
UNION ALL
SELECT 'Chart of Accounts', COUNT(*) FROM chart_of_accounts
UNION ALL
SELECT 'Petty Cash Funds', COUNT(*) FROM petty_cash_funds
UNION ALL
SELECT 'Invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'Journal Entries', COUNT(*) FROM journal_entries
UNION ALL
SELECT 'Journal Entry Lines', COUNT(*) FROM journal_entry_lines
UNION ALL
SELECT 'Expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'Payments', COUNT(*) FROM payments
UNION ALL
SELECT 'Petty Cash Transactions', COUNT(*) FROM petty_cash_transactions;
