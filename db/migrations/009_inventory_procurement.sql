-- ============================================================================
-- PHASE 6: INVENTORY & PROCUREMENT MODULE MIGRATION
-- ============================================================================

-- 1. Add department_id to inventory_items for departmental isolation
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_items_department 
ON inventory_items(department_id);

-- Add comment for documentation
COMMENT ON COLUMN inventory_items.department_id IS 'Department responsible for this inventory item';

-- ============================================================================
-- 2. PURCHASE REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase_requests (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON UPDATE CASCADE ON DELETE SET NULL,
  requested_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'procurement_approved', 'finance_approved', 'completed', 'rejected')),
  total_amount NUMERIC(16,2),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes TEXT,
  procurement_approval_notes TEXT,
  finance_approval_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  procurement_approved_at TIMESTAMP WITH TIME ZONE,
  finance_approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Purchase Request Items (line items)
CREATE TABLE IF NOT EXISTS purchase_request_items (
  id SERIAL PRIMARY KEY,
  purchase_request_id INTEGER REFERENCES purchase_requests(id) ON UPDATE CASCADE ON DELETE CASCADE,
  inventory_item_id INTEGER REFERENCES inventory_items(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  item_name VARCHAR(255) NOT NULL, -- Snapshot of item name at time of request
  quantity_requested INTEGER NOT NULL CHECK (quantity_requested > 0),
  quantity_approved INTEGER CHECK (quantity_approved >= 0),
  unit_price NUMERIC(16,2),
  total_price NUMERIC(16,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_requests_project 
ON purchase_requests(project_id);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_status 
ON purchase_requests(status);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_requested_by 
ON purchase_requests(requested_by);

CREATE INDEX IF NOT EXISTS idx_purchase_request_items_request 
ON purchase_request_items(purchase_request_id);

CREATE INDEX IF NOT EXISTS idx_purchase_request_items_item 
ON purchase_request_items(inventory_item_id);

-- Comments for documentation
COMMENT ON TABLE purchase_requests IS 'Tracks material purchase requests from projects through approval workflow';
COMMENT ON COLUMN purchase_requests.project_id IS 'Project that initiated the request';
COMMENT ON COLUMN purchase_requests.requested_by IS 'User who created the request (typically PM)';
COMMENT ON COLUMN purchase_requests.status IS 'Workflow status: pending → procurement_approved → finance_approved → completed';

-- ============================================================================
-- 3. CHART OF ACCOUNTS (COA) - Finance Module Foundation
-- ============================================================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id SERIAL PRIMARY KEY,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  account_subtype VARCHAR(50), -- More granular classification
  code VARCHAR(20) UNIQUE NOT NULL, -- Account code (e.g., 1000, 2000, etc.)
  parent_account_id INTEGER REFERENCES chart_of_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_coa_parent 
ON chart_of_accounts(parent_account_id);

CREATE INDEX IF NOT EXISTS idx_coa_code 
ON chart_of_accounts(code);

CREATE INDEX IF NOT EXISTS idx_coa_type 
ON chart_of_accounts(account_type);

-- Comments
COMMENT ON TABLE chart_of_accounts IS 'Chart of Accounts for financial tracking and journal entries';
COMMENT ON COLUMN chart_of_accounts.account_type IS 'Main account category: asset, liability, equity, revenue, expense';
COMMENT ON COLUMN chart_of_accounts.account_subtype IS 'Sub-category: e.g., Current Assets, Fixed Assets, Direct Expenses';

-- ============================================================================
-- 4. JOURNAL ENTRIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('debit', 'credit')),
  amount NUMERIC(16,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  reference_type VARCHAR(50), -- e.g., 'purchase_request', 'invoice', 'payment'
  reference_id INTEGER, -- ID of the referencing entity
  project_id INTEGER REFERENCES projects(id) ON UPDATE CASCADE ON DELETE SET NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  posted_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  is_posted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for financial reporting
CREATE INDEX IF NOT EXISTS idx_journal_entries_account 
ON journal_entries(account_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_project 
ON journal_entries(project_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_reference 
ON journal_entries(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_date 
ON journal_entries(transaction_date);

-- Comments
COMMENT ON TABLE journal_entries IS 'Double-entry bookkeeping journal entries';
COMMENT ON COLUMN journal_entries.reference_type IS 'Type of source document (purchase_request, invoice, etc.)';
COMMENT ON COLUMN journal_entries.reference_id IS 'ID of the source document';
COMMENT ON COLUMN journal_entries.is_posted IS 'Whether entry has been posted to ledger';

-- ============================================================================
-- 5. SEED DATA: CHART OF ACCOUNTS
-- ============================================================================

-- Insert main account categories if not exists
INSERT INTO chart_of_accounts (account_name, account_type, account_subtype, code, description) VALUES
  -- ASSETS (1000-1999)
  ('Cash and Cash Equivalents', 'asset', 'current_asset', '1000', 'Main cash accounts'),
  ('Bank Account', 'asset', 'current_asset', '1010', 'Primary business bank account'),
  ('Petty Cash', 'asset', 'current_asset', '1020', 'Small cash fund for minor expenses'),
  ('Accounts Receivable', 'asset', 'current_asset', '1100', 'Money owed by customers'),
  ('Inventory', 'asset', 'inventory', '1200', 'Raw materials and supplies inventory'),
  ('Inventory - Raw Materials', 'asset', 'inventory', '1210', 'Raw materials stock'),
  ('Inventory - Finished Goods', 'asset', 'inventory', '1220', 'Completed products ready for sale'),
  
  -- LIABILITIES (2000-2999)
  ('Accounts Payable', 'liability', 'current_liability', '2000', 'Money owed to suppliers'),
  ('Accrued Expenses', 'liability', 'current_liability', '2100', 'Expenses incurred but not yet paid'),
  
  -- EQUITY (3000-3999)
  ('Share Capital', 'equity', 'paid_in_capital', '3000', 'Owner investments in the company'),
  ('Retained Earnings', 'equity', 'retained_earnings', '3100', 'Accumulated profits/losses'),
  
  -- REVENUE (4000-4999)
  ('Sales Revenue', 'revenue', 'operating_revenue', '4000', 'Revenue from primary business activities'),
  ('Service Revenue', 'revenue', 'operating_revenue', '4100', 'Revenue from services provided'),
  
  -- EXPENSES (5000-5999)
  ('Cost of Goods Sold', 'expense', 'cogs', '5000', 'Direct costs attributable to production'),
  ('Inventory Expense', 'expense', 'cogs', '5100', 'Cost of inventory used/sold'),
  ('Project Expenses', 'expense', 'direct_expense', '5200', 'Direct expenses for specific projects'),
  ('Materials Expense', 'expense', 'direct_expense', '5210', 'Materials consumed in projects'),
  ('Operating Expenses', 'expense', 'operating_expense', '6000', 'General operating costs'),
  ('Salaries and Wages', 'expense', 'operating_expense', '6100', 'Employee compensation'),
  ('Rent Expense', 'expense', 'operating_expense', '6200', 'Office/facility rent'),
  ('Utilities', 'expense', 'operating_expense', '6300', 'Electricity, water, internet')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 6. ADD ROLES IF NOT EXISTS
-- ============================================================================

-- Ensure procurement_manager role exists
INSERT INTO roles (name, description) 
VALUES ('procurement_manager', 'Manages procurement and purchase approvals')
ON CONFLICT (name) DO NOTHING;

-- Get the role ID for procurement_manager
DO $$
DECLARE
  proc_role_id INTEGER;
BEGIN
  SELECT id INTO proc_role_id FROM roles WHERE name = 'procurement_manager';
  
  -- Grant procurement manager access to purchase requests
  RAISE NOTICE 'Procurement Manager role ID: %', proc_role_id;
END $$;

-- ============================================================================
-- 7. UPDATE EXISTING TABLES (if needed)
-- ============================================================================

-- Add assigned_sales_rep_id to projects if not exists (based on your recent changes)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS assigned_sales_rep_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Add quotation_id to projects if not exists
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS quotation_id INTEGER REFERENCES quotations(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_projects_sales_rep 
ON projects(assigned_sales_rep_id);

CREATE INDEX IF NOT EXISTS idx_projects_quotation 
ON projects(quotation_id);

-- ============================================================================
-- 8. USEFUL VIEWS FOR REPORTING
-- ============================================================================

-- Low Stock Alert View
CREATE OR REPLACE VIEW v_low_stock_items AS
SELECT 
  i.id,
  i.name,
  i.sku,
  i.quantity as current_stock,
  i.minimum_threshold,
  i.department_id,
  d.name as department_name,
  CASE 
    WHEN i.quantity = 0 THEN 'Out of Stock'
    WHEN i.quantity < i.minimum_threshold THEN 'Low Stock'
    ELSE 'In Stock'
  END as stock_status,
  (i.minimum_threshold - i.quantity) as quantity_needed
FROM inventory_items i
LEFT JOIN departments d ON d.id = i.department_id
WHERE i.quantity <= i.minimum_threshold
ORDER BY i.quantity ASC;

-- Purchase Requests Summary View
CREATE OR REPLACE VIEW v_purchase_requests_summary AS
SELECT 
  pr.id,
  pr.project_id,
  p.name as project_name,
  pr.requested_by,
  u.first_name || ' ' || u.last_name as requester_name,
  pr.status,
  pr.total_amount,
  pr.priority,
  pr.created_at,
  COUNT(pr_items.id) as line_items_count
FROM purchase_requests pr
LEFT JOIN projects p ON p.id = pr.project_id
LEFT JOIN users u ON u.id = pr.requested_by
LEFT JOIN purchase_request_items pr_items ON pr_items.purchase_request_id = pr.id
GROUP BY pr.id, p.name, u.first_name, u.last_name
ORDER BY pr.created_at DESC;

-- Journal Entry Balance View
CREATE OR REPLACE VIEW v_trial_balance AS
SELECT 
  ca.id as account_id,
  ca.account_name,
  ca.code,
  ca.account_type,
  COALESCE(SUM(CASE WHEN je.entry_type = 'debit' THEN je.amount ELSE 0 END), 0) as total_debits,
  COALESCE(SUM(CASE WHEN je.entry_type = 'credit' THEN je.amount ELSE 0 END), 0) as total_credits,
  COALESCE(SUM(CASE WHEN je.entry_type = 'debit' THEN je.amount ELSE -je.amount END), 0) as balance
FROM chart_of_accounts ca
LEFT JOIN journal_entries je ON je.account_id = ca.id AND je.is_posted = TRUE
WHERE ca.is_active = TRUE
GROUP BY ca.id, ca.account_name, ca.code, ca.account_type
ORDER BY ca.code;

-- ============================================================================
-- 9. FINAL VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables created
SELECT 
  'Migration Status' as check_type,
  COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('inventory_items', 'purchase_requests', 'purchase_request_items', 
                     'chart_of_accounts', 'journal_entries');

-- Verify seed data loaded
SELECT 
  'Chart of Accounts Loaded' as check_type,
  COUNT(*) as account_count
FROM chart_of_accounts;

-- Verify roles
SELECT 
  'Roles Available' as check_type,
  STRING_AGG(name, ', ') as roles
FROM roles 
WHERE name IN ('procurement_manager', 'inventory_head', 'project_manager');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
