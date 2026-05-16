const { query } = require('../../db');

async function getUserNotifications(user_id, { unread_only } = {}) {
  const params = [user_id];
  let sql = `
    SELECT id, user_id, title, message, type, entity_type, entity_id, read_at, created_at
    FROM notifications
    WHERE user_id = $1
  `;
  if (unread_only) {
    sql += ` AND read_at IS NULL`;
  }
  sql += ` ORDER BY created_at DESC`;
  const { rows } = await query(sql, params);
  return rows;
}

async function countUnread(user_id) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
    [user_id]
  );
  return rows[0]?.n ?? 0;
}

async function markAsRead(id, user_id) {
  const { rows } = await query(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, now())
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, title, message, type, entity_type, entity_id, read_at, created_at`,
    [id, user_id]
  );
  return rows[0] || null;
}

async function markAllAsRead(user_id) {
  await query(
    `UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`,
    [user_id]
  );
}

async function deleteNotification(id, user_id) {
  await query(`DELETE FROM notifications WHERE id = $1 AND user_id = $2`, [id, user_id]);
}

async function createNotification({ user_id, title, message, type, entity_type, entity_id }) {
  const { rows } = await query(
    `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, title, message, type, entity_type, entity_id, read_at, created_at`,
    [user_id, title, message, type, entity_type, entity_id]
  );
  return rows[0] || null;
}

module.exports = {
  getUserNotifications,
  countUnread,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
};
