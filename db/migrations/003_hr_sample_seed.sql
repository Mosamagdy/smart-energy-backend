-- Smart Energy ERP
-- Migration 003: Sample HR data for local/testing
-- Safe to run multiple times.

-- 1) Roles
INSERT INTO roles (name, description) VALUES
  ('hr_manager', 'مدير الموارد البشرية'),
  ('dept_head', 'مدير إدارة'),
  ('employee', 'موظف')
ON CONFLICT (name) DO NOTHING;

-- 2) Department
INSERT INTO departments (name, description, is_active)
VALUES ('Human Resources', 'HR Department', true)
ON CONFLICT (name) DO NOTHING;

-- 3) Test users
-- Password for all sample users: Pass@123
-- bcrypt hash generated with cost=12
WITH role_map AS (
  SELECT id, name FROM roles WHERE name IN ('hr_manager', 'dept_head', 'employee')
), dept AS (
  SELECT id FROM departments WHERE name = 'Human Resources' LIMIT 1
)
INSERT INTO users (
  role_id, first_name, last_name, email, username, password_hash, phone, status, department_id
)
SELECT
  rm.id,
  v.first_name,
  v.last_name,
  v.email,
  v.username,
  '$2b$12$CoteVjPoLX.zi3UXJ92/k.megMFo5DTtFejH1LfFtgLr3abRU6Qbi',
  v.phone,
  'active',
  (SELECT id FROM dept)
FROM (
  VALUES
    ('hr_manager', 'HR', 'Manager', 'hr.manager@smartenergy.com', 'hr_manager_test', '+201011111111'),
    ('dept_head', 'HR', 'Head', 'hr.head@smartenergy.com', 'hr_head_test', '+201022222222'),
    ('employee', 'Test', 'Employee', 'employee.test@smartenergy.com', 'employee_test', '+201033333333')
) AS v(role_name, first_name, last_name, email, username, phone)
JOIN role_map rm ON rm.name = v.role_name
ON CONFLICT (email) DO NOTHING;
