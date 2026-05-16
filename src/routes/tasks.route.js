const express = require('express');
const router = express.Router();
const taskController = require('../modules/tasks/tasks.controller');
const { authMiddleware } = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');

router.use(authMiddleware);

// ============================================================================
// My Tasks - Global tasks view for assigned users
// ============================================================================

// ✅ TASK 2: GET /api/tasks/my-tasks - Get all tasks assigned to current user
router.get(
  '/my-tasks',
  roleMiddleware(['super_admin', 'general_manager', 'project_manager', 'dept_head', 'engineer','contract_dept_head']),
  taskController.getMyTasks
);

// ✅ PATCH /api/tasks/:taskId/status - Update task status directly (for my-tasks page)
router.patch(
  '/:taskId/status',
  roleMiddleware(['super_admin', 'general_manager', 'project_manager', 'dept_head', 'engineer','contract_dept_head']),
  taskController.updateTaskStatus
);

module.exports = router;
