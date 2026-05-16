const service = require('./expenses.service');

// ============================================================================
// Expenses Controller - HTTP Request Handlers
// ============================================================================

/**
 * POST /api/finance/expenses
 * Create expense with auto-journal entry
 */
async function createExpense(req, res, next) {
  try {
    const expense = await service.createExpense(req.body, req.user);
    
    res.status(201).json({
      status: 'success',
      message: 'تم تسجيل المصروف بنجاح',
      data: { expense }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/finance/expenses/:id
 * Get expense details
 */
async function getExpenseById(req, res, next) {
  try {
    const expense = await service.getExpenseById(req.params.id);
    
    if (!expense) {
      const err = new Error('المصروف غير موجود');
      err.statusCode = 404;
      throw err;
    }
    
    res.status(200).json({
      status: 'success',
      data: { expense }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/finance/projects/:projectId/expenses
 * Get all expenses for project
 */
async function getProjectExpenses(req, res, next) {
  try {
    const expenses = await service.getProjectExpenses(req.params.projectId);
    const summary = await service.getTotalProjectExpenses(req.params.projectId);
    
    res.status(200).json({
      status: 'success',
      data: { expenses, summary, count: expenses.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/finance/expenses/:id/approve
 * Approve expense
 */
async function approveExpense(req, res, next) {
  try {
    const expense = await service.approveExpense(req.params.id, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تمت الموافقة على المصروف بنجاح',
      data: { expense }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/finance/expenses/:id/reject
 * Reject expense
 */
async function rejectExpense(req, res, next) {
  try {
    const { reason } = req.body;
    
    const expense = await service.rejectExpense(req.params.id, reason, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تم رفض المصروف',
      data: { expense }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createExpense,
  getExpenseById,
  getProjectExpenses,
  approveExpense,
  rejectExpense,
};
