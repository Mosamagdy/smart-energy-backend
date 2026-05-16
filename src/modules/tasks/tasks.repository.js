const { query } = require('../../db');

// ============================================================================
// Tasks Repository - Data Access Layer
// ============================================================================

/**
 * Create a new task in project
 */
async function createTask(data) {
  const {
    project_id, parent_task_id, title, description,
    assigned_to, start_date, due_date, priority, status, metadata
  } = data;

  const result = await query(
    `INSERT INTO tasks (
      project_id, parent_task_id, title, description,
      assigned_to, start_date, due_date, priority, status, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [project_id, parent_task_id, title, description, assigned_to, 
     start_date, due_date, priority, status || 'pending', metadata]
  );

  return result.rows[0];
}

/**
 * Get all tasks for a project with details
 */
async function getProjectTasks(projectId) {
  const result = await query(
    `SELECT 
       t.*,
       u.first_name || ' ' || u.last_name AS assigned_to_name,
       u.email AS assigned_to_email,
       parent.title AS parent_task_title
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assigned_to
     LEFT JOIN tasks parent ON parent.id = t.parent_task_id
     WHERE t.project_id = $1
     ORDER BY t.created_at ASC`,
    [projectId]
  );
  
  return result.rows;
}

/**
 * Get single task by ID
 */
async function getTaskById(taskId) {
  const result = await query(
    `SELECT 
       t.*,
       u.first_name || ' ' || u.last_name AS assigned_to_name,
       p.name AS project_name
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assigned_to
     LEFT JOIN projects p ON p.id = t.project_id
     WHERE t.id = $1 LIMIT 1`,
    [taskId]
  );
  
  return result.rows[0] || null;
}

/**
 * Update task information
 */
async function updateTask(taskId, data) {
  const allowedFields = ['title', 'description', 'assigned_to', 'start_date', 'due_date', 'priority', 'metadata'];
  const keys = Object.keys(data).filter(key => allowedFields.includes(key));
  
  if (keys.length === 0) {
    return getTaskById(taskId);
  }
  
  const setClauses = [];
  const values = [];
  
  keys.forEach((key, index) => {
    setClauses.push(`${key} = $${index + 1}`);
    values.push(data[key]);
  });
  
  const setClause = setClauses.join(', ');
  const allValues = [...values, taskId];
  
  const sql = `UPDATE tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
               WHERE id = $${keys.length + 1} RETURNING *`;
  
  const result = await query(sql, allValues);
  return result.rows[0] || null;
}

/**
 * Update task status
 */
async function updateTaskStatus(taskId, status, completedAt = null) {
  const result = await query(
    `UPDATE tasks SET 
        status = $1::varchar,
        completed_at = CASE WHEN $1::varchar = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 RETURNING *`,
    [status, taskId]
  );
  
  return result.rows[0] || null;
}

/**
 * Get task count by status for project
 */
async function getProjectTaskStats(projectId) {
  const result = await query(
    `SELECT 
       status,
       COUNT(*) as count
     FROM tasks
     WHERE project_id = $1
     GROUP BY status`,
    [projectId]
  );
  
  return result.rows;
}

/**
 * Calculate project progress percentage
 * (Completed tasks / Total tasks) * 100
 */
async function calculateProjectProgress(projectId) {
  const result = await query(
    `SELECT 
       COUNT(*) FILTER (WHERE status = 'completed')::float AS completed_count,
       COUNT(*) AS total_count
     FROM tasks
     WHERE project_id = $1`,
    [projectId]
  );
  
  const row = result.rows[0];
  if (!row || row.total_count === 0) {
    return 0;
  }
  
  return Math.round((row.completed_count / row.total_count) * 100);
}

/**
 * Get tasks assigned to specific user
 */
async function getUserTasks(userId, filters = {}) {
  let sql = `
    SELECT 
      t.*,
      p.name AS project_name,
      p.status AS project_status
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.assigned_to = $1
  `;
  
  const params = [userId];
  
  if (filters.status) {
    params.push(filters.status);
    sql += ` AND t.status = $${params.length}`;
  }
  
  if (filters.project_id) {
    params.push(filters.project_id);
    sql += ` AND t.project_id = $${params.length}`;
  }
  
  sql += ` ORDER BY t.due_date ASC`;
  
  const result = await query(sql, params);
  return result.rows;
}

/**
 * ✅ TASK 2: Get all tasks assigned to user (across all projects)
 * Simplified wrapper for getUserTasks
 */
async function getMyTasks(userId) {
  return getUserTasks(userId);
}

module.exports = {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  getProjectTaskStats,
  calculateProjectProgress,
  getUserTasks,
  getMyTasks,  // ✅ Export new function
};
