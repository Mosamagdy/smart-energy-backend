const express = require('express');
const router = express.Router();
const controller = require('./reports.controller');
const { authMiddleware } = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role');

// All report routes require authentication
router.use(authMiddleware);

// All report routes: super_admin, general_manager, finance_manager only
// NOTE: controller enforces fine-grained access per role.
const reportRoles = [
  'super_admin',
  'general_manager',
  'finance_manager',
  'hr_manager',
  'sales_manager',
  'sales_rep',
  'dep_pr_manager',
  'tech_head',
];

// GET /api/reports/available - metadata (what this role can see)
router.get('/available',
  roleMiddleware(reportRoles),
  controller.getAvailableReports
);

// GET /api/reports/trial-balance
router.get('/trial-balance',
  roleMiddleware(reportRoles),
  controller.getTrialBalance
);

// GET /api/reports/balance-sheet
router.get('/balance-sheet',
  roleMiddleware(reportRoles),
  controller.getBalanceSheet
);

// GET /api/reports/income-statement
router.get('/income-statement',
  roleMiddleware(reportRoles),
  controller.getIncomeStatement
);

// GET /api/reports/ledger/:accountCode
router.get('/ledger/:accountCode',
  roleMiddleware(reportRoles),
  controller.getAccountLedger
);

// GET /api/reports/receivables-aging
router.get('/receivables-aging',
  roleMiddleware(reportRoles),
  controller.getReceivablesAging
);

// GET /api/reports/payables-aging
router.get('/payables-aging',
  roleMiddleware(reportRoles),
  controller.getPayablesAging
);

// GET /api/reports/cash-flow
router.get('/cash-flow',
  roleMiddleware(reportRoles),
  controller.getCashFlow
);

// GET /api/reports/project-cost-vs-invoiced
router.get('/project-cost-vs-invoiced',
  roleMiddleware(reportRoles),
  controller.getProjectCostVsInvoiced
);

module.exports = router;