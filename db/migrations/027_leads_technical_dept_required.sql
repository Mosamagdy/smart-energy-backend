-- Migration 027: Make technical_dept_id NOT NULL in leads table
-- This ensures every lead MUST have a technical department assigned
-- Date: 2026-04-09

BEGIN;

-- Step 1: Update any existing NULL values to a default technical department (if exists)
-- This prevents the NOT NULL constraint from failing on existing data
UPDATE leads 
SET technical_dept_id = (
  SELECT id FROM departments WHERE dept_type = 'technical' LIMIT 1
)
WHERE technical_dept_id IS NULL 
  AND EXISTS (SELECT 1 FROM departments WHERE dept_type = 'technical');

-- Step 2: Add NOT NULL constraint
ALTER TABLE leads 
ALTER COLUMN technical_dept_id SET NOT NULL;

-- Step 3: Add comment for documentation
COMMENT ON COLUMN leads.technical_dept_id IS 'REQUIRED: The technical department responsible for this lead. Must be a department with dept_type = ''technical''.';

-- Step 4: Add foreign key constraint with ON DELETE RESTRICT to prevent accidental deletion
-- (Only if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'leads_technical_dept_id_fkey'
  ) THEN
    ALTER TABLE leads 
    ADD CONSTRAINT leads_technical_dept_id_fkey 
    FOREIGN KEY (technical_dept_id) 
    REFERENCES departments(id) 
    ON UPDATE CASCADE 
    ON DELETE RESTRICT;
  END IF;
END $$;

-- Step 5: Add index for faster queries (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_leads_technical_dept_id ON leads(technical_dept_id);

COMMIT;
