const { query } = require('../../db');

// ============================================================================
// Petty Cash Repository - Engineer Fund Management
// ============================================================================

/**
 * Create petty cash fund for engineer
 */
async function createPettyCashFund(data) {
  const { fund_name, engineer_id, project_id, initial_amount, currency, approved_by } = data;
  
  const result = await query(
    `INSERT INTO petty_cash_funds (
      fund_name, engineer_id, project_id, initial_amount, 
      current_balance, currency, status, approved_by
    ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
    RETURNING *`,
    [fund_name, engineer_id, project_id, initial_amount, initial_amount, currency || 'SAR', approved_by]
  );
  
  return result.rows[0];
}

/**
 * Get petty cash fund by ID with details
 */
async function getPettyCashFund(id) {
  const result = await query(
    `SELECT 
       pcf.*,
       e.first_name || ' ' || e.last_name AS engineer_name,
       u.email AS engineer_email,
       p.name AS project_name,
       approver.first_name || ' ' || approver.last_name AS approved_by_name
     FROM petty_cash_funds pcf
     LEFT JOIN users u ON u.id = pcf.engineer_id
     LEFT JOIN employees e ON e.user_id = pcf.engineer_id
     LEFT JOIN projects p ON p.id = pcf.project_id
     LEFT JOIN users approver ON approver.id = pcf.approved_by
     WHERE pcf.id = $1 LIMIT 1`,
    [id]
  );
  
  return result.rows[0] || null;
}

/**
 * Get all funds for an engineer
 */
async function getEngineerFunds(engineerId) {
  const result = await query(
    `SELECT 
       pcf.*,
       p.name AS project_name
     FROM petty_cash_funds pcf
     LEFT JOIN projects p ON p.id = pcf.project_id
     WHERE pcf.engineer_id = $1 AND pcf.status = 'active'
     ORDER BY pcf.created_at DESC`,
    [engineerId]
  );
  
  return result.rows;
}

/**
 * Get all active funds
 */
async function getAllActiveFunds() {
  const result = await query(
    `SELECT 
       pcf.*,
       e.first_name || ' ' || e.last_name AS engineer_name,
       p.name AS project_name
     FROM petty_cash_funds pcf
     LEFT JOIN users u ON u.id = pcf.engineer_id
     LEFT JOIN employees e ON e.user_id = pcf.engineer_id
     LEFT JOIN projects p ON p.id = pcf.project_id
     WHERE pcf.status = 'active'
     ORDER BY pcf.created_at DESC`
  );
  
  return result.rows;
}

/**
 * Fund petty cash (add money to balance)
 */
async function fundPettyCash(fundId, amount) {
  const result = await query(
    `UPDATE petty_cash_funds 
     SET current_balance = current_balance + $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [amount, fundId]
  );
  
  return result.rows[0];
}

/**
 * Decrease petty cash balance (for expenses)
 */
async function decreasePettyCashBalance(fundId, amount) {
  const result = await query(
    `UPDATE petty_cash_funds 
     SET current_balance = current_balance - $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [amount, fundId]
  );
  
  return result.rows[0];
}

/**
 * Record petty cash transaction
 */
async function recordTransaction(data) {
  const { petty_cash_fund_id, transaction_type, amount, balance_after, expense_id, description, receipt_url, performed_by } = data;
  
  const result = await query(
    `INSERT INTO petty_cash_transactions (
      petty_cash_fund_id, transaction_type, amount, balance_after,
      expense_id, description, receipt_url, performed_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [petty_cash_fund_id, transaction_type, amount, balance_after, expense_id, description, receipt_url, performed_by]
  );
  
  return result.rows[0];
}

/**
 * Get transactions for fund
 */
async function getFundTransactions(fundId) {
  const result = await query(
    `SELECT 
       pct.*,
       e.expense_number,
       u.first_name || ' ' || u.last_name AS performed_by_name
     FROM petty_cash_transactions pct
     LEFT JOIN expenses e ON e.id = pct.expense_id
     LEFT JOIN users u ON u.id = pct.performed_by
     WHERE pct.petty_cash_fund_id = $1
     ORDER BY pct.created_at DESC`,
    [fundId]
  );
  
  return result.rows;
}

/**
 * Reconcile petty cash fund
 */
async function reconcileFund(fundId, lastReconciliationDate) {
  const result = await query(
    `UPDATE petty_cash_funds 
     SET last_reconciliation_date = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [lastReconciliationDate, fundId]
  );
  
  return result.rows[0];
}

/**
 * Close petty cash fund
 */
async function closeFund(fundId) {
  const result = await query(
    `UPDATE petty_cash_funds 
     SET status = 'closed',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [null, fundId]
  );
  
  return result.rows[0];
}

/**
 * Calculate engineer's total balance across all funds
 */
async function calculateEngineerTotalBalance(engineerId) {
  const result = await query(
    `SELECT 
       COALESCE(SUM(current_balance), 0) as total_balance,
       COUNT(*) as active_funds_count
     FROM petty_cash_funds
     WHERE engineer_id = $1 AND status = 'active'`,
    [engineerId]
  );
  
  return result.rows[0];
}

/**
 * Get all petty cash expenses with filters
 */
async function getAllPettyCashExpenses({ startDate, endDate, search }) {
  let sql = `
    SELECT 
       pct.id,
       pct.created_at,
       pct.amount,
       pct.description,
       pct.petty_cash_fund_id,
       pct.expense_id,
       pcf.fund_name,
       e.first_name || ' ' || e.last_name AS custodian_name,
       u.email AS custodian_email,
       expense_coa.account_code,
       expense_coa.account_name,
       expense_coa.account_name_ar AS expense_account_name,
       je.id AS journal_entry_id
     FROM petty_cash_transactions pct
     JOIN petty_cash_funds pcf ON pcf.id = pct.petty_cash_fund_id
     LEFT JOIN users u ON u.id = pcf.engineer_id
     LEFT JOIN employees e ON e.user_id = pcf.engineer_id
     LEFT JOIN journal_entries je ON je.reference_type = 'petty_cash_expense' AND je.reference_id = pct.id
     LEFT JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id AND jel.debit_amount > 0
     LEFT JOIN chart_of_accounts expense_coa ON expense_coa.id = jel.account_id
     WHERE pct.transaction_type = 'expense'
  `;
  
  const params = [];
  let paramIndex = 1;
  
  if (startDate) {
    sql += ` AND pct.created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }
  
  if (endDate) {
    sql += ` AND pct.created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }
  
  if (search) {
    sql += ` AND (
      e.first_name ILIKE $${paramIndex} OR 
      e.last_name ILIKE $${paramIndex} OR 
      pct.description ILIKE $${paramIndex} OR
      pcf.fund_name ILIKE $${paramIndex}
    )`;
    params.push(`%${search}%`);
    paramIndex++;
  }
  
  sql += ' ORDER BY pct.created_at DESC';
  
  const result = await query(sql, params);
  return result.rows;
}

module.exports = {
  createPettyCashFund,
  getPettyCashFund,
  getEngineerFunds,
  getAllActiveFunds,
  fundPettyCash,
  decreasePettyCashBalance,
  recordTransaction,
  getFundTransactions,
  reconcileFund,
  closeFund,
  calculateEngineerTotalBalance,
  getAllPettyCashExpenses,
};
