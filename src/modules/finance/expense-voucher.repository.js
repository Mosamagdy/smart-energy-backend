const { pool, query } = require('../../db');

/**
 * Generate next expense voucher number
 * Format: EX-2026-0001
 */
async function generateVoucherNumber() {
  const year = new Date().getFullYear();
  const result = await query(
    `SELECT COUNT(*) as count FROM expense_vouchers WHERE voucher_number LIKE $1`,
    [`EX-${year}-%`]
  );
  
  const count = parseInt(result.rows[0].count) + 1;
  return `EX-${year}-${String(count).padStart(4, '0')}`;
}

/**
 * Create expense voucher
 */
async function createVoucher(data, client = null) {
  const executor = client || pool;
  
  const result = await executor.query(
    `INSERT INTO expense_vouchers (
      voucher_number, expense_date, expense_amount,
      expense_account_id, payment_account_id, payment_method,
      description, reference_number, notes,
      status, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      data.voucher_number,
      data.expense_date,
      data.expense_amount,
      data.expense_account_id,
      data.payment_account_id,
      data.payment_method,
      data.description,
      data.reference_number || null,
      data.notes || null,
      data.status || 'completed',
      data.created_by
    ]
  );
  
  return result.rows[0];
}

/**
 * Get all expense vouchers with filters
 */
async function getAllVouchers(filters = {}) {
  const { status, start_date, end_date, expense_account_id } = filters;
  
  let whereClause = 'WHERE 1=1';
  const values = [];
  let paramCount = 1;
  
  if (status) {
    whereClause += ` AND ev.status = $${paramCount}`;
    values.push(status);
    paramCount++;
  }
  
  if (start_date) {
    whereClause += ` AND ev.expense_date >= $${paramCount}`;
    values.push(start_date);
    paramCount++;
  }
  
  if (end_date) {
    whereClause += ` AND ev.expense_date <= $${paramCount}`;
    values.push(end_date);
    paramCount++;
  }
  
  if (expense_account_id) {
    whereClause += ` AND ev.expense_account_id = $${paramCount}`;
    values.push(expense_account_id);
    paramCount++;
  }
  
  const result = await query(
    `SELECT 
       ev.*,
       ea.account_code as expense_account_code,
       ea.account_name as expense_account_name,
       ea.account_name_ar as expense_account_name_ar,
       pa.account_code as payment_account_code,
       pa.account_name as payment_account_name,
       pa.account_name_ar as payment_account_name_ar,
       je.entry_number as journal_entry_number,
       u.first_name || ' ' || u.last_name as created_by_name
     FROM expense_vouchers ev
     JOIN chart_of_accounts ea ON ea.id = ev.expense_account_id
     JOIN chart_of_accounts pa ON pa.id = ev.payment_account_id
     LEFT JOIN journal_entries je ON je.id = ev.journal_entry_id
     LEFT JOIN users u ON u.id = ev.created_by
     ${whereClause}
     ORDER BY ev.expense_date DESC, ev.created_at DESC`,
    values
  );
  
  return result.rows;
}

/**
 * Get expense voucher by ID
 */
async function getVoucherById(id) {
  const result = await query(
    `SELECT 
       ev.*,
       ea.account_code as expense_account_code,
       ea.account_name as expense_account_name,
       ea.account_name_ar as expense_account_name_ar,
       pa.account_code as payment_account_code,
       pa.account_name as payment_account_name,
       pa.account_name_ar as payment_account_name_ar,
       je.entry_number as journal_entry_number,
       je.id as journal_entry_id,
       u.first_name || ' ' || u.last_name as created_by_name
     FROM expense_vouchers ev
     JOIN chart_of_accounts ea ON ea.id = ev.expense_account_id
     JOIN chart_of_accounts pa ON pa.id = ev.payment_account_id
     LEFT JOIN journal_entries je ON je.id = ev.journal_entry_id
     LEFT JOIN users u ON u.id = ev.created_by
     WHERE ev.id = $1`,
    [id]
  );
  
  return result.rows[0];
}

/**
 * Get expense accounts (32xxx branch)
 */
async function getExpenseAccounts() {
  const result = await query(
    `SELECT id, account_code, account_name, account_name_ar, account_type
     FROM chart_of_accounts
     WHERE account_code LIKE '32%' AND is_active = true
     ORDER BY account_code`,
    []
  );
  
  return result.rows;
}

/**
 * Get payment accounts (Cash: 12301, Bank: 122)
 */
async function getPaymentAccounts() {
  const result = await query(
    `SELECT id, account_code, account_name, account_name_ar
     FROM chart_of_accounts
     WHERE account_code IN ('12301', '122') AND is_active = true
     ORDER BY account_code`,
    []
  );
  
  return result.rows;
}

/**
 * Update journal entry ID
 */
async function updateJournalEntryId(voucherId, journalEntryId, client = null) {
  const executor = client || pool;
  
  const result = await executor.query(
    `UPDATE expense_vouchers 
     SET journal_entry_id = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [journalEntryId, voucherId]
  );
  
  return result.rows[0];
}

module.exports = {
  generateVoucherNumber,
  createVoucher,
  getAllVouchers,
  getVoucherById,
  getExpenseAccounts,
  getPaymentAccounts,
  updateJournalEntryId
};
