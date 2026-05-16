const { query } = require('../../db');
const repo = require('./tasks.repository');
const projectRepo = require('../projects/projects.repository');
const { notify, notifyRole } = require('../../utils/notify');

// ============================================================================
// Tasks Service - Business Logic Layer
// ============================================================================

/**
 * Create a new task in project
 */
async function createTask(projectId, data, currentUser) {
  const { title, description, assigned_to, start_date, due_date, priority } = data;

  // Validate required fields
  if (!title) {
    const err = new Error('عنوان المهمة مطلوب');
    err.statusCode = 400;
    throw err;
  }

  // Verify project exists
  const project = await projectRepo.getProjectById(projectId);
  if (!project) {
    const err = new Error('المشروع غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // If assigning to user, verify they're from project's department
  if (assigned_to) {
    const { rows: [userEmp] } = await query(
      `SELECT e.department_id 
       FROM employees e
       JOIN users u ON u.id = e.user_id
       WHERE u.id = $1 LIMIT 1`,
      [assigned_to]
    );

    if (!userEmp) {
      const err = new Error('المستخدم المحدد ليس موظفًا');
      err.statusCode = 400;
      throw err;
    }

    // CRITICAL: Department filtering - can only assign employees from project's department
    if (Number(userEmp.department_id) !== Number(project.department_id)) {
      const err = new Error('يمكن تعيين موظفين من إدارة المشروع فقط');
      err.statusCode = 400;
      throw err;
    }
  }

  // Create the task
  const task = await repo.createTask({
    project_id: projectId,
    parent_task_id: data.parent_task_id,
    title,
    description,
    assigned_to,
    start_date,
    due_date,
    priority: priority || 'medium',
    status: 'pending'
  });

  // Notify assigned engineer/technician
  if (assigned_to) {
    await notify({
      user_id: assigned_to,
      title: 'تم تعيينك في مهمة جديدة',
      message: `تم تعيينك في المهمة: "${title}" ضمن مشروع "${project.name}"`,
      type: 'info',
      entity_type: 'task',
      entity_id: task.id
    });
  }

  // Notify project manager
  if (project.project_manager_id) {
    await notify({
      user_id: project.project_manager_id,
      title: 'تم إنشاء مهمة جديدة',
      message: `تم إنشاء مهمة جديدة في مشروع "${project.name}": ${title}`,
      type: 'warning',
      entity_type: 'task',
      entity_id: task.id
    });
  }

  // Notify GM
  await notifyRole('general_manager', {
    title: 'مهمة جديدة في المشاريع',
    message: `تم إنشاء مهمة "${title}" في مشروع "${project.name}"`,
    type: 'info',
    entity_type: 'task',
    entity_id: task.id
  });

  return task;
}

/**
 * Get all tasks for project
 */
async function getProjectTasks(projectId, currentUser) {
  const project = await projectRepo.getProjectById(projectId);
  
  if (!project) {
    const err = new Error('المشروع غير موجود');
    err.statusCode = 404;
    throw err;
  }

  return repo.getProjectTasks(projectId);
}

/**
 * Update task information
 */
async function updateTask(taskId, data, currentUser) {
  const task = await repo.getTaskById(taskId);
  
  if (!task) {
    const err = new Error('المهمة غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  // Verify authorization
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  
  if (!['super_admin', 'general_manager', 'project_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية تحديث المهام');
    err.statusCode = 403;
    throw err;
  }

  const updated = await repo.updateTask(taskId, data);

  // Notify if assigned to different user
  if (data.assigned_to && data.assigned_to !== task.assigned_to) {
    await notify({
      user_id: data.assigned_to,
      title: 'تم تعيينك في مهمة',
      message: `تم تعيينك في المهمة: "${updated.title}"`,
      type: 'info',
      entity_type: 'task',
      entity_id: taskId
    });
  }

  return updated;
}

/**
 * Update task status
 */
async function updateTaskStatus(taskId, status, currentUser) {
  const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    const err = new Error('حالة المهمة غير صحيحة');
    err.statusCode = 400;
    throw err;
  }

  const task = await repo.getTaskById(taskId);
  
  if (!task) {
    const err = new Error('المهمة غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  // Authorization check
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  
  // Engineer can only update their own tasks
  if (userRole === 'engineer') {
    if (Number(task.assigned_to) !== Number(currentUser.id)) {
      const err = new Error('يمكنك تحديث حالة مهامك فقط');
      err.statusCode = 403;
      throw err;
    }
  }
  
  // Project manager and above can update any task
  if (!['super_admin', 'general_manager', 'project_manager', 'engineer'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية تحديث حالة المهمة');
    err.statusCode = 403;
    throw err;
  }

  const completedAt = status === 'completed' ? new Date() : null;
  const updated = await repo.updateTaskStatus(taskId, status, completedAt);

  // Notifications
  if (status === 'completed') {
    // Notify project manager
    const { rows: [proj] } = await query(
      `SELECT project_manager_id, name FROM projects WHERE id = $1`,
      [task.project_id]
    );

    if (proj && proj.project_manager_id) {
      await notify({
        user_id: proj.project_manager_id,
        title: 'تم اكتمال مهمة',
        message: `تم اكتمال المهمة: "${task.title}" في مشروع "${proj.name}"`,
        type: 'success',
        entity_type: 'task',
        entity_id: taskId
      });
    }

    // Notify GM
    await notifyRole('general_manager', {
      title: 'مهمة مكتملة',
      message: `تم اكتمال المهمة: "${task.title}" في مشروع "${proj?.name || 'غير معروف'}"`,
      type: 'success',
      entity_type: 'task',
      entity_id: taskId
    });
  }

  return updated;
}

/**
 * Get project progress percentage (dynamic calculation)
 */
async function getProjectProgress(projectId) {
  const progress = await repo.calculateProjectProgress(projectId);
  return { project_id: projectId, progress_percentage: progress };
}

/**
 * ✅ TASK 2: Get all tasks assigned to current user (across all projects)
 */
async function getMyTasks(currentUser) {
  const userId = currentUser.id;
  
  if (!userId) {
    const err = new Error('معرف المستخدم مطلوب');
    err.statusCode = 400;
    throw err;
  }

  return repo.getMyTasks(userId);
}

module.exports = {
  createTask,
  getProjectTasks,
  updateTask,
  updateTaskStatus,
  getProjectProgress,
  getMyTasks,  // ✅ Export new function
};
