const express = require('express');
const router = express.Router();
const controller = require('./supplier-statement.controller');
const { authMiddleware } = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role');

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * Supplier Statement Routes
 * Role access matrix:
 * - super_admin: full access
 * - general_manager: read all
 * - finance_manager: full access
 */

// GET /api/finance/suppliers/:id/statement - Get supplier statement
router.get(
  '/:id/statement',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getSupplierStatement
);

// GET /api/finance/suppliers/statements/summary - Get all suppliers summary
router.get(
  '/statements/summary',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getSuppliersSummary
);

module.exports = router;
