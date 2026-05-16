const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth'); // ✅ أضف الـ import
const roleMiddleware = require('../middlewares/role');
const controller = require('../modules/procurement/procurement.controller');

router.use(authMiddleware); // ✅ أضف الـ middleware

router.post(
  '/approve-by-procurement/:id',
  roleMiddleware(['super_admin', 'general_manager', 'procurement_manager']),
  controller.approveByProcurement
);

router.post(
  '/approve-by-finance/:id',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.approveByFinance
);

router.post(
  '/reject/:id',
  roleMiddleware(['super_admin', 'general_manager', 'procurement_manager', 'finance_manager']),
  controller.rejectRequest
);

router.get(
  '/pending-finance',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getPendingFinanceApprovals
);

router.get(
  '/pending-procurement',
  roleMiddleware(['super_admin', 'general_manager', 'procurement_manager']),
  controller.getPendingProcurementApprovals
);

module.exports = router;