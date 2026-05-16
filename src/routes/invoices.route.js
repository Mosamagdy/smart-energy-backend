const express = require('express');
const router = express.Router();
const controller = require('../modules/invoices/invoices.controller');
const {authMiddleware} = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');

// Apply authentication to all invoice routes
router.use(authMiddleware);

/**
 * Invoice Management Routes
 * Role access matrix:
 * - super_admin: full access
 * - general_manager: read all + notifications
 * - finance_manager: full access (create/receive payments)
 * - project_manager: read own project invoices
 * - client: read own invoices
 */

// POST /api/finance/invoices - Create invoice
router.post(
  '/invoices',
  roleMiddleware(['super_admin', 'general_manager','finance_manager']),
  controller.createInvoice
);

// GET /api/finance/invoices/:id - Get invoice details
router.get(
  '/invoices/:id',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager', 'project_manager', 'client']),
  controller.getInvoiceById
);

// GET /api/finance/projects/:projectId/invoices - Project invoices
router.get(
  '/projects/:projectId/invoices',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager', 'project_manager', 'engineer', 'contract_dept_head' , 'dep_pr_manager', 'sales_manager','dep_pr_manager', 'tech_head']),
  controller.getProjectInvoices
);

// POST /api/finance/invoices/:id/payments - Record payment
router.post(
  '/invoices/:id/payments',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.recordPayment
);

// GET /api/finance/projects/:projectId/receivables - Receivables summary
router.get(
  '/projects/:projectId/receivables',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getProjectReceivables
);

// POST /api/finance/invoices/:id/generate-tax-invoice - Generate tax invoice
router.post(
  '/invoices/:id/generate-tax-invoice',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.generateTaxInvoice
);

// GET /api/finance/tax-invoices - Get all tax invoices
router.get(
  '/tax-invoices',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getTaxInvoices
);

// POST /api/finance/invoices/:id/finalize - Finalize invoice (draft -> final)
router.post(
  '/invoices/:id/finalize',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.finalizeInvoice
);

module.exports = router;
