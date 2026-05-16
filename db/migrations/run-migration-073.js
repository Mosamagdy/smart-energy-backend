const { pool, query } = require('../../src/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Running Migration 073: Add final status to purchase invoices...');
  
  const sql = fs.readFileSync(path.join(__dirname, '073_add_final_status_to_purchase_invoices.sql'), 'utf8');
  
  try {
    await query(sql);
    console.log('✅ Migration 073 completed successfully!');
    console.log('✅ Purchase invoices now support "final" status');
  } catch (error) {
    console.error('❌ Migration 073 failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
