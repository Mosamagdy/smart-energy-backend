const express = require('express');
const router = express.Router();
const controller = require('./budgeting.controller');
const { authMiddleware } = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role');

// All routes require authentication
router.use(authMiddleware);

// Write roles: super_admin, finance_manager
const writeRoles = ['super_admin', 'finance_manager'];
// Read roles: super_admin, finance_manager, general_manager
const readRoles = ['super_admin', 'finance_manager', 'general_manager'];

// IMPORTANT: Static routes MUST be registered BEFORE /:id routes

// GET /api/budgeting/budgets/summary
router.get('/budgets/summary',
  roleMiddleware(readRoles),
  controller.getBudgetSummary
);

// GET /api/budgeting/budgets/check-limit
router.get('/budgets/check-limit',
  roleMiddleware(readRoles),
  controller.checkBudgetLimit
);

// POST /api/budgeting/budgets
router.post('/budgets',
  roleMiddleware(writeRoles),
  controller.createBudget
);

// GET /api/budgeting/budgets
router.get('/budgets',
  roleMiddleware(readRoles),
  controller.getAllBudgets
);

// GET /api/budgeting/budgets/:id
router.get('/budgets/:id',
  roleMiddleware(readRoles),
  controller.getBudgetById
);

// PUT /api/budgeting/budgets/:id
router.put('/budgets/:id',
  roleMiddleware(writeRoles),
  controller.updateBudget
);

// POST /api/budgeting/budgets/:id/activate
router.post('/budgets/:id/activate',
  roleMiddleware(writeRoles),
  controller.activateBudget
);

// DELETE /api/budgeting/budgets/:id
router.delete('/budgets/:id',
  roleMiddleware(writeRoles),
  controller.deleteBudget
);

// GET /api/budgeting/budgets/:id/analysis
router.get('/budgets/:id/analysis',
  roleMiddleware(readRoles),
  controller.getBudgetAnalysis
);

module.exports = router;
