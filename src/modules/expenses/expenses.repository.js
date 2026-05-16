const { query } = require('../../db');

// ============================================================================
// Expenses Repository - Site Expense Management
// ============================================================================

/**
 * Create expense
 */
async function createExpense(data) {
  const {
    expense_number, project_id, account_id, amount,
    payment_method, petty_cash_fund_id, description,
    receipt_url, notes, created_by
  } = data;

  const result = await query(
    `INSERT INTO expenses (
      expense_number, project_id, account_id, amount,
      payment_method, petty_cash_fund_id, description,
      receipt_url, notes, status, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10)
    RETURNING *`,
    [expense_number, project_id, account_id, amount,
     payment_method, petty_cash_fund_id, description,
     receipt_url, notes, created_by]
  );

  return result.rows[0];
}

/**
 * Get expense by ID with details
 */
async function getExpenseById(id) {
  const result = await query(
    `SELECT 
       e.*,
       p.name AS project_name,
       coa.account_code,
       coa.account_name,
       u.first_name || ' ' || u.last_name AS engineer_name,
       u.email AS engineer_email
     FROM expenses e
     LEFT JOIN projects p ON p.id = e.project_id
     LEFT JOIN chart_of_accounts coa ON coa.id = e.account_id
     LEFT JOIN users u ON u.id = e.created_by
     WHERE e.id = $1 LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Get all expenses for project
 */
async function getProjectExpenses(projectId) {
  const result = await query(
    `SELECT 
       e.*,
       coa.account_code,
       coa.account_name
     FROM expenses e
     LEFT JOIN chart_of_accounts coa ON coa.id = e.account_id
     WHERE e.project_id = $1
     ORDER BY e.expense_date DESC`,
    [projectId]
  );

  return result.rows;
}

/**
 * Update expense status
 */
async function updateExpenseStatus(id, status) {
  const result = await query(
    `UPDATE expenses 
     SET status = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );

  return result.rows[0] || null;
}

/**
 * Get engineer's petty cash balance
 */
async function getEngineerPettyCashBalance(pettyCashFundId) {
  const result = await query(
    `SELECT current_balance
     FROM petty_cash_funds
     WHERE id = $1`,
    [pettyCashFundId]
  );

  return result.rows[0]?.current_balance || 0;
}

/**
 * Decrease petty cash balance
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
async function recordPettyCashTransaction(data) {
  const { petty_cash_fund_id, transaction_type, amount, balance_after, expense_id, description, performed_by } = data;

  const result = await query(
    `INSERT INTO petty_cash_transactions (
      petty_cash_fund_id, transaction_type, amount, balance_after,
      expense_id, description, performed_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [petty_cash_fund_id, transaction_type, amount, balance_after,
     expense_id, description, performed_by]
  );

  return result.rows[0];
}

/**
 * Get total expenses for project
 */
async function getTotalProjectExpenses(projectId) {
  const result = await query(
    `SELECT 
       COALESCE(SUM(amount), 0) as total_expenses,
       COUNT(*) as expense_count
     FROM expenses
     WHERE project_id = $1 AND status = 'approved'`,
    [projectId]
  );

  return result.rows[0];
}

module.exports = {
  createExpense,
  getExpenseById,
  getProjectExpenses,
  updateExpenseStatus,
  getEngineerPettyCashBalance,
  decreasePettyCashBalance,
  recordPettyCashTransaction,
  getTotalProjectExpenses,
};
