const { pool, query } = require('../../db');

// ============================================================================
// Budgeting Repository - Data Access Layer
// ============================================================================

/**
 * Create budget record (supports transaction client)
 */
async function createBudget(data, client = null) {
  const {
    budget_code, name, name_ar, fiscal_year,
    start_date, end_date, total_amount,
    department, cost_center, created_by, notes
  } = data;

  const dbClient = client || require('../../db');
  const queryFn = client ? client.query.bind(client) : dbClient.query;

  const result = await queryFn(
    `INSERT INTO budgets (
      budget_code, name, name_ar, fiscal_year,
      start_date, end_date, total_amount,
      department, cost_center, created_by, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      budget_code, name, name_ar, fiscal_year,
      start_date, end_date, total_amount,
      department, cost_center, created_by, notes
    ]
  );

  return result.rows[0];
}

/**
 * Get budget by ID with details
 */
async function getBudgetById(id) {
  const result = await query(
    `SELECT 
       b.*,
       u.first_name || ' ' || u.last_name AS created_by_name
     FROM budgets b
     LEFT JOIN users u ON u.id = b.created_by
     WHERE b.id = $1 LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Get all budgets with optional filters
 */
async function getAllBudgets(filters = {}) {
  const { fiscal_year, department, cost_center, status } = filters;
  
  let whereClause = 'WHERE 1=1';
  const values = [];
  let paramCount = 1;

  if (fiscal_year) {
    whereClause += ` AND b.fiscal_year = $${paramCount}`;
    values.push(fiscal_year);
    paramCount++;
  }

  if (department) {
    whereClause += ` AND b.department = $${paramCount}`;
    values.push(department);
    paramCount++;
  }

  if (cost_center) {
    whereClause += ` AND b.cost_center = $${paramCount}`;
    values.push(cost_center);
    paramCount++;
  }

  if (status) {
    whereClause += ` AND b.status = $${paramCount}`;
    values.push(status);
    paramCount++;
  }

  const result = await query(
    `SELECT 
       b.*,
       u.first_name || ' ' || u.last_name AS created_by_name
     FROM budgets b
     LEFT JOIN users u ON u.id = b.created_by
     ${whereClause}
     ORDER BY b.fiscal_year DESC, b.start_date ASC`,
    values
  );

  return result.rows;
}

/**
 * Update budget (supports transaction client, allowed fields only)
 */
async function updateBudget(id, data, client = null) {
  const allowedFields = [
    'name', 'name_ar', 'end_date', 'total_amount',
    'department', 'cost_center', 'status', 'notes'
  ];
  
  const keys = Object.keys(data).filter(key => allowedFields.includes(key));

  if (keys.length === 0) {
    return getBudgetById(id);
  }

  const dbClient = client || require('../../db');
  const queryFn = client ? client.query.bind(client) : dbClient.query;

  const setClauses = [];
  const values = [];

  keys.forEach((key, index) => {
    setClauses.push(`${key} = $${index + 1}`);
    values.push(data[key]);
  });

  const setClause = setClauses.join(', ');
  const allValues = [...values, id];

  const sql = `UPDATE budgets SET ${setClause}, updated_at = NOW() 
               WHERE id = $${keys.length + 1} RETURNING *`;

  const result = await queryFn(sql, allValues);
  return result.rows[0] || null;
}

/**
 * Delete budget (only if status = 'draft')
 */
async function deleteBudget(id) {
  const result = await query(
    `DELETE FROM budgets 
     WHERE id = $1 AND status = 'draft'
     RETURNING *`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Generate unique budget code
 */
async function generateBudgetCode(year) {
  const result = await query(
    `SELECT 'BGT-' || $1 || '-' || LPAD((COUNT(*) + 1)::TEXT, 4, '0') as budget_code
     FROM budgets
     WHERE fiscal_year = $1`,
    [year]
  );
  
  return result.rows[0].budget_code;
}

/**
 * Get actual expenses for a budget period
 */
async function getActualExpenses(budgetId, startDate, endDate) {
  const result = await query(
    `SELECT 
       COALESCE(SUM(e.amount), 0) as total_actual,
       COUNT(e.id) as transaction_count
     FROM expenses e
     WHERE e.expense_date >= $1
       AND e.expense_date <= $2
       AND ($3::varchar IS NULL OR e.department = $3)
       AND e.status = 'approved'`,
    [startDate, endDate, null] // Will be updated with department filter
  );

  return result.rows[0];
}

/**
 * Get budget vs actual analysis
 */
async function getBudgetAnalysis(budgetId) {
  const result = await query(
    `SELECT 
       b.id,
       b.budget_code,
       b.name,
       b.name_ar,
       b.fiscal_year,
       b.start_date,
       b.end_date,
       b.total_amount as budget_amount,
       b.department,
       b.cost_center,
       COALESCE(SUM(e.amount), 0) as actual_amount,
       COUNT(e.id) as transaction_count,
       b.total_amount - COALESCE(SUM(e.amount), 0) as remaining,
       CASE 
         WHEN b.total_amount > 0 THEN 
           ROUND(((COALESCE(SUM(e.amount), 0) / b.total_amount) * 100), 2)
         ELSE 0
       END as utilization_percentage
     FROM budgets b
     LEFT JOIN expenses e ON e.expense_date >= b.start_date
       AND e.expense_date <= b.end_date
       AND e.status = 'approved'
       AND (b.department IS NULL OR e.department = b.department)
     WHERE b.id = $1
     GROUP BY b.id`,
    [budgetId]
  );

  return result.rows[0] || null;
}

/**
 * Get budget summary across all budgets
 */
async function getBudgetSummary(filters = {}) {
  const { fiscal_year, department } = filters;
  
  let whereClause = 'WHERE 1=1';
  const values = [];
  let paramCount = 1;

  if (fiscal_year) {
    whereClause += ` AND b.fiscal_year = $${paramCount}`;
    values.push(fiscal_year);
    paramCount++;
  }

  if (department) {
    whereClause += ` AND b.department = $${paramCount}`;
    values.push(department);
    paramCount++;
  }

  const result = await query(
    `SELECT 
       COUNT(b.id) as total_budgets,
       COALESCE(SUM(b.total_amount), 0) as total_budgeted,
       COALESCE(SUM(
         (SELECT COALESCE(SUM(e.amount), 0) 
          FROM expenses e 
          WHERE e.expense_date >= b.start_date 
            AND e.expense_date <= b.end_date 
            AND e.status = 'approved'
            AND (b.department IS NULL OR e.department = b.department))
       ), 0) as total_actual,
       COALESCE(SUM(b.total_amount), 0) - COALESCE(SUM(
         (SELECT COALESCE(SUM(e.amount), 0) 
          FROM expenses e 
          WHERE e.expense_date >= b.start_date 
            AND e.expense_date <= b.end_date 
            AND e.status = 'approved'
            AND (b.department IS NULL OR e.department = b.department))
       ), 0) as total_remaining
     FROM budgets b
     ${whereClause}`,
    values
  );

  return result.rows[0];
}

/**
 * Get budgets by department
 */
async function getBudgetsByDepartment(department) {
  const result = await query(
    `SELECT * FROM budgets
     WHERE department = $1
     ORDER BY fiscal_year DESC, start_date ASC`,
    [department]
  );

  return result.rows;
}

module.exports = {
  createBudget,
  getBudgetById,
  getAllBudgets,
  updateBudget,
  deleteBudget,
  generateBudgetCode,
  getActualExpenses,
  getBudgetAnalysis,
  getBudgetSummary,
  getBudgetsByDepartment
};
