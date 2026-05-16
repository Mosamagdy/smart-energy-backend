const service = require('./budgeting.service');

// ============================================================================
// Budgeting Controller - Request Handler Layer
// ============================================================================

/**
 * POST /api/budgeting/budgets
 * Create new budget
 */
async function createBudget(req, res, next) {
  try {
    const budget = await service.createBudget(req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء الميزانية بنجاح',
      data: budget
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/budgeting/budgets
 * Get all budgets with filters
 */
async function getAllBudgets(req, res, next) {
  try {
    const { fiscal_year, department, cost_center, status } = req.query;
    const filters = {};
    
    if (fiscal_year) filters.fiscal_year = fiscal_year;
    if (department) filters.department = department;
    if (cost_center) filters.cost_center = cost_center;
    if (status) filters.status = status;

    const budgets = await service.getAllBudgets(filters);
    res.status(200).json({
      status: 'success',
      data: budgets
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/budgeting/budgets/summary
 * Get budget summary
 */
async function getBudgetSummary(req, res, next) {
  try {
    const { fiscal_year, department } = req.query;
    const filters = {};
    
    if (fiscal_year) filters.fiscal_year = fiscal_year;
    if (department) filters.department = department;

    const summary = await service.getBudgetSummary(filters);
    res.status(200).json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/budgeting/budgets/check-limit
 * Check if expense exceeds budget
 */
async function checkBudgetLimit(req, res, next) {
  try {
    const { department, amount, expense_date } = req.query;
    
    if (!department || !amount || !expense_date) {
      const err = new Error('department, amount, expense_date مطلوبة');
      err.statusCode = 400;
      throw err;
    }

    const result = await service.checkBudgetLimit(
      department,
      parseFloat(amount),
      expense_date
    );
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/budgeting/budgets/:id
 * Get budget by ID
 */
async function getBudgetById(req, res, next) {
  try {
    const budget = await service.getBudgetById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: budget
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/budgeting/budgets/:id
 * Update budget
 */
async function updateBudget(req, res, next) {
  try {
    const budget = await service.updateBudget(req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'تم تحديث الميزانية بنجاح',
      data: budget
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/budgeting/budgets/:id/activate
 * Activate budget
 */
async function activateBudget(req, res, next) {
  try {
    const budget = await service.activateBudget(req.params.id);
    res.status(200).json({
      status: 'success',
      message: 'تم تنشيط الميزانية بنجاح',
      data: budget
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/budgeting/budgets/:id
 * Delete budget (only drafts)
 */
async function deleteBudget(req, res, next) {
  try {
    const result = await service.deleteBudget(req.params.id);
    res.status(200).json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/budgeting/budgets/:id/analysis
 * Get budget vs actual analysis
 */
async function getBudgetAnalysis(req, res, next) {
  try {
    const analysis = await service.getBudgetAnalysis(req.params.id);
    res.status(200).json({
      status: 'success',
      data: analysis
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBudget,
  getAllBudgets,
  getBudgetSummary,
  checkBudgetLimit,
  getBudgetById,
  updateBudget,
  activateBudget,
  deleteBudget,
  getBudgetAnalysis
};
