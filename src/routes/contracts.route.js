const express = require('express');
const router = express.Router();
const controller = require('../modules/contracts/contracts.controller');
const {authMiddleware} = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');  

// Apply authentication to all contract routes
router.use(authMiddleware);

/**
 * Contracts Management Routes
 * Role access matrix:
 * - super_admin: full access
 * - general_manager: read all + receive notifications
 * - dept_head: create/update contracts, library view
 * - finance_manager: read all (for financial cycle)
 * - project_manager: read own project contracts
 * - client: read own contracts
 */

// ============================================================================
// Core Contract Routes
// ============================================================================

// // POST /api/contracts - Create contract (dept_head only)
// router.post(
//   '/',
//   roleMiddleware(['super_admin', 'general_manager', 'contract_dept_head']),
//   controller.upload.single('attachment_url'), // Multipart form for PDF upload
//   controller.createContract
// );

// GET /api/contracts - List all contracts (Library View for Contracts Dept)
router.get(
  '/',
  roleMiddleware(['super_admin', 'general_manager', 'dept_head', 'finance_manager', 'project_manager', 'engineer', 'contract_dept_head' , 'sales_manager','dep_pr_manager' , 'tech_head']),
  controller.getAllContracts
);

// GET /api/contracts/expiring - Get expiring contracts
router.get(
  '/expiring',
  roleMiddleware(['super_admin', 'general_manager', 'dept_head', 'finance_manager']),
  controller.getExpiringContracts
);

// GET /api/contracts/:id - Get single contract details
router.get(
  '/:id',
  roleMiddleware(['super_admin', 'general_manager', 'dept_head', 'finance_manager', 'project_manager', 'engineer', 'client', 'contract_dept_head','dep_pr_manager', 'sales_manager']),
  controller.getContractById
);

// PATCH /api/contracts/:id - Update contract
router.patch(
  '/:id',
  roleMiddleware(['super_admin', 'general_manager', 'contract_dept_head']),
  controller.updateContract
);

// PATCH /api/contracts/:id/sign - Sign contract
router.patch(
  '/:id/sign',
  roleMiddleware(['super_admin', 'general_manager', 'contract_dept_head', 'client']),
  controller.signContract
);

// ✅ POST /api/contracts/:projectId/upload - Upload contract for project
router.post(
  '/:projectId/upload',
  roleMiddleware(['contract_dept_head', 'super_admin', 'general_manager']),
  controller.upload.single('contract'),
  controller.uploadContract
);

module.exports = router;
