BEGIN;

-- ============================================================================
-- Migration 021: Create Inventory & Purchasing Tables
-- ============================================================================
-- Creates 6 tables: inventory_items, purchase_orders, purchase_order_items,
-- goods_receipts, goods_receipt_items, purchase_invoices
-- ============================================================================

-- 1. Inventory Items (master catalog)
CREATE TABLE IF NOT EXISTS inventory_items (
  id                SERIAL PRIMARY KEY,
  item_code         VARCHAR(50) UNIQUE NOT NULL,   -- e.g. ITM-0001
  item_name         VARCHAR(255) NOT NULL,
  item_name_ar      VARCHAR(255),
  category          VARCHAR(50) NOT NULL,  -- solar_panel | inverter | cable | accessory | other
  unit_of_measure   VARCHAR(20) NOT NULL DEFAULT 'pcs',  -- pcs | m | kg | set
  coa_account_code  VARCHAR(20) NOT NULL,           -- inventory account (e.g. 12302)
  cost_account_code VARCHAR(20) NOT NULL,           -- cost of revenue account (e.g. 33101)
  unit_cost         NUMERIC(15,2) NOT NULL DEFAULT 0,
  quantity_on_hand  NUMERIC(15,3) NOT NULL DEFAULT 0,
  reorder_level     NUMERIC(15,3) DEFAULT 0,
  is_active         BOOLEAN DEFAULT true,
  notes             TEXT,
  created_by        INTEGER REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_uom CHECK (unit_of_measure IN ('pcs', 'm', 'kg', 'set', 'box', 'roll'))
);

-- 2. Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id              SERIAL PRIMARY KEY,
  po_number       VARCHAR(50) UNIQUE NOT NULL,     -- e.g. PO-0001
  supplier_id     INTEGER NOT NULL REFERENCES suppliers(id),
  project_id      INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date   DATE,
  status          VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft | sent | partial | received | cancelled
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_po_status CHECK (status IN ('draft', 'sent', 'partial', 'received', 'cancelled'))
);

-- 3. Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id              SERIAL PRIMARY KEY,
  po_id           INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id         INTEGER NOT NULL REFERENCES inventory_items(id),
  quantity        NUMERIC(15,3) NOT NULL,
  unit_cost       NUMERIC(15,2) NOT NULL,
  total_cost      NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  quantity_received NUMERIC(15,3) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_po_item_qty CHECK (quantity > 0),
  CONSTRAINT chk_po_item_received CHECK (quantity_received >= 0)
);

-- 4. Goods Receipts
CREATE TABLE IF NOT EXISTS goods_receipts (
  id              SERIAL PRIMARY KEY,
  grn_number      VARCHAR(50) UNIQUE NOT NULL,     -- e.g. GRN-0001
  po_id           INTEGER NOT NULL REFERENCES purchase_orders(id),
  receipt_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  status          VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft | posted
  notes           TEXT,
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_grn_status CHECK (status IN ('draft', 'posted'))
);

-- 5. Goods Receipt Items
CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id              SERIAL PRIMARY KEY,
  grn_id          INTEGER NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  po_item_id      INTEGER NOT NULL REFERENCES purchase_order_items(id),
  item_id         INTEGER NOT NULL REFERENCES inventory_items(id),
  quantity_received NUMERIC(15,3) NOT NULL,
  unit_cost       NUMERIC(15,2) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_gr_item_qty CHECK (quantity_received > 0)
);

-- 6. Purchase Invoices (from suppliers)
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id                  SERIAL PRIMARY KEY,
  invoice_number      VARCHAR(50) UNIQUE NOT NULL,   -- e.g. PINV-0001
  supplier_id         INTEGER NOT NULL REFERENCES suppliers(id),
  po_id               INTEGER REFERENCES purchase_orders(id),
  grn_id              INTEGER REFERENCES goods_receipts(id),
  project_id          INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  invoice_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date            DATE,
  subtotal            NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_rate            NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  tax_amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  status              VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft | partial | paid
  journal_entry_id    INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL,
  notes               TEXT,
  created_by          INTEGER REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_pi_status CHECK (status IN ('draft', 'partial', 'paid')),
  CONSTRAINT chk_pi_paid CHECK (paid_amount >= 0)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Inventory items indexes
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_active ON inventory_items(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_code ON inventory_items(item_code);

-- Purchase orders indexes
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_project ON purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_number ON purchase_orders(po_number);

-- Purchase order items indexes
CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_item ON purchase_order_items(item_id);

-- Goods receipts indexes
CREATE INDEX IF NOT EXISTS idx_grn_po ON goods_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_grn_status ON goods_receipts(status);
CREATE INDEX IF NOT EXISTS idx_grn_number ON goods_receipts(grn_number);

-- Goods receipt items indexes
CREATE INDEX IF NOT EXISTS idx_gr_items_grn ON goods_receipt_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_gr_items_po_item ON goods_receipt_items(po_item_id);
CREATE INDEX IF NOT EXISTS idx_gr_items_item ON goods_receipt_items(item_id);

-- Purchase invoices indexes
CREATE INDEX IF NOT EXISTS idx_pi_supplier ON purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_pi_po ON purchase_invoices(po_id);
CREATE INDEX IF NOT EXISTS idx_pi_grn ON purchase_invoices(grn_id);
CREATE INDEX IF NOT EXISTS idx_pi_project ON purchase_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_pi_status ON purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_pi_number ON purchase_invoices(invoice_number);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

-- inventory_items
CREATE OR REPLACE FUNCTION update_inventory_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_items_updated_at();

-- purchase_orders
CREATE OR REPLACE FUNCTION update_purchase_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_orders_updated_at();

-- goods_receipts
CREATE OR REPLACE FUNCTION update_goods_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_goods_receipts_updated_at
  BEFORE UPDATE ON goods_receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_goods_receipts_updated_at();

-- purchase_invoices
CREATE OR REPLACE FUNCTION update_purchase_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_purchase_invoices_updated_at
  BEFORE UPDATE ON purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_invoices_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE inventory_items IS 'Master catalog of inventory items';
COMMENT ON TABLE purchase_orders IS 'Purchase orders to suppliers';
COMMENT ON TABLE purchase_order_items IS 'Line items within purchase orders';
COMMENT ON TABLE goods_receipts IS 'Goods receipt notes (GRN) for received items';
COMMENT ON TABLE goods_receipt_items IS 'Line items within goods receipts';
COMMENT ON TABLE purchase_invoices IS 'Supplier invoices for payment tracking';

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  table_count INTEGER;
  trigger_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Check all 6 tables exist
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'inventory_items', 'purchase_orders', 'purchase_order_items',
      'goods_receipts', 'goods_receipt_items', 'purchase_invoices'
    );

  IF table_count < 6 THEN
    RAISE EXCEPTION '❌ Expected 6 tables but found %. Some tables are missing.', table_count;
  END IF;

  -- Check triggers exist
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN (
    'update_inventory_items_updated_at',
    'update_purchase_orders_updated_at',
    'update_goods_receipts_updated_at',
    'update_purchase_invoices_updated_at'
  );

  IF trigger_count < 4 THEN
    RAISE EXCEPTION '❌ Expected 4 triggers but found %', trigger_count;
  END IF;

  -- Check indexes (should have at least 20)
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN (
      'inventory_items', 'purchase_orders', 'purchase_order_items',
      'goods_receipts', 'goods_receipt_items', 'purchase_invoices'
    )
    AND indexname LIKE 'idx_%';

  IF index_count < 20 THEN
    RAISE EXCEPTION '❌ Expected at least 20 indexes but found %', index_count;
  END IF;

  RAISE NOTICE '✅ Migration 021: Successfully created 6 inventory & purchasing tables with triggers and indexes';
END $$;

COMMIT;
