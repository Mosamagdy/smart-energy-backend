const { query, pool } = require('../../src/db');

async function runMigration() {
  try {
    console.log('🚀 Running Migration 062: Sales Invoice Line Items...\n');

    // Step 1: Create sales_invoice_items table
    console.log('📋 Creating sales_invoice_items table...');
    await query(`
      CREATE TABLE IF NOT EXISTS sales_invoice_items (
        id                SERIAL PRIMARY KEY,
        invoice_id        INTEGER NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
        inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
        warehouse_id      INTEGER NOT NULL REFERENCES warehouses(id),
        quantity          NUMERIC(15,3) NOT NULL CHECK (quantity > 0),
        unit_price        NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
        total_amount      NUMERIC(15,2) NOT NULL CHECK (total_amount >= 0),
        notes             TEXT,
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ sales_invoice_items table created\n');

    // Step 2: Create indexes for performance
    console.log('📊 Creating indexes...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_invoice 
      ON sales_invoice_items(invoice_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_item 
      ON sales_invoice_items(inventory_item_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_warehouse 
      ON sales_invoice_items(warehouse_id)
    `);
    console.log('✅ Indexes created\n');

    // Step 3: Add trigger to auto-update updated_at
    await query(`
      CREATE OR REPLACE FUNCTION update_sales_invoice_items_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_sales_invoice_items_updated_at 
      ON sales_invoice_items;

      CREATE TRIGGER trg_sales_invoice_items_updated_at
      BEFORE UPDATE ON sales_invoice_items
      FOR EACH ROW
      EXECUTE FUNCTION update_sales_invoice_items_updated_at()
    `);
    console.log('✅ Trigger created\n');

    // Step 4: Verify table structure
    const columns = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sales_invoice_items'
      ORDER BY ordinal_position
    `);

    console.log('📋 sales_invoice_items schema:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    console.log('\n✅ Migration 062 completed successfully!');
    
    await pool.end();
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    await pool.end();
  }
}

runMigration();
