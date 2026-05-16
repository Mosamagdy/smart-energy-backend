const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('../modules/leads/inspection-reports.controller');
const { authMiddleware } = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');
const upload = require('../config/multer');

router.use(authMiddleware);

// POST /api/leads/:leadId/reports
router.post(
  '/',
  roleMiddleware(['engineer', 'dept_head', 'super_admin', 'general_manager', 'sales_rep']),
  upload.single('file'),
  controller.createInspectionReport
);

// GET /api/leads/:leadId/reports
router.get(
  '/',
  roleMiddleware(['super_admin', 'general_manager', 'dept_head', 'sales_rep', 'quotation_specialist', 'engineer']),
  controller.getReportsByLeadId
);

// GET /api/inspection-reports/:id
router.get(
  '/:id',
  roleMiddleware(['super_admin', 'general_manager', 'dept_head', 'sales_rep', 'quotation_specialist']),
  controller.getInspectionReportById
);

// PATCH /api/inspection-reports/:id
router.patch(
  '/:id',
  roleMiddleware(['engineer', 'dept_head', 'super_admin', 'general_manager']),
  upload.single('file'),
  controller.updateInspectionReport
);

// DELETE /api/inspection-reports/:id
router.delete(
  '/:id',
  roleMiddleware(['super_admin', 'general_manager']),
  controller.deleteInspectionReport
);

module.exports = router;