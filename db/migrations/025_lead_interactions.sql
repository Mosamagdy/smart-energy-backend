BEGIN;

-- ============================================================================
-- Migration 025: Create lead_interactions table
-- ============================================================================
-- Purpose: Log all sales activities (calls, emails, meetings, notes)
-- Enables tracking of follow-ups and interaction history
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_interactions (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON UPDATE CASCADE ON DELETE CASCADE,
  interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('call', 'email', 'meeting', 'note')),
  description TEXT NOT NULL,
  performed_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  next_follow_up_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_type ON lead_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_performed_by ON lead_interactions(performed_by);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_follow_up ON lead_interactions(next_follow_up_date);

-- Comment for documentation
COMMENT ON TABLE lead_interactions IS 'Sales interaction history for leads (calls, emails, meetings, notes)';
COMMENT ON COLUMN lead_interactions.interaction_type IS 'Type of interaction: call, email, meeting, or note';
COMMENT ON COLUMN lead_interactions.next_follow_up_date IS 'Scheduled date for next follow-up action';

COMMIT;
