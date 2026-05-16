-- Migration 072: Create purchase_invoice_items table
-- Date: 2026-04-26
-- Purpose: Add line items support for purchase invoices

BEGIN;

-- Create purchase_invoice_items table
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  quantity NUMERIC(15,3) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(15,2) NOT NULL CHECK (unit_cost >= 0),
  total_amount NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pii_invoice ON purchase_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pii_item ON purchase_invoice_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_pii_warehouse ON purchase_invoice_items(warehouse_id);

-- Add comment
COMMENT ON TABLE purchase_invoice_items IS 'Line items within purchase invoices';

COMMIT;
