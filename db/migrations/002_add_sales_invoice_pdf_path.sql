-- ================================================================
-- Migration: Add pdf_path column to sales_invoices table
-- Purpose: Store generated PDF file paths for sales invoices
-- Date: 2026-04-21
-- ================================================================

BEGIN;

-- Add pdf_path column
ALTER TABLE sales_invoices 
ADD COLUMN IF NOT EXISTS pdf_path VARCHAR(500);

-- Add comment for documentation
COMMENT ON COLUMN sales_invoices.pdf_path IS 'Path to generated PDF file (e.g., /uploads/invoices/sales_SI-2026-0001.pdf)';

COMMIT;
