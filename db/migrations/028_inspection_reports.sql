-- Migration 028: Create inspection_reports table

BEGIN;

CREATE TABLE IF NOT EXISTS inspection_reports (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  report_text TEXT,
  file_url VARCHAR(500),
  images_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_inspection_reports_lead_id ON inspection_reports(lead_id);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_user_id ON inspection_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_created_at ON inspection_reports(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE inspection_reports IS 'Inspection reports uploaded by engineers or sales reps for leads';
COMMENT ON COLUMN inspection_reports.lead_id IS 'The lead this report belongs to';
COMMENT ON COLUMN inspection_reports.user_id IS 'User who uploaded the report (engineer or sales rep)';
COMMENT ON COLUMN inspection_reports.report_text IS 'Text description of the inspection report';
COMMENT ON COLUMN inspection_reports.file_url IS 'URL to uploaded report file (PDF, DOC, etc.)';
COMMENT ON COLUMN inspection_reports.images_urls IS 'JSON array of image URLs from the inspection';

COMMIT;
