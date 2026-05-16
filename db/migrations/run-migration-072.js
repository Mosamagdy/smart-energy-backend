const { pool, query } = require('../../src/db');

async function runMigration072() {
  console.log('🚀 Running Migration 072: Create purchase_invoice_items table\n');

  try {
    const sql = `
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

      CREATE INDEX IF NOT EXISTS idx_pii_invoice ON purchase_invoice_items(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_pii_item ON purchase_invoice_items(inventory_item_id);
      CREATE INDEX IF NOT EXISTS idx_pii_warehouse ON purchase_invoice_items(warehouse_id);

      COMMENT ON TABLE purchase_invoice_items IS 'Line items within purchase invoices';
    `;

    await query(sql);
    
    console.log('✅ purchase_invoice_items table created successfully\n');

    // Verify table structure
    const columns = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'purchase_invoice_items'
      ORDER BY ordinal_position
    `);

    console.log('📋 purchase_invoice_items schema:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    console.log('\n✅ Migration 072 completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration 072 failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration072();
