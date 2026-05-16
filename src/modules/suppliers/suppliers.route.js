const express = require('express');
const router = express.Router();
const controller = require('./suppliers.controller');
const { authMiddleware } = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role');

// All routes require authentication
router.use(authMiddleware);

// POST /api/suppliers
router.post('/',
  roleMiddleware(['super_admin', 'finance_manager', 'procurement_manager', 'general_manager']),
  controller.createSupplier
);

// GET /api/suppliers
// ✅ STRICT ROLE ISOLATION: project_manager removed - should NOT see suppliers list
router.get('/',
  roleMiddleware(['super_admin', 'finance_manager', 'procurement_manager', 'general_manager']),
  controller.getAllSuppliers
);

// GET /api/suppliers/:id
router.get('/:id',
  roleMiddleware(['super_admin', 'finance_manager', 'procurement_manager', 'general_manager']),
  controller.getSupplierById
);

// PUT /api/suppliers/:id
router.put('/:id',
  roleMiddleware(['super_admin', 'finance_manager', 'procurement_manager', 'general_manager']),
  controller.updateSupplier
);

// GET /api/suppliers/:id/statement
router.get('/:id/statement',
  roleMiddleware(['super_admin', 'finance_manager', 'procurement_manager', 'general_manager']),
  controller.getSupplierStatement
);

module.exports = router;
