const express = require('express');
const router = express.Router();
const controller = require('./purchasing.controller');
const { authMiddleware } = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role');

// All routes require authentication
router.use(authMiddleware);

// ✅ STRICT ROLE ISOLATION:
// - project_manager: Can ONLY create POs (status forced to 'pending')
// - procurement_manager: Can update POs (assign supplier, set prices)
// - finance_manager: Can approve/reject POs
const poCreateRoles = ['super_admin', 'project_manager'];
const poUpdateRoles = ['super_admin', 'procurement_manager'];
const readRoles = ['super_admin', 'general_manager', 'project_manager', 'procurement_manager', 'finance_manager'];

// IMPORTANT: /dashboard and /invoices must be registered BEFORE /:id routes

// GET /api/purchasing/dashboard
router.get('/dashboard',
  roleMiddleware(readRoles),
  controller.getPurchasingDashboard
);

// POST /api/purchasing/orders
router.post('/orders',
  roleMiddleware(poCreateRoles),
  controller.createPO
);

// GET /api/purchasing/orders
router.get('/orders',
  roleMiddleware(readRoles),
  controller.getAllPOs
);

// GET /api/purchasing/orders/:id
router.get('/orders/:id',
  roleMiddleware(readRoles),
  controller.getPOById
);

// PUT /api/purchasing/orders/:id
// ✅ Only procurement_manager can update POs (assign supplier, set prices)
router.put('/orders/:id',
  roleMiddleware(poUpdateRoles),
  controller.updatePO
);

// POST /api/purchasing/orders/:id/receive
router.post('/orders/:id/receive',
  roleMiddleware(['super_admin', 'procurement_manager']),
  controller.receiveGoods
);

// POST /api/purchasing/invoices
router.post('/invoices',
  roleMiddleware(['super_admin', 'finance_manager', 'procurement_manager']),
  controller.createPurchaseInvoice
);

// GET /api/purchasing/invoices
router.get('/invoices',
  roleMiddleware(readRoles),
  controller.getAllPurchaseInvoices
);

// GET /api/purchasing/invoices/:id
router.get('/invoices/:id',
  roleMiddleware(readRoles),
  controller.getPurchaseInvoiceById
);

// POST /api/purchasing/invoices/:id/finalize
router.post('/invoices/:id/finalize',
  roleMiddleware(['super_admin', 'finance_manager', 'procurement_manager']),
  controller.finalizePurchaseInvoice
);

// POST /api/purchasing/invoices/:id/payments
router.post('/invoices/:id/payments',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.recordSupplierPayment
);

module.exports = router;
