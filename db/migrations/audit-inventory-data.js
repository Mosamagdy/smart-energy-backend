/**
 * Audit: Compare inventory_items vs warehouse_stock
 */

const { query, pool } = require('../../src/db');

async function auditInventory() {
  console.log('🔍 Auditing Inventory Data...\n');

  try {
    // Count inventory_items
    const itemsCount = await query('SELECT COUNT(*) FROM inventory_items');
    console.log('📊 inventory_items count:', itemsCount.rows[0].count);

    // Count warehouse_stock
    const stockCount = await query('SELECT COUNT(*) FROM warehouse_stock');
    console.log('📊 warehouse_stock count:', stockCount.rows[0].count);

    // Check if there's a separate 'inventory' table
    const inventoryTableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'inventory'
      );
    `);
    console.log('\n📋 "inventory" table exists:', inventoryTableCheck.rows[0].exists ? 'YES' : 'NO');

    if (inventoryTableCheck.rows[0].exists) {
      const inventoryCount = await query('SELECT COUNT(*) FROM inventory');
      console.log('📊 inventory table count:', inventoryCount.rows[0].count);
    }

    // Show sample inventory_items
    const sampleItems = await query(`
      SELECT id, item_code, item_name, quantity_on_hand, default_warehouse_id
      FROM inventory_items
      LIMIT 5
    `);

    console.log('\n📦 Sample inventory_items:');
    sampleItems.rows.forEach(item => {
      console.log(`  - ${item.item_code}: ${item.item_name} (Qty: ${item.quantity_on_hand}, WH: ${item.default_warehouse_id || 'NULL'})`);
    });

    // Show sample warehouse_stock
    const sampleStock = await query(`
      SELECT ws.id, ws.item_id, ws.warehouse_id, ws.quantity_on_hand, i.item_code
      FROM warehouse_stock ws
      JOIN inventory_items i ON i.id = ws.item_id
      LIMIT 5
    `);

    console.log('\n📋 Sample warehouse_stock:');
    if (sampleStock.rows.length === 0) {
      console.log('  ⚠️  EMPTY! No warehouse_stock records exist.');
    } else {
      sampleStock.rows.forEach(stock => {
        console.log(`  - ${stock.item_code}: WH-${stock.warehouse_id} (Qty: ${stock.quantity_on_hand})`);
      });
    }

    // Find items WITHOUT warehouse_stock
    const missingStock = await query(`
      SELECT i.id, i.item_code, i.item_name, i.quantity_on_hand, i.default_warehouse_id
      FROM inventory_items i
      LEFT JOIN warehouse_stock ws ON ws.item_id = i.id AND ws.warehouse_id = 1
      WHERE ws.id IS NULL
    `);

    console.log(`\n❌ Items MISSING warehouse_stock records: ${missingStock.rows.length}`);
    if (missingStock.rows.length > 0) {
      console.log('These items need to be synced:');
      missingStock.rows.forEach(item => {
        console.log(`  - ${item.item_code}: ${item.item_name} (Qty: ${item.quantity_on_hand})`);
      });
    }

    // Check warehouses
    const warehouses = await query('SELECT id, warehouse_code, warehouse_name FROM warehouses');
    console.log('\n🏭 Existing warehouses:');
    warehouses.rows.forEach(wh => {
      console.log(`  - ID ${wh.id}: ${wh.warehouse_code} (${wh.warehouse_name})`);
    });

    console.log('\n✅ Audit complete!');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Audit failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

auditInventory();
