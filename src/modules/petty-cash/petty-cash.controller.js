const service = require('./petty-cash.service');

// ============================================================================
// Petty Cash Controller - HTTP Request Handlers
// ============================================================================

/**
 * POST /api/finance/petty-cash/funds
 * Create petty cash fund for engineer
 */
async function createPettyCashFund(req, res, next) {
  try {
    const fund = await service.createPettyCashFund(req.body, req.user);
    
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء صندوق العهد بنجاح',
      data: { fund }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/finance/petty-cash/funds/:id/fund
 * Add funds to petty cash (recharge)
 */
async function addFunds(req, res, next) {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      const err = new Error('المبلغ يجب أن يكون موجبًا');
      err.statusCode = 400;
      throw err;
    }
    
    const fund = await service.addFunds(req.params.id, amount, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تمت إضافة الأموال بنجاح',
      data: { fund }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/finance/petty-cash/funds/:id/expense
 * Record expense from petty cash fund
 */
async function recordExpense(req, res, next) {
  try {
    const result = await service.recordExpense(req.params.id, req.body, req.user);
    
    res.status(201).json({
      status: 'success',
      message: 'تم تسجيل المصروف بنجاح',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/finance/petty-cash/funds/:id
 * Get fund details with transactions
 */
async function getFundDetails(req, res, next) {
  try {
    const fund = await service.getFundDetails(req.params.id);
    
    res.status(200).json({
      status: 'success',
      data: { fund }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/finance/petty-cash/engineer/:engineerId
 * Get all funds for engineer
 */
async function getEngineerFunds(req, res, next) {
  try {
    const funds = await service.getEngineerFunds(req.params.engineerId);
    const balance = await service.getEngineerTotalBalance(req.params.engineerId);
    
    res.status(200).json({
      status: 'success',
      data: { funds, total_balance: balance.total_balance, count: funds.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/finance/petty-cash/funds
 * Get all active funds
 */
async function getAllActiveFunds(req, res, next) {
  try {
    const repo = require('./petty-cash.repository');
    const funds = await repo.getAllActiveFunds();
    
    res.status(200).json({
      status: 'success',
      data: { funds, count: funds.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/finance/petty-cash/funds/:id/reconcile
 * Reconcile petty cash fund
 */
async function reconcileFund(req, res, next) {
  try {
    const fund = await service.reconcileFund(req.params.id, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تمت تسوية الصندوق بنجاح',
      data: { fund }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/finance/petty-cash/funds/:id/close
 * Close petty cash fund
 */
async function closeFund(req, res, next) {
  try {
    const result = await service.closeFund(req.params.id, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تم إغلاق الصندوق بنجاح',
      data: { result }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/finance/petty-cash/expenses
 * Get all petty cash expenses with filters
 */
async function getAllPettyCashExpenses(req, res, next) {
  try {
    const { startDate, endDate, search } = req.query;
    
    const expenses = await service.getAllPettyCashExpenses({
      startDate,
      endDate,
      search
    });
    
    res.status(200).json({
      status: 'success',
      data: { expenses, count: expenses.length }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPettyCashFund,
  addFunds,
  recordExpense,
  getFundDetails,
  getEngineerFunds,
  getAllActiveFunds,
  reconcileFund,
  closeFund,
  getAllPettyCashExpenses,
};
