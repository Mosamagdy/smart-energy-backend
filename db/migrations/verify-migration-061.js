/**
 * Verify Migration 061 - Check warehouse tables exist
 */

const { query, pool } = require('../../src/db');

async function verifyMigration() {
  console.log('🔍 Verifying Migration 061: Warehouse Management...\n');

  try {
    // Check if warehouses table exists
    const warehousesCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'warehouses'
      );
    `);
    
    console.log('📊 warehouses table:', warehousesCheck.rows[0].exists ? '✅ EXISTS' : '❌ MISSING');

    // Check if warehouse_stock table exists
    const stockCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'warehouse_stock'
      );
    `);
    
    console.log('📊 warehouse_stock table:', stockCheck.rows[0].exists ? '✅ EXISTS' : '❌ MISSING');

    // Check if default_warehouse_id column exists in inventory_items
    const columnCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'default_warehouse_id'
      );
    `);
    
    console.log('📊 inventory_items.default_warehouse_id:', columnCheck.rows[0].exists ? '✅ EXISTS' : '❌ MISSING');

    // Check if warehouse_id column exists in inventory_movements
    const movementCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' AND column_name = 'warehouse_id'
      );
    `);
    
    console.log('📊 inventory_movements.warehouse_id:', movementCheck.rows[0].exists ? '✅ EXISTS' : '❌ MISSING');

    // Check default warehouse
    const defaultWH = await query(`
      SELECT id, warehouse_code, warehouse_name, warehouse_name_ar, is_active
      FROM warehouses
      WHERE warehouse_code = 'WH-DEFAULT'
    `);

    console.log('\n🏭 Default Warehouse:');
    if (defaultWH.rows.length > 0) {
      console.log('  ✅ WH-DEFAULT exists');
      console.log('  ID:', defaultWH.rows[0].id);
      console.log('  Name:', defaultWH.rows[0].warehouse_name);
      console.log('  Arabic:', defaultWH.rows[0].warehouse_name_ar);
      console.log('  Active:', defaultWH.rows[0].is_active);
    } else {
      console.log('  ❌ WH-DEFAULT NOT FOUND');
    }

    // Count total warehouses
    const whCount = await query('SELECT COUNT(*) FROM warehouses');
    console.log('\n📈 Total Warehouses:', whCount.rows[0].count);

    // Count warehouse_stock records
    const stockCount = await query('SELECT COUNT(*) FROM warehouse_stock');
    console.log('📦 Total Stock Records:', stockCount.rows[0].count);

    // Sample warehouses
    const warehouses = await query(`
      SELECT warehouse_code, warehouse_name, warehouse_name_ar, is_active
      FROM warehouses
      ORDER BY warehouse_code
      LIMIT 5
    `);

    if (warehouses.rows.length > 0) {
      console.log('\n📋 Warehouses:');
      warehouses.rows.forEach(wh => {
        console.log(`  - ${wh.warehouse_code}: ${wh.warehouse_name} (${wh.warehouse_name_ar}) [${wh.is_active ? 'Active' : 'Inactive'}]`);
      });
    }

    console.log('\n✅ Migration 061 verification complete!');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

verifyMigration();
