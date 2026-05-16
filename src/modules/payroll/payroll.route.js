const express = require('express');
const router = express.Router();
const controller = require('./payroll.controller');
const { authMiddleware } = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role');

router.use(authMiddleware);

const writeRoles = ['super_admin', 'finance_manager', 'hr_manager', 'general_manager'];
const readRoles = ['super_admin', 'finance_manager', 'general_manager', 'hr_manager'];

// POST /api/payroll/approve-and-post
// Create journal entries and post payroll immediately
router.post('/approve-and-post',
  roleMiddleware(writeRoles),
  controller.approveAndPostPayroll
);

// GET /api/payroll/status
// Check payroll posting status for month/year (only checks journal_entries)
router.get('/status',
  roleMiddleware(readRoles),
  controller.getPayrollStatus
);

// TASK 6-A: GET /api/payroll/export/excel
// Export payroll to Excel with department grouping and totals
router.get('/export/excel',
  roleMiddleware(readRoles),
  controller.exportPayrollExcel
);

module.exports = router;
