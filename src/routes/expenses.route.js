const express = require('express');
const router = express.Router();
const controller = require('../modules/expenses/expenses.controller');
const { authMiddleware } = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');

// Apply authentication to all expense routes
router.use(authMiddleware);

/**
 * Expense Management Routes
 * Role access matrix:
 * - super_admin: full access
 * - general_manager: read all + approve/reject
 * - finance_manager: full access
 * - project_manager: create expenses, read own
 */

// POST /api/finance/expenses - Create expense
router.post(
  '/expenses',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager', 'project_manager']),
  controller.createExpense
);

// GET /api/finance/expenses/:id - Get expense details
router.get(
  '/expenses/:id',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager', 'project_manager']),
  controller.getExpenseById
);

// GET /api/finance/projects/:projectId/expenses - Project expenses
router.get(
  '/projects/:projectId/expenses',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager', 'project_manager']),
  controller.getProjectExpenses
);

// PATCH /api/finance/expenses/:id/approve - Approve
router.patch(
  '/expenses/:id/approve',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.approveExpense
);

// PATCH /api/finance/expenses/:id/reject - Reject
router.patch(
  '/expenses/:id/reject',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.rejectExpense
);

module.exports = router;
