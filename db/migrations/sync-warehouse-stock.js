/**
 * Sync: Populate warehouse_stock from inventory_items
 */

const { query, pool } = require('../../src/db');

async function syncWarehouseStock() {
  console.log('🔄 Syncing inventory_items to warehouse_stock...\n');

  try {
    // Get all inventory items
    const items = await query(`
      SELECT id, item_code, item_name, quantity_on_hand, default_warehouse_id
      FROM inventory_items
      ORDER BY id
    `);

    console.log(`📊 Found ${items.rows.length} inventory items\n`);

    let synced = 0;
    let skipped = 0;

    for (const item of items.rows) {
      const warehouseId = item.default_warehouse_id || 1; // Default to WH-DEFAULT (ID 1)

      // Check if warehouse_stock record already exists
      const existing = await query(
        `SELECT id FROM warehouse_stock WHERE item_id = $1 AND warehouse_id = $2`,
        [item.id, warehouseId]
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipped ${item.item_code} (already exists)`);
        skipped++;
        continue;
      }

      // Create warehouse_stock record
      await query(
        `INSERT INTO warehouse_stock (warehouse_id, item_id, quantity_on_hand, reserved_quantity)
         VALUES ($1, $2, $3, 0)`,
        [warehouseId, item.id, item.quantity_on_hand || 0]
      );

      console.log(`✅ Synced ${item.item_code}: ${item.item_name} (Qty: ${item.quantity_on_hand}, WH: ${warehouseId})`);
      synced++;
    }

    console.log(`\n📈 Sync Summary:`);
    console.log(`  ✅ Synced: ${synced} items`);
    console.log(`  ⏭️  Skipped: ${skipped} items`);
    console.log(`  📊 Total inventory_items: ${items.rows.length}`);

    // Verify the sync
    const finalCount = await query('SELECT COUNT(*) FROM warehouse_stock');
    console.log(`\n📦 warehouse_stock records: ${finalCount.rows[0].count}`);

    // Show sample data
    const sampleData = await query(`
      SELECT 
        i.item_code,
        i.item_name,
        w.warehouse_code,
        ws.quantity_on_hand,
        ws.reserved_quantity,
        ws.available_quantity
      FROM warehouse_stock ws
      JOIN inventory_items i ON i.id = ws.item_id
      JOIN warehouses w ON w.id = ws.warehouse_id
      LIMIT 5
    `);

    if (sampleData.rows.length > 0) {
      console.log('\n📋 Sample warehouse_stock data:');
      sampleData.rows.forEach(row => {
        console.log(`  - ${row.item_code} @ ${row.warehouse_code}: ${row.quantity_on_hand} units (Available: ${row.available_quantity})`);
      });
    }

    console.log('\n✅ Sync complete! Dashboard should now show data.');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

syncWarehouseStock();
