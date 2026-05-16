-- Add file_url column to quotations table
-- This stores the uploaded quotation file path

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS file_url VARCHAR(500);

-- Add index for faster lookups (optional)
CREATE INDEX IF NOT EXISTS idx_quotations_file_url ON quotations(file_url) WHERE file_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN quotations.file_url IS 'URL/path to the uploaded quotation file (PDF, DOC, etc.)';
