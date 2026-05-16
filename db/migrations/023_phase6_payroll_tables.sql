BEGIN;

-- ============================================================================
-- Migration 023: Create Payroll & HR Tables
-- ============================================================================
-- Creates 4 tables: employees, payroll_runs, payroll_lines, end_of_service
-- ============================================================================

-- 1. Employees
CREATE TABLE IF NOT EXISTS employees (
  id                  SERIAL PRIMARY KEY,
  employee_code       VARCHAR(50) UNIQUE NOT NULL,  -- e.g. EMP-0001
  full_name           VARCHAR(255) NOT NULL,
  full_name_ar        VARCHAR(255),
  department          VARCHAR(50) NOT NULL,  -- sales | design | operations | admin
  job_title           VARCHAR(255),
  national_id         VARCHAR(50),
  iqama_number        VARCHAR(50),
  nationality         VARCHAR(50) DEFAULT 'Saudi',
  hire_date           DATE NOT NULL,
  basic_salary        NUMERIC(15,2) NOT NULL DEFAULT 0,
  housing_allowance   NUMERIC(15,2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(15,2) NOT NULL DEFAULT 0,
  other_allowances    NUMERIC(15,2) NOT NULL DEFAULT 0,
  bank_account        VARCHAR(100),
  bank_name           VARCHAR(100),
  is_active           BOOLEAN DEFAULT true,
  notes               TEXT,
  created_by          INTEGER REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_employee_dept CHECK (department IN ('sales', 'design', 'operations', 'admin'))
);

-- 2. Payroll Runs
CREATE TABLE IF NOT EXISTS payroll_runs (
  id                  SERIAL PRIMARY KEY,
  run_number          VARCHAR(50) UNIQUE NOT NULL,  -- e.g. PAY-2026-04
  payroll_month       INTEGER NOT NULL,  -- 1-12
  payroll_year        INTEGER NOT NULL,
  department          VARCHAR(50),  -- NULL = all departments
  status              VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft | approved | posted
  total_basic         NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_allowances    NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_deductions    NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_net           NUMERIC(15,2) NOT NULL DEFAULT 0,
  journal_entry_id    INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL,
  notes               TEXT,
  created_by          INTEGER REFERENCES users(id),
  approved_by         INTEGER REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_payroll_month CHECK (payroll_month BETWEEN 1 AND 12),
  CONSTRAINT chk_payroll_status CHECK (status IN ('draft', 'approved', 'posted')),
  UNIQUE(payroll_month, payroll_year, department)
);

-- 3. Payroll Lines (one per employee per run)
CREATE TABLE IF NOT EXISTS payroll_lines (
  id                  SERIAL PRIMARY KEY,
  payroll_run_id      INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id         INTEGER NOT NULL REFERENCES employees(id),
  basic_salary        NUMERIC(15,2) NOT NULL DEFAULT 0,
  housing_allowance   NUMERIC(15,2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(15,2) NOT NULL DEFAULT 0,
  other_allowances    NUMERIC(15,2) NOT NULL DEFAULT 0,
  overtime_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  deductions          NUMERIC(15,2) NOT NULL DEFAULT 0,
  gosi_employee       NUMERIC(15,2) NOT NULL DEFAULT 0,  -- 10% employee share (Saudi only)
  gosi_employer       NUMERIC(15,2) NOT NULL DEFAULT 0,  -- 12% employer share (Saudi only)
  net_salary          NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 4. End of Service Calculations
CREATE TABLE IF NOT EXISTS end_of_service (
  id                  SERIAL PRIMARY KEY,
  employee_id         INTEGER NOT NULL REFERENCES employees(id),
  termination_date    DATE NOT NULL,
  termination_reason  VARCHAR(50) NOT NULL,  -- resignation | termination | retirement
  years_of_service    NUMERIC(5,2) NOT NULL,
  entitlement_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | paid
  journal_entry_id    INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL,
  notes               TEXT,
  created_by          INTEGER REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_termination_reason CHECK (termination_reason IN ('resignation', 'termination', 'retirement')),
  CONSTRAINT chk_eos_status CHECK (status IN ('pending', 'paid'))
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Employees indexes
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);

-- Payroll runs indexes
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_runs(payroll_year, payroll_month);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_dept ON payroll_runs(department);
CREATE INDEX IF NOT EXISTS idx_payroll_number ON payroll_runs(run_number);

-- Payroll lines indexes
CREATE INDEX IF NOT EXISTS idx_payroll_lines_run ON payroll_lines(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_employee ON payroll_lines(employee_id);

-- End of service indexes
CREATE INDEX IF NOT EXISTS idx_eos_employee ON end_of_service(employee_id);
CREATE INDEX IF NOT EXISTS idx_eos_status ON end_of_service(status);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

-- employees
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_employees_updated_at();

-- payroll_runs
CREATE OR REPLACE FUNCTION update_payroll_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payroll_runs_updated_at
  BEFORE UPDATE ON payroll_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_payroll_runs_updated_at();

-- end_of_service
CREATE OR REPLACE FUNCTION update_end_of_service_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_end_of_service_updated_at
  BEFORE UPDATE ON end_of_service
  FOR EACH ROW
  EXECUTE FUNCTION update_end_of_service_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE employees IS 'Employee master data for HR and payroll';
COMMENT ON TABLE payroll_runs IS 'Monthly payroll processing runs';
COMMENT ON TABLE payroll_lines IS 'Individual employee payroll calculations per run';
COMMENT ON TABLE end_of_service IS 'End of service benefits calculations per Saudi Labor Law';

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  table_count INTEGER;
  trigger_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Check all 4 tables exist
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('employees', 'payroll_runs', 'payroll_lines', 'end_of_service');

  IF table_count < 4 THEN
    RAISE EXCEPTION '❌ Expected 4 tables but found %. Some tables are missing.', table_count;
  END IF;

  -- Check triggers exist
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN (
    'update_employees_updated_at',
    'update_payroll_runs_updated_at',
    'update_end_of_service_updated_at'
  );

  IF trigger_count < 3 THEN
    RAISE EXCEPTION '❌ Expected 3 triggers but found %', trigger_count;
  END IF;

  -- Check indexes (should have at least 12)
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('employees', 'payroll_runs', 'payroll_lines', 'end_of_service')
    AND indexname LIKE 'idx_%';

  IF index_count < 12 THEN
    RAISE EXCEPTION '❌ Expected at least 12 indexes but found %', index_count;
  END IF;

  RAISE NOTICE '✅ Migration 023: Successfully created 4 payroll & HR tables with triggers and indexes';
END $$;

COMMIT;
