const express = require('express');
const router = express.Router();
const controller = require('../modules/projects/projects.controller');
const { authMiddleware } = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');

// Apply authentication to all PMO routes
router.use(authMiddleware);

/**
 * PMO Dashboard Routes
 * Access: General Manager, Dept Head (PMO), Super Admin
 */

const PMO_ROLES = ['dept_head', 'dep_pr_manager'];

// GET /api/pmo/stats - PMO Dashboard Statistics
router.get(
  '/stats',
  roleMiddleware(['super_admin', 'general_manager', ...PMO_ROLES]),
  controller.getPMOStats
);

// GET /api/pmo/projects/progress - Project Progress List
router.get(
  '/projects/progress',
  roleMiddleware(['super_admin', 'general_manager', ...PMO_ROLES, 'project_manager','contract_dept_head']),
  controller.getProjectProgress
);

// GET /api/pmo/tasks/delayed - Delayed Tasks
router.get(
  '/tasks/delayed',
  roleMiddleware(['super_admin', 'general_manager', ...PMO_ROLES, 'project_manager']),
  controller.getDelayedTasks
);

// GET /api/pmo/projects/recent - Recent Projects
router.get(
  '/projects/recent',
  roleMiddleware(['super_admin', 'general_manager', ...PMO_ROLES, 'project_manager']),
  controller.getRecentProjects
);

module.exports = router;
