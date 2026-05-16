BEGIN;

-- ============================================================================
-- Migration 026: Add status CHECK constraint to leads table
-- ============================================================================
-- Purpose: Enforce valid status values and ensure proper CRM workflow
-- Flow: new → contacted → survey_requested → inspection_assigned → 
--       inspection_completed → quotation_sent → won/lost
-- ============================================================================

-- Step 1: Update any invalid statuses to 'new'
UPDATE leads 
SET status = 'new' 
WHERE status NOT IN ('new', 'contacted', 'survey_requested', 'inspection_assigned', 
                     'inspection_completed', 'quotation_sent', 'won', 'lost');

-- Step 2: Add CHECK constraint for status
ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS chk_leads_status;

ALTER TABLE leads 
ADD CONSTRAINT chk_leads_status 
CHECK (status IN (
  'new',                    -- Lead just created
  'contacted',              -- Sales rep made initial contact
  'survey_requested',       -- Technical survey/inspection requested
  'inspection_assigned',    -- Engineer assigned for site visit
  'inspection_completed',   -- Inspection report submitted
  'quotation_sent',         -- Quotation sent to client
  'won',                    -- Deal closed successfully
  'lost'                    -- Deal lost
));

-- Step 3: Add comment for documentation
COMMENT ON COLUMN leads.status IS 'Lead status in CRM pipeline: new → contacted → survey_requested → inspection_assigned → inspection_completed → quotation_sent → won/lost';

-- Step 4: Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

COMMIT;
