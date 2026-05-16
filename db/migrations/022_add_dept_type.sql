BEGIN;

-- ============================================================================
-- Migration 022: Add dept_type to departments table
-- ============================================================================
-- Purpose: Distinguish between administrative and technical departments
-- administrative: HQ departments (HR, Finance, Admin)
-- technical: Work sections (Solar, Maintenance, Electrical)
-- ============================================================================

-- Add dept_type column with default 'administrative'
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS dept_type VARCHAR(20) NOT NULL DEFAULT 'administrative'
CHECK (dept_type IN ('administrative', 'technical'));

-- Add comment for documentation
COMMENT ON COLUMN departments.dept_type IS 'Department type: administrative (HQ) or technical (work sections)';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_departments_dept_type ON departments(dept_type);

-- Update existing departments based on common patterns
-- Technical departments
UPDATE departments 
SET dept_type = 'technical'
WHERE LOWER(name) LIKE '%solar%' 
   OR LOWER(name) LIKE '%maintenance%' 
   OR LOWER(name) LIKE '%installation%'
   OR LOWER(name) LIKE '%engineering%'
   OR LOWER(name) LIKE '%technical%';

-- All others remain 'administrative' (HR, Finance, Admin, etc.)

COMMIT;
