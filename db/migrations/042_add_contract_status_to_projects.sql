-- ============================================================================
-- Migration 042: Add contract_status column to projects table
-- ============================================================================
-- Enables contract-driven resource locking for material allocation
-- ============================================================================

BEGIN;

-- Add contract_status column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS contract_status VARCHAR(20) NOT NULL DEFAULT 'not_uploaded';

-- Add constraint to ensure valid values
ALTER TABLE projects 
ADD CONSTRAINT chk_contract_status 
CHECK (contract_status IN ('not_uploaded', 'uploaded', 'verified'));

-- Add comment for documentation
COMMENT ON COLUMN projects.contract_status IS 'Contract upload status: not_uploaded, uploaded, verified';

-- Create index for performance on contract status filtering
CREATE INDEX IF NOT EXISTS idx_projects_contract_status ON projects(contract_status);

-- Update existing projects to have 'not_uploaded' status (default handles this)
UPDATE projects SET contract_status = 'not_uploaded' WHERE contract_status IS NULL;

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 
  'Projects with contract_status' as check_name, 
  COUNT(*) as count 
FROM projects 
WHERE contract_status IS NOT NULL;

SELECT 
  contract_status, 
  COUNT(*) as project_count 
FROM projects 
GROUP BY contract_status 
ORDER BY contract_status;
