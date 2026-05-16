/**
 * Check inventory items and migrate to warehouse_stock if needed
 */

const { query, pool } = require('../../src/db');

async function checkAndMigrateStock() {
  console.log('📦 Checking inventory stock migration...\n');

  try {
    // Check existing inventory items
    const items = await query(`
      SELECT id, item_code, item_name, quantity_on_hand 
      FROM inventory_items 
      WHERE quantity_on_hand > 0
      ORDER BY item_code
    `);

    console.log(`📊 Found ${items.rows.length} items with stock\n`);

    if (items.rows.length > 0) {
      console.log('Current inventory items with stock:');
      items.rows.forEach(item => {
        console.log(`  - ${item.item_code}: ${item.item_name} (Qty: ${item.quantity_on_hand})`);
      });

      // Check if warehouse_stock already has these items
      const existingStock = await query(`
        SELECT ws.item_id, ws.quantity_on_hand, i.item_code
        FROM warehouse_stock ws
        JOIN inventory_items i ON i.id = ws.item_id
        WHERE ws.warehouse_id = 1
      `);

      console.log(`\n📦 Existing warehouse_stock records: ${existingStock.rows.length}`);

      // Migrate missing items
      let migrated = 0;
      for (const item of items.rows) {
        const exists = existingStock.rows.find(s => s.item_id === item.id);
        
        if (!exists) {
          await query(`
            INSERT INTO warehouse_stock (warehouse_id, item_id, quantity_on_hand)
            VALUES (1, $1, $2)
          `, [item.id, item.quantity_on_hand]);
          
          console.log(`  ✅ Migrated: ${item.item_code} (${item.quantity_on_hand} units)`);
          migrated++;
        }
      }

      console.log(`\n✅ Migrated ${migrated} items to warehouse_stock`);
    } else {
      console.log('ℹ️  No inventory items with stock found. This is a fresh system.');
    }

    // Final count
    const finalCount = await query('SELECT COUNT(*) FROM warehouse_stock');
    console.log(`\n📊 Total warehouse_stock records: ${finalCount.rows[0].count}`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

checkAndMigrateStock();
