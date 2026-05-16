-- Migration: Add discount_amount to sales_invoices
-- Date: 2026-04-23
-- Purpose: Support discount field mapped to Account 4113 (الحسم الممنوح)

ALTER TABLE sales_invoices
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_account_id INTEGER REFERENCES chart_of_accounts(id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_sales_invoices_discount 
ON sales_invoices(discount_amount) 
WHERE discount_amount > 0;

COMMENT ON COLUMN sales_invoices.discount_amount IS 'Discount amount applied to invoice (mapped to account 4113)';
COMMENT ON COLUMN sales_invoices.discount_account_id IS 'COA account ID for discount (should be 4113)';
