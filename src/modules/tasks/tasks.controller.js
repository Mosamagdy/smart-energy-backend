const service = require('./tasks.service');

// ============================================================================
// Tasks Controller - HTTP Request Handlers
// ============================================================================

/**
 * POST /api/projects/:id/tasks
 * Create a new task in project
 */
async function createTask(req, res, next) {
  try {
    const task = await service.createTask(req.params.id, req.body, req.user);
    
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء المهمة بنجاح',
      data: { task }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:id/tasks
 * List all tasks for project
 */
async function getProjectTasks(req, res, next) {
  try {
    const tasks = await service.getProjectTasks(req.params.id, req.user);
    
    res.status(200).json({
      status: 'success',
      data: { tasks, count: tasks.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/projects/:id/tasks/:taskId
 * Update task information
 */
async function updateTask(req, res, next) {
  try {
    const task = await service.updateTask(req.params.taskId, req.body, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تم تحديث المهمة',
      data: { task }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/projects/:id/tasks/:taskId/status
 * Update task status
 */
async function updateTaskStatus(req, res, next) {
  try {
    const { status } = req.body;
    
    if (!status) {
      const err = new Error('حالة المهمة مطلوبة');
      err.statusCode = 400;
      throw err;
    }
    
    const task = await service.updateTaskStatus(req.params.taskId, status, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تم تحديث حالة المهمة',
      data: { task }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * ✅ TASK 2: GET /api/tasks/my-tasks
 * Get all tasks assigned to current user (across all projects)
 */
async function getMyTasks(req, res, next) {
  try {
    const tasks = await service.getMyTasks(req.user);
    
    res.status(200).json({
      status: 'success',
      data: { tasks, count: tasks.length }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTask,
  getProjectTasks,
  updateTask,
  updateTaskStatus,
  getMyTasks,  // ✅ Export new function
};
