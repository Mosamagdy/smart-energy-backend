const express = require('express');
const router = express.Router();
const controller = require('../modules/receipt-vouchers/receipt-vouchers.controller');
const  roleMiddleware  = require('../middlewares/role');

// POST /api/finance/receipt-vouchers - Create voucher
router.post(
  '/',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.createVoucher
);

// GET /api/finance/receipt-vouchers - Get all vouchers
router.get(
  '/',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getAllVouchers
);

// GET /api/finance/receipt-vouchers/clients/:clientId/outstanding-invoices
router.get(
  '/clients/:clientId/outstanding-invoices',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getClientOutstandingInvoices
);

// GET /api/finance/receipt-vouchers/:id - Get voucher by ID
router.get(
  '/:id',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getVoucherById
);

// POST /api/finance/receipt-vouchers/:id/post - Post voucher
router.post(
  '/:id/post',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.postVoucher
);

// POST /api/finance/receipt-vouchers/:id/cancel - Cancel voucher
router.post(
  '/:id/cancel',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.cancelVoucher
);

module.exports = router;
