BEGIN;

-- ============================================================================
-- Migration 061: Warehouse Management System
-- ============================================================================
-- Creates warehouses table
-- Adds warehouse_id to inventory_items and inventory_movements
-- Enables multi-warehouse stock tracking
-- ============================================================================

-- 1. Warehouses Master Table
CREATE TABLE IF NOT EXISTS warehouses (
  id                SERIAL PRIMARY KEY,
  warehouse_code    VARCHAR(50) UNIQUE NOT NULL,     -- e.g. WH-001
  warehouse_name    VARCHAR(255) NOT NULL,
  warehouse_name_ar VARCHAR(255),
  location          VARCHAR(500),
  location_ar       VARCHAR(500),
  address           TEXT,
  supervisor_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  capacity_cubic_m  NUMERIC(15,2),                   -- Storage capacity
  is_active         BOOLEAN DEFAULT true,
  notes             TEXT,
  created_by        INTEGER REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for warehouses
CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(warehouse_code);
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(is_active);
CREATE INDEX IF NOT EXISTS idx_warehouses_supervisor ON warehouses(supervisor_id);

COMMENT ON TABLE warehouses IS 'Warehouse/location master data for multi-warehouse inventory';

-- 2. Add warehouse_id to inventory_items (default warehouse for item)
ALTER TABLE inventory_items 
  ADD COLUMN IF NOT EXISTS default_warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_default_warehouse ON inventory_items(default_warehouse_id);

COMMENT ON COLUMN inventory_items.default_warehouse_id IS 'Default warehouse for this item';

-- 3. Create warehouse_stock junction table (for tracking same item in multiple warehouses)
CREATE TABLE IF NOT EXISTS warehouse_stock (
  id                SERIAL PRIMARY KEY,
  warehouse_id      INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  item_id           INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_on_hand  NUMERIC(15,3) NOT NULL DEFAULT 0,
  reserved_quantity NUMERIC(15,3) NOT NULL DEFAULT 0,    -- Committed but not shipped
  available_quantity NUMERIC(15,3) GENERATED ALWAYS AS (quantity_on_hand - reserved_quantity) STORED,
  last_counted_at   TIMESTAMPTZ,                         -- Last physical count date
  last_counted_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique combination of warehouse + item
  CONSTRAINT uq_warehouse_item UNIQUE (warehouse_id, item_id),
  CONSTRAINT chk_qty_on_hand CHECK (quantity_on_hand >= 0),
  CONSTRAINT chk_reserved_qty CHECK (reserved_quantity >= 0)
);

-- Indexes for warehouse_stock
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse ON warehouse_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_item ON warehouse_stock(item_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_available ON warehouse_stock(available_quantity);

COMMENT ON TABLE warehouse_stock IS 'Per-warehouse stock levels for each inventory item';

-- 4. Add warehouse_id to inventory_movements (track which warehouse)
ALTER TABLE inventory_movements 
  ADD COLUMN IF NOT EXISTS warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse ON inventory_movements(warehouse_id);

COMMENT ON COLUMN inventory_movements.warehouse_id IS 'Warehouse where movement occurred';

-- 5. Trigger: Auto-update updated_at for warehouses
CREATE OR REPLACE FUNCTION update_warehouses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouses_updated_at();

-- 6. Trigger: Auto-update updated_at for warehouse_stock
CREATE OR REPLACE FUNCTION update_warehouse_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_warehouse_stock_updated_at
  BEFORE UPDATE ON warehouse_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_stock_updated_at();

-- 7. Seed: Create default warehouse (for existing data migration)
INSERT INTO warehouses (
  warehouse_code, 
  warehouse_name, 
  warehouse_name_ar,
  location,
  is_active,
  created_by
)
SELECT 
  'WH-DEFAULT',
  'Main Warehouse',
  'المستودع الرئيسي',
  'Default warehouse for existing inventory',
  true,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM warehouses WHERE warehouse_code = 'WH-DEFAULT'
);

-- 8. Migration: Set default_warehouse_id for existing inventory items
UPDATE inventory_items 
SET default_warehouse_id = (SELECT id FROM warehouses WHERE warehouse_code = 'WH-DEFAULT')
WHERE default_warehouse_id IS NULL;

-- 9. Migration: Create warehouse_stock records from existing quantity_on_hand
INSERT INTO warehouse_stock (warehouse_id, item_id, quantity_on_hand)
SELECT 
  (SELECT id FROM warehouses WHERE warehouse_code = 'WH-DEFAULT') as warehouse_id,
  i.id as item_id,
  i.quantity_on_hand
FROM inventory_items i
WHERE i.quantity_on_hand > 0
AND NOT EXISTS (
  SELECT 1 FROM warehouse_stock ws 
  WHERE ws.warehouse_id = (SELECT id FROM warehouses WHERE warehouse_code = 'WH-DEFAULT')
  AND ws.item_id = i.id
);

COMMIT;
