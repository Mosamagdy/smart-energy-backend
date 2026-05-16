-- Smart Energy ERP
-- Migration 020: Attendance & Time Logs Module
-- Purpose: Track employee clock-in/out, calculate daily hours and overtime
-- Date: 2026-05-02

BEGIN;

-- ===========================================
-- TABLE: attendance
-- Records daily attendance with hours worked and overtime
-- ===========================================

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  
  -- Employee Link (uses 45-column employees table)
  employee_id INTEGER NOT NULL REFERENCES employees(id) 
    ON UPDATE CASCADE ON DELETE CASCADE,
  
  -- Date & Department (for efficient querying)
  attendance_date DATE NOT NULL,
  department_id INTEGER REFERENCES departments(id) 
    ON UPDATE CASCADE ON DELETE SET NULL,
  
  -- Work Hours
  expected_hours NUMERIC(4,2) NOT NULL DEFAULT 8.00,
  actual_hours NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  
  -- Overtime Calculation
  overtime_hours NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  overtime_rate NUMERIC(10,2) NOT NULL DEFAULT 1.50,
  
  -- Late Arrival Tracking
  late_minutes INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'present' 
    CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one record per employee per day
  UNIQUE (employee_id, attendance_date)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_department ON attendance(department_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, attendance_date DESC);

-- ===========================================
-- TABLE: time_logs
-- Individual clock-in/out events for audit trail
-- ===========================================

CREATE TABLE IF NOT EXISTS time_logs (
  id SERIAL PRIMARY KEY,
  
  -- Employee Link
  employee_id INTEGER NOT NULL REFERENCES employees(id) 
    ON UPDATE CASCADE ON DELETE CASCADE,
  
  -- Clock Events
  clock_in TIMESTAMP WITH TIME ZONE,
  clock_out TIMESTAMP WITH TIME ZONE,
  
  -- Session Duration
  session_hours NUMERIC(5,2),
  
  -- Location/IP (for security)
  clock_in_ip VARCHAR(45),
  clock_out_ip VARCHAR(45),
  clock_in_location VARCHAR(255),
  clock_out_location VARCHAR(255),
  
  -- Device Type
  device_type VARCHAR(50) DEFAULT 'web',
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'open' 
    CHECK (status IN ('open', 'closed', 'invalid')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_logs_employee ON time_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_clock_in ON time_logs(clock_in DESC);

-- ===========================================
-- TRIGGER: Auto-update updated_at
-- ===========================================

CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attendance_timestamp
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

CREATE OR REPLACE FUNCTION update_time_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_time_logs_timestamp
  BEFORE UPDATE ON time_logs
  FOR EACH ROW EXECUTE FUNCTION update_time_logs_updated_at();

-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON TABLE attendance IS 'Daily attendance records with hours worked and overtime';
COMMENT ON COLUMN attendance.employee_id IS 'FK to employees.id (45-column structure)';
COMMENT ON COLUMN attendance.department_id IS 'FK to departments.id - copied at clock-in time';
COMMENT ON COLUMN attendance.overtime_hours IS 'Hours beyond expected_hours (8.00 default)';
COMMENT ON COLUMN attendance.overtime_rate IS 'Multiplier for overtime calculation (default 1.5x)';
COMMENT ON COLUMN attendance.late_minutes IS 'Minutes late from scheduled start time';

COMMENT ON TABLE time_logs IS 'Individual clock-in/out events for audit trail';
COMMENT ON COLUMN time_logs.clock_in_ip IS 'IPv4 or IPv6 address at clock-in';
COMMENT ON COLUMN time_logs.clock_in_location IS 'GPS coordinates or device location';

COMMIT;
