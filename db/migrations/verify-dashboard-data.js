/**
 * Verify: Dashboard query returns data correctly
 */

const { query, pool } = require('../../src/db');

async function verifyDashboard() {
  console.log('🔍 Verifying Dashboard Data...\n');

  try {
    // Test the dashboard query (LEFT JOIN version)
    const dashboardData = await query(`
      SELECT 
         i.id,
         i.item_code,
         i.item_name,
         i.item_name_ar,
         i.category,
         i.unit_of_measure,
         i.unit_cost,
         i.reorder_level,
         i.is_active,
         w.id as warehouse_id,
         w.warehouse_code,
         w.warehouse_name,
         w.warehouse_name_ar,
         COALESCE(ws.quantity_on_hand, 0) as quantity_on_hand,
         COALESCE(ws.reserved_quantity, 0) as reserved_quantity,
         COALESCE(ws.available_quantity, 0) as available_quantity
       FROM inventory_items i
       LEFT JOIN warehouse_stock ws ON ws.item_id = i.id
       LEFT JOIN warehouses w ON w.id = COALESCE(ws.warehouse_id, i.default_warehouse_id, 1)
       WHERE i.is_active = true
       ORDER BY i.item_code ASC
    `);

    console.log(`📊 Dashboard will show ${dashboardData.rows.length} items\n`);

    if (dashboardData.rows.length > 0) {
      console.log('📦 Sample dashboard data:');
      dashboardData.rows.forEach(item => {
        console.log(`  - ${item.item_code}: ${item.item_name}`);
        console.log(`    Warehouse: ${item.warehouse_code} (${item.warehouse_name_ar})`);
        console.log(`    On Hand: ${item.quantity_on_hand}, Reserved: ${item.reserved_quantity}, Available: ${item.available_quantity}`);
        console.log(`    Unit Cost: ${item.unit_cost} | Category: ${item.category || 'N/A'}`);
        console.log('');
      });
    }

    // Test summary query
    const summary = await query(`
      SELECT 
         COUNT(DISTINCT i.id) as total_items,
         COUNT(DISTINCT ws.warehouse_id) FILTER (WHERE ws.warehouse_id IS NOT NULL) as total_warehouses,
         COALESCE(SUM(ws.quantity_on_hand), 0) as total_stock,
         COALESCE(SUM(ws.quantity_on_hand * i.unit_cost), 0) as total_value,
         COUNT(CASE WHEN COALESCE(ws.available_quantity, 0) <= i.reorder_level THEN 1 END) as low_stock_items
       FROM inventory_items i
       LEFT JOIN warehouse_stock ws ON ws.item_id = i.id
       WHERE i.is_active = true
    `);

    console.log('📊 Summary Statistics:');
    console.log(`  Total Items: ${summary.rows[0].total_items}`);
    console.log(`  Total Warehouses: ${summary.rows[0].total_warehouses}`);
    console.log(`  Total Stock: ${summary.rows[0].total_stock}`);
    console.log(`  Total Value: ${summary.rows[0].total_value}`);
    console.log(`  Low Stock Items: ${summary.rows[0].low_stock_items}`);

    // Final verification counts
    const itemsCount = await query('SELECT COUNT(*) FROM inventory_items');
    const stockCount = await query('SELECT COUNT(*) FROM warehouse_stock');

    console.log('\n📋 Database Counts:');
    console.log(`  inventory_items: ${itemsCount.rows[0].count}`);
    console.log(`  warehouse_stock: ${stockCount.rows[0].count}`);

    if (parseInt(itemsCount.rows[0].count) > parseInt(stockCount.rows[0].count)) {
      console.log('\n⚠️  WARNING: More items than stock records!');
      console.log('Some items may not have warehouse_stock entries yet.');
    } else {
      console.log('\n✅ All items have warehouse_stock records!');
    }

    console.log('\n✅ Dashboard verification complete!');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

verifyDashboard();
