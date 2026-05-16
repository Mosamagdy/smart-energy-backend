-- ============================================================================
-- Migration: Add optional tax fields to purchase_invoices
-- Description: Make tax optional for purchase invoices with flexible percentage
-- ============================================================================

-- Add is_tax_applied column (default true to maintain backward compatibility)
ALTER TABLE purchase_invoices 
ADD COLUMN IF NOT EXISTS is_tax_applied BOOLEAN DEFAULT true;

-- Add tax_percentage column (stores the tax rate percentage, e.g., 14, 15, etc.)
ALTER TABLE purchase_invoices 
ADD COLUMN IF NOT EXISTS tax_percentage NUMERIC(5,2) DEFAULT 15.00;

-- Update existing records to set tax_percentage from tax_rate
UPDATE purchase_invoices 
SET tax_percentage = tax_rate 
WHERE tax_percentage IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN purchase_invoices.is_tax_applied IS 'Whether tax should be applied to this invoice';
COMMENT ON COLUMN purchase_invoices.tax_percentage IS 'Tax percentage rate (e.g., 14, 15, etc.)';

-- Verify the changes
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'purchase_invoices'
    AND column_name IN ('is_tax_applied', 'tax_percentage');
  
  IF col_count < 2 THEN
    RAISE EXCEPTION '❌ Expected 2 new columns but found %. Migration failed.', col_count;
  END IF;
  
  RAISE NOTICE '✅ Migration completed successfully: is_tax_applied and tax_percentage columns added';
END $$;
