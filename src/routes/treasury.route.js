const express = require('express');
const router = express.Router();
const controller = require('../modules/treasury/treasury.controller');
const roleMiddleware  = require('../middlewares/role');

// GET /api/finance/treasury/dashboard - Get treasury dashboard
router.get(
  '/dashboard',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getTreasuryDashboard
);

module.exports = router;
