const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const controller = require('../modules/projects/projects.controller');
const taskController = require('../modules/tasks/tasks.controller');
const {authMiddleware} = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');

// Keep backend roles in sync with frontend guards.
// These roles replaced legacy dept_head responsibilities.
const PROJECT_VIEW_ROLES = [
  'dept_head',        // legacy (still present)
  'dep_pr_manager',
  'tech_head',
  'mc_manager',
  'qs_manager',
];

// Roles allowed to mutate project state (UI actions: add task/materials/team/manager).
// sales_manager / dep_pr_manager / tech_head must be read-only (403 on mutating routes).
const PROJECT_WRITE_ROLES = [
  'dep_pr_manager',        // legacy (still present)
  'mc_manager',
  'qs_manager',
  'general_manager',        // GM can assign PMs but not manage project details
];

// Read-only viewers (must not see UI actions that 403)
const PROJECT_READONLY_ROLES = [
  'sales_manager',
  'finance_manager',
];

// Configure multer for project delivery documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'projects');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `project-${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, and common document formats
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم — مسموح فقط بالصور وPDF وملفات Office'));
    }
  }
});

// Apply authentication to all project routes
router.use(authMiddleware);

/**
 * Project Management Routes
 * Role access matrix:
 * - super_admin: full access
 * - general_manager: read all + approve statuses + receive all notifications
 * - projects dept_head: assign project managers, view all projects
 * - project_manager: full access to their project(s)
 * - engineer: view assigned tasks + update status
 * - finance_manager: view project financial data
 */

// QHSE Routes temporarily disabled - functions not implemented
// // ============================================================================
// Core Project Routes
// ============================================================================

// POST /api/projects - Create project (GM, super_admin only)
router.post(
  '/',
  roleMiddleware(['super_admin', 'general_manager', ...PROJECT_WRITE_ROLES]),
  controller.createProject
);

// GET /api/projects - List all projects (filtered by role)
router.get(
  '/',
  roleMiddleware(['super_admin', 'general_manager', ...PROJECT_VIEW_ROLES, ...PROJECT_READONLY_ROLES, 'project_manager', 'engineer', 'contract_dept_head']),
  controller.getAllProjects
);

// GET /api/projects/managers/by-department/:departmentId - Get PMs filtered by department
router.get(
  '/managers/by-department/:departmentId',
  authMiddleware,
  roleMiddleware(['super_admin', 'general_manager', ...PROJECT_VIEW_ROLES]),
  controller.getProjectManagersByDepartment
);

// GET /api/projects/:id - Get single project details
router.get(
  '/:id(\\d+)',
  roleMiddleware(['super_admin', 'general_manager', ...PROJECT_VIEW_ROLES, ...PROJECT_READONLY_ROLES, 'project_manager', 'engineer', 'client', 'contract_dept_head']),
  controller.getProjectById
);

// PATCH /api/projects/:id - Update project info
router.patch(
  '/:id(\\d+)',
  roleMiddleware(['super_admin', 'general_manager', 'project_manager']),
  controller.updateProject
);

// PATCH /api/projects/:id/status - Update project status
router.patch(
  '/:id(\\d+)/status',
  roleMiddleware(['super_admin', 'general_manager', 'project_manager']),
  controller.updateProjectStatus
);



/**
 * PATCH /api/projects/:id/deliver
 * Mark project as delivered (final status)
 */
router.patch(
  '/:id/deliver',
  roleMiddleware(['super_admin', 'general_manager', 'project_manager']),
  async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.id);
 
      if (isNaN(projectId)) {
        const err = new Error('رقم المشروع غير صحيح');
        err.statusCode = 400;
        throw err;
      }
 
      const project = await service.deliverProject(projectId, req.user);
 
      res.status(200).json({
        status: 'success',
        message: 'تم تسليم المشروع بنجاح',
        data: { project }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================================
// Project Manager Assignment
// ============================================================================

// POST /api/projects/:id/assign-manager - Assign PM (projects dept_head only)
router.post(
  '/:id(\\d+)/assign-manager',
  roleMiddleware(['super_admin'  , ...PROJECT_WRITE_ROLES]),
  controller.assignProjectManager
);

// ============================================================================
// Project Team Management
// ============================================================================

// POST /api/projects/:id/employees - Assign employees (project_manager, dept_head)
router.post(
  '/:id(\\d+)/employees',
  roleMiddleware(['super_admin', 'general_manager', 'project_manager', ...PROJECT_WRITE_ROLES]),
  controller.assignEmployees
);

// GET /api/projects/:id/employees - List project team members
router.get(
  '/:id(\\d+)/employees',
  roleMiddleware(['super_admin', 'general_manager', ...PROJECT_VIEW_ROLES, ...PROJECT_READONLY_ROLES, 'project_manager', 'engineer', 'contract_dept_head']),
  controller.getProjectEmployees
);

// ============================================================================
// Tasks Management
// ============================================================================

// POST /api/projects/:id/tasks - Create task
router.post(
  '/:id(\\d+)/tasks',
  roleMiddleware(['super_admin', 'general_manager', ...PROJECT_WRITE_ROLES, 'project_manager']),
  taskController.createTask
);

// GET /api/projects/:id/tasks - List tasks
router.get(
  '/:id(\\d+)/tasks',
  roleMiddleware(['super_admin', 'general_manager', ...PROJECT_VIEW_ROLES, ...PROJECT_READONLY_ROLES, 'project_manager', 'engineer', 'contract_dept_head']),
  taskController.getProjectTasks
);

// PATCH /api/projects/:id/tasks/:taskId - Update task
router.patch(
  '/:id(\\d+)/tasks/:taskId(\\d+)',
  roleMiddleware(['super_admin', 'general_manager', ...PROJECT_WRITE_ROLES, 'project_manager']),
  taskController.updateTask
);

// PATCH /api/projects/:id/tasks/:taskId/status - Update task status
router.patch(
  '/:id(\\d+)/tasks/:taskId(\\d+)/status',
  // Read-only roles must not be able to mutate task status
  roleMiddleware(['super_admin', 'general_manager', 'project_manager', 'engineer']),
  taskController.updateTaskStatus
);

// ============================================================================
// Materials & Inventory
// ============================================================================

// POST /api/projects/:id/materials - Allocate materials (project_manager, dept_head)
router.post(
  '/:id(\\d+)/materials',
  roleMiddleware(['super_admin', 'general_manager', 'project_manager', ...PROJECT_WRITE_ROLES]),
  controller.allocateMaterials
);

// GET /api/projects/:id/materials - List allocated materials
router.get(
  '/:id(\\d+)/materials',
  roleMiddleware(['super_admin', 'general_manager', ...PROJECT_VIEW_ROLES, ...PROJECT_READONLY_ROLES, 'project_manager', 'engineer', 'contract_dept_head']),
  controller.getProjectMaterials
);

// ============================================================================
// Assets Management
// ============================================================================

// POST /api/projects/:id/assets - Assign asset to project
router.post(
  '/:id(\\d+)/assets',
  roleMiddleware(['super_admin', 'general_manager', 'project_manager']),
  controller.assignAsset
);

// GET /api/projects/:id/assets - List project assets
router.get(
  '/:id(\\d+)/assets',
  roleMiddleware(['super_admin', 'general_manager', 'dept_head', 'project_manager', 'finance_manager']),
  controller.getProjectAssets
);

// PATCH /api/projects/assets/:assetId/return - Return asset from project
router.patch(
  '/assets/:assetId/return',
  roleMiddleware(['super_admin', 'general_manager', 'project_manager']),
  controller.returnAsset
);

// ============================================================================
// Purchase Requests
// ============================================================================

// POST /api/projects/:id/purchase-requests - Create purchase request
router.post(
  '/:id(\\d+)/purchase-requests',
  roleMiddleware(['super_admin', 'general_manager', 'project_manager']),
  controller.createPurchaseRequest
);

// GET /api/projects/:id/purchase-requests - List purchase requests
router.get(
  '/:id(\\d+)/purchase-requests',
  roleMiddleware(['super_admin', 'general_manager', 'dept_head', 'project_manager', 'finance_manager']),
  controller.getPurchaseRequests
);

// PATCH /api/projects/purchase-requests/:requestId/status - Update status
router.patch(
  '/purchase-requests/:requestId/status',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.updatePurchaseRequestStatus
);

// ============================================================================
// QHSE Inspections - TEMPORARILY DISABLED
// ============================================================================

// Routes commented out - QHSE functions not implemented in controller
/*
// POST /api/projects/:id/qhse-inspections - Create inspection
router.post(
  '/:id/qhse-inspections',
  roleMiddleware(['super_admin', 'general_manager', 'dept_head']),
  controller.createQhseInspection
);

// GET /api/projects/:id/qhse-inspections - List inspections
router.get(
  '/:id/qhse-inspections',
  roleMiddleware(['super_admin', 'general_manager', 'dept_head', 'project_manager', 'engineer']),
  controller.getQhseInspections
);

// PATCH /api/projects/qhse-inspections/:id/submit-report - Submit report
router.patch(
  '/qhse-inspections/:id/submit-report',
  roleMiddleware(['super_admin', 'general_manager', 'dept_head', 'engineer']),
  controller.updateQhseInspection
);
*/

// ============================================================================
// Project Delivery
// ============================================================================

// PATCH /api/projects/:id/deliver - Mark as delivered with document upload
router.patch(
  '/:id(\\d+)/deliver',
  roleMiddleware(['super_admin', 'general_manager', 'project_manager']),
  upload.array('documents', 10), // Field name: 'documents', max 10 files
  controller.deliverProject
);

module.exports = router;