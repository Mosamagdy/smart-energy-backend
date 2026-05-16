const { pool } = require('../../db');
const repo = require('./budgeting.repository');

// ============================================================================
// Budgeting Service - Business Logic Layer
// ============================================================================

const VALID_STATUSES = ['draft', 'active', 'completed', 'cancelled'];
const VALID_DEPARTMENTS = ['sales', 'design', 'operations', 'admin'];

/**
 * Create budget with validation
 */
async function createBudget(data, currentUser) {
  const { name, fiscal_year, start_date, end_date, total_amount, department, cost_center } = data;

  // Validate required fields
  if (!name || !fiscal_year || !start_date || !end_date || !total_amount) {
    const err = new Error('جميع الحقول المطلوبة يجب تعبئتها: name, fiscal_year, start_date, end_date, total_amount');
    err.statusCode = 400;
    throw err;
  }

  // Validate dates
  if (new Date(start_date) >= new Date(end_date)) {
    const err = new Error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
    err.statusCode = 400;
    throw err;
  }

  // Validate amount
  if (total_amount <= 0) {
    const err = new Error('الميزانية يجب أن تكون أكبر من صفر');
    err.statusCode = 400;
    throw err;
  }

  // Validate department if provided
  if (department && !VALID_DEPARTMENTS.includes(department)) {
    const err = new Error(`القسم غير صالح. يجب أن يكون واحد من: ${VALID_DEPARTMENTS.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  // Generate budget code
  const budgetCode = await repo.generateBudgetCode(fiscal_year);

  const budget = await repo.createBudget({
    ...data,
    budget_code: budgetCode,
    total_amount: parseFloat(total_amount),
    status: 'draft',
    created_by: currentUser.id
  });

  return budget;
}

/**
 * Get all budgets with filters
 */
async function getAllBudgets(filters = {}) {
  return repo.getAllBudgets(filters);
}

/**
 * Get budget by ID
 */
async function getBudgetById(id) {
  const budget = await repo.getBudgetById(id);
  
  if (!budget) {
    const err = new Error('الميزانية غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  return budget;
}

/**
 * Update budget
 */
async function updateBudget(id, data, currentUser) {
  const budget = await repo.getBudgetById(id);
  
  if (!budget) {
    const err = new Error('الميزانية غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  // Cannot update completed or cancelled budgets
  if (['completed', 'cancelled'].includes(budget.status)) {
    const err = new Error('لا يمكن تحديث ميزانية مكتملة أو ملغاة');
    err.statusCode = 400;
    throw err;
  }

  // Validate amount if being updated
  if (data.total_amount !== undefined && data.total_amount <= 0) {
    const err = new Error('الميزانية يجب أن تكون أكبر من صفر');
    err.statusCode = 400;
    throw err;
  }

  const updatedBudget = await repo.updateBudget(id, data);
  return updatedBudget;
}

/**
 * Delete budget (only drafts)
 */
async function deleteBudget(id) {
  const budget = await repo.getBudgetById(id);
  
  if (!budget) {
    const err = new Error('الميزانية غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  if (budget.status !== 'draft') {
    const err = new Error('لا يمكن حذف ميزانية غير مسودة');
    err.statusCode = 400;
    throw err;
  }

  const deleted = await repo.deleteBudget(id);
  
  if (!deleted) {
    const err = new Error('فشل في حذف الميزانية');
    err.statusCode = 500;
    throw err;
  }

  return { message: 'تم حذف الميزانية بنجاح' };
}

/**
 * Activate budget
 */
async function activateBudget(id) {
  const budget = await repo.getBudgetById(id);
  
  if (!budget) {
    const err = new Error('الميزانية غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  if (budget.status !== 'draft') {
    const err = new Error('يمكن فقط تنشيط الميزانيات في حالة "مسودة"');
    err.statusCode = 400;
    throw err;
  }

  const updatedBudget = await repo.updateBudget(id, { status: 'active' });
  return updatedBudget;
}

/**
 * Get budget vs actual analysis
 */
async function getBudgetAnalysis(budgetId) {
  const analysis = await repo.getBudgetAnalysis(budgetId);
  
  if (!analysis) {
    const err = new Error('الميزانية غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  // Calculate variance
  const budgetAmount = parseFloat(analysis.budget_amount);
  const actualAmount = parseFloat(analysis.actual_amount);
  const remaining = parseFloat(analysis.remaining);
  const variance = budgetAmount - actualAmount;
  const variancePercentage = budgetAmount > 0 
    ? parseFloat(((variance / budgetAmount) * 100).toFixed(2))
    : 0;

  // Determine status
  let status = 'on_track';
  if (analysis.utilization_percentage > 100) {
    status = 'over_budget';
  } else if (analysis.utilization_percentage > 80) {
    status = 'warning';
  }

  return {
    budget_id: analysis.id,
    budget_code: analysis.budget_code,
    name: analysis.name,
    name_ar: analysis.name_ar,
    fiscal_year: analysis.fiscal_year,
    department: analysis.department,
    cost_center: analysis.cost_center,
    period: {
      start_date: analysis.start_date,
      end_date: analysis.end_date
    },
    financials: {
      budget_amount: budgetAmount,
      actual_amount: parseFloat(actualAmount.toFixed(2)),
      remaining: parseFloat(remaining.toFixed(2)),
      variance: parseFloat(variance.toFixed(2)),
      variance_percentage: variancePercentage,
      utilization_percentage: parseFloat(analysis.utilization_percentage),
      transaction_count: parseInt(analysis.transaction_count)
    },
    status,
    generated_at: new Date().toISOString()
  };
}

/**
 * Get budget summary
 */
async function getBudgetSummary(filters = {}) {
  const summary = await repo.getBudgetSummary(filters);

  const totalBudgeted = parseFloat(summary.total_budgeted);
  const totalActual = parseFloat(summary.total_actual);
  const totalRemaining = parseFloat(summary.total_remaining);
  const overallUtilization = totalBudgeted > 0 
    ? parseFloat(((totalActual / totalBudgeted) * 100).toFixed(2))
    : 0;

  return {
    period: filters.fiscal_year ? `FY ${filters.fiscal_year}` : 'All Years',
    department: filters.department || 'All Departments',
    total_budgets: parseInt(summary.total_budgets),
    total_budgeted: totalBudgeted,
    total_actual: totalActual,
    total_remaining: totalRemaining,
    overall_utilization_percentage: overallUtilization,
    generated_at: new Date().toISOString()
  };
}

/**
 * Check if expense exceeds budget
 */
async function checkBudgetLimit(department, amount, expenseDate) {
  // Find active budgets for this department and date
  const budgets = await repo.getAllBudgets({
    department,
    status: 'active'
  });

  const applicableBudget = budgets.find(b => {
    return expenseDate >= b.start_date && expenseDate <= b.end_date;
  });

  if (!applicableBudget) {
    return {
      has_budget: false,
      within_limit: true,
      message: 'لا توجد ميزانية نشطة لهذا القسم'
    };
  }

  // Get actual expenses to date
  const actualExpenses = await repo.getActualExpenses(
    applicableBudget.id,
    applicableBudget.start_date,
    expenseDate
  );

  const currentActual = parseFloat(actualExpenses.total_actual);
  const budgetAmount = parseFloat(applicableBudget.total_amount);
  const projectedTotal = currentActual + amount;
  const remaining = budgetAmount - currentActual;

  return {
    has_budget: true,
    budget_id: applicableBudget.id,
    budget_code: applicableBudget.budget_code,
    budget_amount: budgetAmount,
    current_actual: currentActual,
    projected_total: parseFloat(projectedTotal.toFixed(2)),
    remaining: parseFloat(remaining.toFixed(2)),
    within_limit: projectedTotal <= budgetAmount,
    over_by: projectedTotal > budgetAmount 
      ? parseFloat((projectedTotal - budgetAmount).toFixed(2))
      : 0,
    message: projectedTotal > budgetAmount 
      ? `المبلغ يتجاوز الميزانية بمقدار ${projectedTotal - budgetAmount}`
      : 'المبلغ ضمن الميزانية'
  };
}

module.exports = {
  createBudget,
  getAllBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  activateBudget,
  getBudgetAnalysis,
  getBudgetSummary,
  checkBudgetLimit,
  VALID_DEPARTMENTS
};
