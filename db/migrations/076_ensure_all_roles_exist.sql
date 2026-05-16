-- Smart Energy ERP
-- Migration 076: Ensure all required roles exist for automatic job_title mapping
-- This migration creates any missing roles that are needed for the HR module

-- Insert all required roles (ON CONFLICT DO NOTHING ensures idempotency)
INSERT INTO roles (name, description) VALUES
  ('super_admin', 'System Administrator - Full technical access'),
  ('general_manager', 'General Manager - Full administrative access'),
  ('hr_manager', 'HR Manager - Human Resources management'),
  ('finance_manager', 'Finance Manager - Financial operations and reporting'),
  ('project_manager', 'Project Manager - Project planning and execution'),
  ('dept_head', 'Department Head - Department-level management'),
  ('sales_rep', 'Sales Representative - Lead and sales management'),
  ('engineer', 'Engineer - Technical and project execution'),
  ('quotation_specialist', 'Quotation Specialist - Quotation creation and management'),
  ('warehouse_manager', 'Warehouse Manager - Inventory and warehouse operations'),
  ('procurement_manager', 'Procurement Manager - Purchasing and supplier management'),
  ('contract_dept_head', 'Contract Department Head - Contract management'),
  ('employee', 'Employee - General employee role')
ON CONFLICT (name) DO NOTHING;

-- Verify roles were created
SELECT id, name, description 
FROM roles 
ORDER BY id;
