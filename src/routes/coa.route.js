const express = require('express');
const router = express.Router();
const controller = require('../modules/coa/coa.controller');
const { authMiddleware } = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');  

// Apply authentication to all COA routes
router.use(authMiddleware);

/**
 * Chart of Accounts Routes
 * Role access matrix:
 * - super_admin: full access
 * - general_manager: read all
 * - finance_manager: full access (manage accounts)
 * - accountants: read all
 */

// GET /api/coa/tree - Get full account tree
router.get(
  '/tree',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getAccountTree
);

// GET /api/coa/search/:term - Search accounts
router.get(
  '/search/:term',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.searchAccounts
);

// GET /api/coa/type/:type - Get accounts by type
router.get(
  '/type/:type',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getAccountsByType
);

// GET /api/coa/code/:code - Get account by code
router.get(
  '/code/:code',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getAccountByCode
);

// GET /api/coa/:id - Get single account
router.get(
  '/:id',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getAccountById
);

// POST /api/coa - Create new account (finance_manager only)
router.post(
  '/',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.createAccount
);

// PATCH /api/coa/:id - Update account
router.patch(
  '/:id',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.updateAccount
);

// PATCH /api/coa/:id/deactivate - Deactivate account
router.patch(
  '/:id/deactivate',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.deactivateAccount
);

module.exports = router;
