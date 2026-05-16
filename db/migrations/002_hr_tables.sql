-- Smart Energy ERP
-- Migration 002: Create/repair HR tables (employees, leave_requests)
-- Idempotent and safe for existing databases.

-- 1) Employees table (create if missing)
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  department_id INTEGER REFERENCES departments(id) ON UPDATE CASCADE ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  arabic_name VARCHAR(255),
  nationality VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(20),
  marital_status VARCHAR(20),
  religion VARCHAR(50),
  personal_email VARCHAR(255) NOT NULL UNIQUE,
  personal_phone VARCHAR(30) NOT NULL,
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(30),
  passport_number VARCHAR(100),
  passport_expiry DATE,
  passport_file_path TEXT,
  national_id VARCHAR(100),
  national_id_expiry DATE,
  national_id_file_path TEXT,
  residence_permit VARCHAR(100),
  residence_expiry DATE,
  residence_file_path TEXT,
  employee_number VARCHAR(50) NOT NULL UNIQUE,
  job_title VARCHAR(150),
  employment_type VARCHAR(30) NOT NULL DEFAULT 'full_time',
  contract_start_date DATE,
  contract_end_date DATE,
  contract_file_path TEXT,
  probation_end_date DATE,
  basic_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
  housing_allowance NUMERIC(14,2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(14,2) NOT NULL DEFAULT 0,
  other_allowances NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'SAR',
  bank_name VARCHAR(255),
  bank_account VARCHAR(100),
  iban VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
  created_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Backfill missing columns in partially-existing employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employees_department_id_fkey'
      AND conrelid = 'employees'::regclass
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT employees_department_id_fkey
      FOREIGN KEY (department_id) REFERENCES departments(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON employees(created_at DESC);

-- 2) Leave requests table (create if missing)
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON UPDATE CASCADE ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL CHECK (days_count > 0),
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

-- Backfill missing columns in partially-existing leave_requests table
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS approved_by INTEGER;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leave_requests_approved_by_fkey'
      AND conrelid = 'leave_requests'::regclass
  ) THEN
    ALTER TABLE leave_requests
      ADD CONSTRAINT leave_requests_approved_by_fkey
      FOREIGN KEY (approved_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
