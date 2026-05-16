const { query } = require('../../db');

// ============================================================================
// Financial Reports Repository - Data Access Layer
// ============================================================================

/**
 * Trial balance for a period.
 * - Date filter applied in the lines subquery (LEFT JOIN safe).
 * - Rollup parents (accounts with active children) are excluded UNLESS they
 *   still have journal lines in the period — excluding them while lines remain
 *   causes total_debit != total_credit even when every journal entry balances.
 * - Inactive accounts are excluded UNLESS they have lines in the period.
 */
async function getTrialBalance(startDate, endDate) {
  const result = await query(
    `WITH period_lines AS (
       SELECT jl.account_id, jl.debit_amount, jl.credit_amount
       FROM journal_entry_lines jl
       JOIN journal_entries je ON je.id = jl.journal_entry_id
       WHERE ($1::date IS NULL OR je.entry_date >= $1::date)
         AND ($2::date IS NULL OR je.entry_date <= $2::date)
     ),
     rollup_parent_ids AS (
       SELECT DISTINCT parent_id AS id
       FROM chart_of_accounts
       WHERE parent_id IS NOT NULL
         AND is_active = true
     ),
     accounts_with_period_activity AS (
       SELECT DISTINCT account_id AS id
       FROM period_lines
     )
     SELECT 
       c.id,
       c.account_code,
       c.account_name,
       c.account_name_ar,
       c.account_type,
       c.normal_balance,
       c.financial_statement,
       c.report_category,
       c.is_active,
       CASE c.account_type
         WHEN 'asset'     THEN 'Assets'
         WHEN 'liability' THEN 'Liabilities'
         WHEN 'equity'    THEN 'Equity'
         WHEN 'revenue'   THEN 'Revenue'
         WHEN 'expense'   THEN 'Expenses'
         ELSE 'Other'
       END AS coa_group,
       COALESCE(SUM(pl.debit_amount),  0) AS total_debit,
       COALESCE(SUM(pl.credit_amount), 0) AS total_credit,
       CASE 
         WHEN LOWER(c.normal_balance) = 'debit'
           THEN COALESCE(SUM(pl.debit_amount), 0) - COALESCE(SUM(pl.credit_amount), 0)
         WHEN LOWER(c.normal_balance) = 'credit'
           THEN COALESCE(SUM(pl.credit_amount), 0) - COALESCE(SUM(pl.debit_amount), 0)
         ELSE 0
       END AS balance,
       (c.id IN (SELECT id FROM rollup_parent_ids)) AS is_rollup_parent,
       (NOT c.is_active) AS is_inactive_account
     FROM chart_of_accounts c
     LEFT JOIN period_lines pl ON pl.account_id = c.id
     WHERE (
         c.is_active = true
         OR c.id IN (SELECT id FROM accounts_with_period_activity)
       )
       AND (
         c.id NOT IN (SELECT id FROM rollup_parent_ids)
         OR c.id IN (SELECT id FROM accounts_with_period_activity)
       )
     GROUP BY 
       c.id, c.account_code, c.account_name, c.account_name_ar,
       c.account_type, c.normal_balance, c.financial_statement, c.report_category,
       c.is_active
     ORDER BY c.account_code`,
    [startDate || null, endDate || null]
  );

  return result.rows;
}

/**
 * ✅ FIXED v2: Get balance sheet as of specific date
 */
async function getBalanceSheet(asOfDate) {
  const result = await query(
    `SELECT 
       c.account_code,
       c.account_name,
       c.account_name_ar,
       c.account_type,
       c.normal_balance,
       c.report_category,
       COALESCE(SUM(jl.debit_amount),  0) AS total_debit,
       COALESCE(SUM(jl.credit_amount), 0) AS total_credit,
       CASE 
         WHEN LOWER(c.normal_balance) = 'debit'
           THEN COALESCE(SUM(jl.debit_amount), 0) - COALESCE(SUM(jl.credit_amount), 0)
         WHEN LOWER(c.normal_balance) = 'credit'
           THEN COALESCE(SUM(jl.credit_amount), 0) - COALESCE(SUM(jl.debit_amount), 0)
         ELSE 0
       END AS balance
     FROM chart_of_accounts c
     LEFT JOIN (
       SELECT jl.account_id, jl.debit_amount, jl.credit_amount
       FROM journal_entry_lines jl
       JOIN journal_entries je ON je.id = jl.journal_entry_id
       WHERE je.entry_date <= $1::date
     ) jl ON jl.account_id = c.id
     WHERE (
         c.is_active = true
         OR c.id IN (SELECT DISTINCT jl.account_id FROM journal_entry_lines jl
                     JOIN journal_entries je ON je.id = jl.journal_entry_id
                     WHERE je.entry_date <= $1::date)
       )
       AND LOWER(c.financial_statement) = 'balance_sheet'
       AND (
         c.id NOT IN (
           SELECT DISTINCT parent_id FROM chart_of_accounts
           WHERE parent_id IS NOT NULL AND is_active = true
         )
         OR c.id IN (SELECT DISTINCT jl.account_id FROM journal_entry_lines jl
                     JOIN journal_entries je ON je.id = jl.journal_entry_id
                     WHERE je.entry_date <= $1::date)
       )
     GROUP BY 
       c.id, c.account_code, c.account_name, c.account_name_ar,
       c.account_type, c.normal_balance, c.report_category
     HAVING 
       COALESCE(SUM(jl.debit_amount), 0) != 0 
       OR COALESCE(SUM(jl.credit_amount), 0) != 0
     ORDER BY c.account_code`,
    [asOfDate || new Date()]
  );

  return result.rows;
}

/**
 * ✅ FIXED v2: Get profit and loss (income statement) for a period
 */
async function getIncomeStatement(startDate, endDate) {
  const result = await query(
    `SELECT 
       c.account_code,
       c.account_name,
       c.account_name_ar,
       c.account_type,
       c.normal_balance,
       c.report_category,
       COALESCE(SUM(jl.debit_amount),  0) AS total_debit,
       COALESCE(SUM(jl.credit_amount), 0) AS total_credit,
       CASE 
         WHEN LOWER(c.normal_balance) = 'debit'
           THEN COALESCE(SUM(jl.debit_amount), 0) - COALESCE(SUM(jl.credit_amount), 0)
         WHEN LOWER(c.normal_balance) = 'credit'
           THEN COALESCE(SUM(jl.credit_amount), 0) - COALESCE(SUM(jl.debit_amount), 0)
         ELSE 0
       END AS balance,
       CASE 
         WHEN c.account_code LIKE '4%'  THEN 'revenue'
         WHEN c.account_code LIKE '33%' THEN 'cogs'
         WHEN c.account_code LIKE '32%' THEN 'operating_expense'
         WHEN c.account_code LIKE '3%'  THEN 'other_expense'
         ELSE 'other'
       END AS pl_category
     FROM chart_of_accounts c
     LEFT JOIN (
       SELECT jl.account_id, jl.debit_amount, jl.credit_amount
       FROM journal_entry_lines jl
       JOIN journal_entries je ON je.id = jl.journal_entry_id
       WHERE ($1::date IS NULL OR je.entry_date >= $1::date)
         AND ($2::date IS NULL OR je.entry_date <= $2::date)
     ) jl ON jl.account_id = c.id
     WHERE (
         c.is_active = true
         OR c.id IN (SELECT DISTINCT account_id FROM journal_entry_lines jl
                     JOIN journal_entries je ON je.id = jl.journal_entry_id
                     WHERE ($1::date IS NULL OR je.entry_date >= $1::date)
                       AND ($2::date IS NULL OR je.entry_date <= $2::date))
       )
       AND (
         LOWER(c.financial_statement) = 'income_statement'
         OR c.account_code LIKE '3%'
         OR c.account_code LIKE '4%'
       )
       AND (
         c.id NOT IN (
           SELECT DISTINCT parent_id FROM chart_of_accounts
           WHERE parent_id IS NOT NULL AND is_active = true
         )
         OR c.id IN (SELECT DISTINCT account_id FROM journal_entry_lines jl
                     JOIN journal_entries je ON je.id = jl.journal_entry_id
                     WHERE ($1::date IS NULL OR je.entry_date >= $1::date)
                       AND ($2::date IS NULL OR je.entry_date <= $2::date))
       )
     GROUP BY 
       c.id, c.account_code, c.account_name, c.account_name_ar,
       c.account_type, c.normal_balance, c.report_category
     HAVING 
       COALESCE(SUM(jl.debit_amount), 0) != 0 
       OR COALESCE(SUM(jl.credit_amount), 0) != 0
     ORDER BY c.account_code`,
    [startDate || null, endDate || null]
  );

  return result.rows;
}

/**
 * Get account ledger with running balance
 */
async function getAccountLedger(accountCode, startDate, endDate) {
  const result = await query(
    `SELECT 
       je.entry_date,
       je.entry_number,
       je.description AS entry_description,
       jl.debit_amount  AS debit,
       jl.credit_amount AS credit,
       jl.description   AS line_description,
       SUM(jl.debit_amount - jl.credit_amount) 
         OVER (ORDER BY je.entry_date, je.id) AS running_balance
     FROM journal_entry_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     JOIN chart_of_accounts c  ON c.id  = jl.account_id
     WHERE c.account_code = $1
       AND ($2::date IS NULL OR je.entry_date >= $2)
       AND ($3::date IS NULL OR je.entry_date <= $3)
     ORDER BY je.entry_date, je.id`,
    [accountCode, startDate || null, endDate || null]
  );

  return result.rows;
}

/**
 * Get account details by code
 */
async function getAccountByCode(accountCode) {
  const result = await query(
    `SELECT * FROM chart_of_accounts
     WHERE account_code = $1 AND is_active = true`,
    [accountCode]
  );

  return result.rows[0] || null;
}

/**
 * Get receivables aging
 */
async function getReceivablesAging(asOfDate) {
  const result = await query(
    `SELECT
       u.first_name || ' ' || u.last_name AS client_name,
       i.invoice_number,
       i.issue_date,
       i.due_date,
       i.total_amount - COALESCE(i.amount_paid, 0) AS outstanding,
       EXTRACT(DAY FROM ($1::date - i.due_date))::INTEGER AS days_overdue,
       CASE
         WHEN $1::date <= i.due_date          THEN 'current'
         WHEN $1::date - i.due_date <= 30     THEN '1-30'
         WHEN $1::date - i.due_date <= 60     THEN '31-60'
         WHEN $1::date - i.due_date <= 90     THEN '61-90'
         ELSE '90+'
       END AS aging_bucket
     FROM invoices i
     LEFT JOIN users u ON u.id = i.client_id
     WHERE i.status IN ('draft', 'partial')
       AND i.total_amount > COALESCE(i.amount_paid, 0)
       AND ($1::date IS NULL OR i.issue_date <= $1)
     ORDER BY days_overdue DESC`,
    [asOfDate || new Date()]
  );

  return result.rows;
}

/**
 * Get payables aging (placeholder)
 */
async function getPayablesAging(asOfDate) {
  return [];
}

/**
 * Get cash flow data from journal entries
 */
async function getCashFlow(startDate, endDate) {
  const operatingResult = await query(
    `SELECT 
       COALESCE(SUM(jl.debit_amount - jl.credit_amount), 0) AS net_cash_flow
     FROM journal_entry_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     WHERE je.reference_type IN ('invoice', 'payment')
       AND je.entry_date >= $1
       AND je.entry_date <= $2`,
    [startDate, endDate]
  );

  const investingResult = await query(
    `SELECT 
       COALESCE(SUM(jl.debit_amount - jl.credit_amount), 0) AS net_cash_flow
     FROM journal_entry_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     WHERE je.reference_type IN ('fixed_asset_purchase', 'asset_disposal', 'depreciation')
       AND je.entry_date >= $1
       AND je.entry_date <= $2`,
    [startDate, endDate]
  );

  const financingResult = await query(
    `SELECT 
       COALESCE(SUM(jl.debit_amount - jl.credit_amount), 0) AS net_cash_flow
     FROM journal_entry_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     WHERE je.reference_type NOT IN ('invoice', 'payment', 'fixed_asset_purchase', 'asset_disposal', 'depreciation')
       AND je.entry_date >= $1
       AND je.entry_date <= $2`,
    [startDate, endDate]
  );

  return {
    operating: parseFloat(operatingResult.rows[0].net_cash_flow),
    investing:  parseFloat(investingResult.rows[0].net_cash_flow),
    financing:  parseFloat(financingResult.rows[0].net_cash_flow),
  };
}

/**
 * Project material spend vs invoiced amount
 */
async function getProjectCostVsInvoiced({ projectId = null, startDate = null, endDate = null } = {}) {
  const params = [projectId, startDate, endDate];
  const result = await query(
    `WITH material_spend AS (
       SELECT
         im.project_id,
         SUM(im.quantity * COALESCE(ii.unit_cost, 0)) AS material_spend
       FROM inventory_movements im
       JOIN inventory_items ii ON ii.id = im.inventory_item_id
       WHERE im.project_id IS NOT NULL
         AND im.movement_type = 'out'
         AND ($1::int  IS NULL OR im.project_id       = $1)
         AND ($2::date IS NULL OR im.created_at::date >= $2)
         AND ($3::date IS NULL OR im.created_at::date <= $3)
       GROUP BY im.project_id
     ),
     invoiced AS (
       SELECT
         si.project_id,
         SUM(si.total_amount) AS invoiced_amount
       FROM sales_invoices si
       WHERE si.project_id IS NOT NULL
         AND si.status = 'final'
         AND ($1::int  IS NULL OR si.project_id      = $1)
         AND ($2::date IS NULL OR si.issue_date::date >= $2)
         AND ($3::date IS NULL OR si.issue_date::date <= $3)
       GROUP BY si.project_id
     )
     SELECT
       p.id   AS project_id,
       p.name AS project_name,
       COALESCE(ms.material_spend,   0) AS material_spend,
       COALESCE(iv.invoiced_amount,  0) AS invoiced_amount,
       COALESCE(iv.invoiced_amount,  0) - COALESCE(ms.material_spend, 0) AS gross_margin
     FROM projects p
     LEFT JOIN material_spend ms ON ms.project_id = p.id
     LEFT JOIN invoiced        iv ON iv.project_id = p.id
     WHERE ($1::int IS NULL OR p.id = $1)
       AND (COALESCE(ms.material_spend, 0) > 0 OR COALESCE(iv.invoiced_amount, 0) > 0)
     ORDER BY p.created_at DESC`,
    params
  );

  return result.rows;
}

module.exports = {
  getTrialBalance,
  getBalanceSheet,
  getIncomeStatement,
  getAccountLedger,
  getAccountByCode,
  getReceivablesAging,
  getPayablesAging,
  getCashFlow,
  getProjectCostVsInvoiced,
};