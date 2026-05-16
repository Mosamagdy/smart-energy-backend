const express = require('express');
const router = express.Router();
const salesController = require('./sales.controller');
const { authMiddleware } = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role');
// ============================================================================
// Sales Module Routes
// Base path: /api/sales
// ============================================================================

// All routes require authentication
router.use(authMiddleware);

// Won Lead Processing - Allow multiple roles
router.get('/leads/won', roleMiddleware(['super_admin', 'general_manager', 'finance_manager', 'sales_manager', 'sales_rep']), salesController.getWonLeads);
router.post('/leads/:id/process-won', roleMiddleware(['super_admin', 'general_manager', 'finance_manager', 'sales_manager']), salesController.processWonLead);

// Sales Invoices
router.post('/invoices', roleMiddleware(['super_admin', 'general_manager', 'finance_manager']), salesController.createSalesInvoice);
router.post('/invoices/:id/finalize', roleMiddleware(['super_admin', 'general_manager', 'finance_manager']), salesController.finalizeSalesInvoice);
router.get('/invoices', roleMiddleware(['super_admin', 'general_manager', 'finance_manager', 'sales_manager']), salesController.getSalesInvoices);
router.get('/invoices/:id', roleMiddleware(['super_admin', 'general_manager', 'finance_manager', 'sales_manager']), salesController.getSalesInvoiceById);
router.get('/invoices/:id/pdf', roleMiddleware(['super_admin', 'general_manager', 'finance_manager', 'sales_manager']), salesController.getInvoicePDF);

module.exports = router;
