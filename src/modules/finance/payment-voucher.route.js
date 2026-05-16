/**
 * Payment Voucher Routes
 * Phase 3: سند الصرف (Payment Vouchers)
 * API endpoint definitions
 */

const express = require('express');
const router = express.Router();
const controller = require('./payment-voucher.controller');
const { authMiddleware } = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role');

// All routes require authentication and finance roles
router.use(authMiddleware);
router.use(roleMiddleware(['super_admin', 'general_manager', 'finance_manager']));

/**
 * POST /api/finance/payment-vouchers
 * Create payment voucher
 */
router.post('/', controller.createVoucher);

/**
 * GET /api/finance/payment-vouchers
 * Get all vouchers with filters
 */
router.get('/', controller.getVouchers);

/**
 * GET /api/finance/payment-vouchers/invoice/:invoice_id
 * Get payment history for an invoice
 */
router.get('/invoice/:invoice_id', controller.getInvoicePaymentHistory);

/**
 * GET /api/finance/payment-vouchers/:id
 * Get voucher by ID
 */
router.get('/:id', controller.getVoucherById);

/**
 * POST /api/finance/payment-vouchers/:id/cancel
 * Cancel a payment voucher
 */
router.post('/:id/cancel', controller.cancelVoucher);

module.exports = router;
