const { query } = require('../db');

/**
 * Send a notification to a single user
 */
async function notify({ user_id, title, message, type = 'info', entity_type = null, entity_id = null }) {
  await query(
    `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [user_id, title, message, type, entity_type, entity_id]
  );
}

/**
 * Send notifications to multiple users at once
 */
async function notifyMany(userIds = [], { title, message, type = 'info', entity_type = null, entity_id = null }) {
  if (!userIds.length) return;
  for (const user_id of userIds) {
    await notify({ user_id, title, message, type, entity_type, entity_id });
  }
}

/**
 * Notify all users with a specific role
 */
async function notifyRole(roleName, { title, message, type = 'info', entity_type = null, entity_id = null }) {
  const result = await query(
    `SELECT u.id FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = $1 AND u.status = 'active'`,
    [roleName]
  );
  const userIds = result.rows.map(r => r.id);
  await notifyMany(userIds, { title, message, type, entity_type, entity_id });
}

/**
 * Notify dept_head of a specific department
 */
async function notifyDeptHead(departmentId, { title, message, type = 'info', entity_type = null, entity_id = null }) {
  const result = await query(
    `SELECT u.id FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'dept_head'
       AND u.department_id = $1
       AND u.status = 'active'`,
    [departmentId]
  );
  const userIds = result.rows.map(r => r.id);
  await notifyMany(userIds, { title, message, type, entity_type, entity_id });
}

/**
 * ✅ Notify tech_head of a specific technical department
 * بيتبعت لما يتعمل طلب معاينة — لما يضغط على النوتيفيكيشن
 * الفرونت هيروح لـ /leads/:entity_id تلقائياً
 */
async function notifyTechHead(departmentId, { title, message, type = 'info', entity_type = null, entity_id = null }) {
  const result = await query(
    `SELECT u.id FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'tech_head'
       AND u.department_id = $1
       AND u.status = 'active'`,
    [departmentId]
  );
  const userIds = result.rows.map(r => r.id);
  await notifyMany(userIds, { title, message, type, entity_type, entity_id });
}

module.exports = { notify, notifyMany, notifyRole, notifyDeptHead, notifyTechHead };