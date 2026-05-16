-- ============================================================================
-- PHASE 6D: INVOICE PDF TRACKING & AUTOMATION
-- ============================================================================

-- Add PDF generation tracking to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS pdf_path VARCHAR(500);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_invoices_pdf_generated 
ON invoices(pdf_generated_at);

-- Add comment for documentation
COMMENT ON COLUMN invoices.pdf_generated_at IS 'Timestamp when PDF was first generated';
COMMENT ON COLUMN invoices.pdf_path IS 'File path to generated PDF';

-- ============================================================================
-- AUTO-GENERATE PDF TRIGGER FUNCTION
-- ============================================================================

-- Function to auto-generate PDF when invoice is posted
CREATE OR REPLACE FUNCTION auto_generate_invoice_pdf()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate PDF when invoice status changes to 'sent'
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    -- Update the record with timestamp (actual PDF generation happens in app layer)
    NEW.pdf_generated_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-tracking
DROP TRIGGER IF EXISTS trg_auto_generate_invoice_pdf ON invoices;

CREATE TRIGGER trg_auto_generate_invoice_pdf
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION auto_generate_invoice_pdf();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify columns added
SELECT 
  'Invoice PDF Tracking Status' as check_type,
  COUNT(*) as has_columns
FROM information_schema.columns 
WHERE table_name = 'invoices' 
  AND column_name IN ('pdf_generated_at', 'pdf_path');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
