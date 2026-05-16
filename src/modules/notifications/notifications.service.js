const repo = require('./notifications.repository');

async function getMyNotifications(user_id, { unread_only } = {}) {
  return repo.getUserNotifications(user_id, { unread_only });
}

async function getUnreadCount(user_id) {
  return repo.countUnread(user_id);
}

async function markAsRead(id, user_id) {
  const notif = await repo.markAsRead(id, user_id);
  if (!notif) {
    const err = new Error('الإشعار غير موجود');
    err.statusCode = 404;
    throw err;
  }
  return notif;
}

async function markAllAsRead(user_id) {
  await repo.markAllAsRead(user_id);
}

async function deleteNotification(id, user_id) {
  await repo.deleteNotification(id, user_id);
}

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};