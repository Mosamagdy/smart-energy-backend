const { query } = require('../../db');

// ============================================================================
// Treasury Repository - Cash & Bank Balance Management
// ============================================================================

/**
 * Get all cash and bank accounts with their current balances
 */
async function getCashAndBankAccounts() {
  const result = await query(`
    SELECT 
      c.id,
      c.account_code,
      c.account_name,
      c.account_name_ar,
      c.account_type,
      COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) AS current_balance
    FROM chart_of_accounts c
    LEFT JOIN journal_entry_lines jel ON jel.account_id = c.id
    LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.is_posted = true
    WHERE (c.account_code = '12301' OR c.account_code LIKE '122%')
      AND c.is_active = true
    GROUP BY c.id, c.account_code, c.account_name, c.account_name_ar, c.account_type
    ORDER BY c.account_code
  `);
  
  return result.rows;
}

/**
 * Get recent transactions for cash and bank accounts
 */
async function getRecentTransactions(limit = 10) {
  const result = await query(`
    SELECT 
      je.id AS journal_entry_id,
      je.entry_number,
      je.entry_date,
      je.description,
      je.reference_type,
      jel.account_id,
      c.account_code,
      c.account_name_ar AS account_name,
      jel.debit_amount,
      jel.credit_amount,
      CASE 
        WHEN jel.debit_amount > 0 THEN 'in'
        WHEN jel.credit_amount > 0 THEN 'out'
        ELSE 'unknown'
      END AS transaction_type,
      GREATEST(jel.debit_amount, jel.credit_amount) AS amount,
      je.created_at
    FROM journal_entries je
    JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
    JOIN chart_of_accounts c ON c.id = jel.account_id
    WHERE (c.account_code = '12301' OR c.account_code LIKE '122%')
      AND je.is_posted = true
    ORDER BY je.created_at DESC
    LIMIT $1
  `, [limit]);
  
  return result.rows;
}

/**
 * Calculate total cash balance
 */
async function getTotalCashBalance() {
  const result = await query(`
    SELECT 
      COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) AS total_cash
    FROM chart_of_accounts c
    LEFT JOIN journal_entry_lines jel ON jel.account_id = c.id
    LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.is_posted = true
    WHERE c.account_code = '12301'
      AND c.is_active = true
  `);
  
  return result.rows[0].total_cash;
}

/**
 * Calculate total bank balance
 */
async function getTotalBankBalance() {
  const result = await query(`
    SELECT 
      COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) AS total_bank
    FROM chart_of_accounts c
    LEFT JOIN journal_entry_lines jel ON jel.account_id = c.id
    LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.is_posted = true
    WHERE c.account_code LIKE '122%'
      AND c.is_active = true
  `);
  
  return result.rows[0].total_bank;
}

module.exports = {
  getCashAndBankAccounts,
  getRecentTransactions,
  getTotalCashBalance,
  getTotalBankBalance,
};
