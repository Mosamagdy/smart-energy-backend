-- Migration 031: Add Employee Leave Balances and Document URL to Leave Requests
-- Smart Energy ERP - Leaves & Vacations Module Enhancement

-- 1) Add document_url column to leave_requests
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS document_url TEXT;

-- 2) Create employee_leave_balances table
CREATE TABLE IF NOT EXISTS employee_leave_balances (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON UPDATE CASCADE ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL,
  total_allowed INTEGER NOT NULL DEFAULT 21,
  used INTEGER NOT NULL DEFAULT 0,
  remaining INTEGER NOT NULL DEFAULT 21,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_id ON employee_leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_leave_type ON employee_leave_balances(leave_type);

-- 3) Initialize leave balances for all active employees (21 days annual leave)
INSERT INTO employee_leave_balances (employee_id, leave_type, total_allowed, used, remaining)
SELECT 
  e.id AS employee_id,
  'annual' AS leave_type,
  21 AS total_allowed,
  0 AS used,
  21 AS remaining
FROM employees e
WHERE e.status = 'active'
ON CONFLICT (employee_id, leave_type) DO NOTHING;

-- Also initialize sick leave (10 days default)
INSERT INTO employee_leave_balances (employee_id, leave_type, total_allowed, used, remaining)
SELECT 
  e.id AS employee_id,
  'sick' AS leave_type,
  10 AS total_allowed,
  0 AS used,
  10 AS remaining
FROM employees e
WHERE e.status = 'active'
ON CONFLICT (employee_id, leave_type) DO NOTHING;
