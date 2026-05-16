/**
 * Migration 061: Warehouse Management System
 * Run this script to apply the warehouse schema updates
 */

const { query, pool } = require('../../src/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Starting Migration 061: Warehouse Management System...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '061_warehouse_management.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing warehouse management migration...');
    
    // Execute the entire migration
    await query(sql);

    console.log('\n✅ Migration 061 completed successfully!');
    console.log('\n📊 Summary of changes:');
    console.log('  ✓ Created warehouses table');
    console.log('  ✓ Created warehouse_stock junction table');
    console.log('  ✓ Added default_warehouse_id to inventory_items');
    console.log('  ✓ Added warehouse_id to inventory_movements');
    console.log('  ✓ Created triggers for auto-updating timestamps');
    console.log('  ✓ Seeded default warehouse (WH-DEFAULT)');
    console.log('  ✓ Migrated existing stock to warehouse_stock table');
    
    console.log('\n🔐 Permissions updated:');
    console.log('  ✓ dept_head role now has CRUD access to inventory and warehouses');
    
    console.log('\n🌐 Frontend routes added:');
    console.log('  ✓ /inventory/warehouses - Warehouse management page');
    
    console.log('\n✨ You can now:');
    console.log('  1. Access warehouse management at /inventory/warehouses');
    console.log('  2. Create/Edit/Delete warehouses');
    console.log('  3. Track stock per warehouse using warehouse_stock table');
    console.log('  4. View warehouse stock summary via GET /api/warehouses/summary');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
