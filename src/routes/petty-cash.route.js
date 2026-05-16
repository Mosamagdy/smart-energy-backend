const express = require('express');
const router = express.Router();
const controller = require('../modules/petty-cash/petty-cash.controller');
const {authMiddleware} = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');

// Apply authentication to all petty cash routes
router.use(authMiddleware);

/**
 * Petty Cash Management Routes
 * Role access matrix:
 * - super_admin: full access
 * - general_manager: read all
 * - finance_manager: full access (create/fund/reconcile)
 * - engineers: read own funds only
 */

// POST /api/finance/petty-cash/funds - Create fund
router.post(
  '/funds',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.createPettyCashFund
);

// POST /api/finance/petty-cash/funds/:id/fund - Add funds (recharge)
router.post(
  '/funds/:id/fund',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.addFunds
);

// POST /api/finance/petty-cash/funds/:id/expense - Record expense from fund
router.post(
  '/funds/:id/expense',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.recordExpense
);

// GET /api/finance/petty-cash/funds/:id - Get fund details
router.get(
  '/funds/:id',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getFundDetails
);

// GET /api/finance/petty-cash/funds - Get all active funds
router.get(
  '/funds',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getAllActiveFunds
);

// GET /api/finance/petty-cash/engineer/:engineerId - Get engineer's funds
router.get(
  '/engineer/:engineerId',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getEngineerFunds
);

// PATCH /api/finance/petty-cash/funds/:id/reconcile - Reconcile
router.patch(
  '/funds/:id/reconcile',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.reconcileFund
);

// PATCH /api/finance/petty-cash/funds/:id/close - Close fund
router.patch(
  '/funds/:id/close',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.closeFund
);

// GET /api/finance/petty-cash/expenses - Get all expenses
router.get(
  '/expenses',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getAllPettyCashExpenses
);

module.exports = router;
