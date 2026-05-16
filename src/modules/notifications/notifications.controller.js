const service = require('./notifications.service');

/**
 * GET /api/notifications
 * Get all notifications for logged-in user
 * ?unread_only=true → only unread
 */
async function getMyNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const unread_only = req.query.unread_only === 'true';
    
    console.log('[Notifications] Fetching for user ID:', userId);
    console.log('[Notifications] User from JWT:', req.user);
    
    const notifications = await service.getMyNotifications(userId, { unread_only });
    const unread_count  = await service.getUnreadCount(userId);
    
    console.log('[Notifications] Found', notifications.length, 'notifications,', unread_count, 'unread');
    
    res.status(200).json({
      status: 'success',
      data: { notifications, unread_count, count: notifications.length },
    });
  } catch (err) {
    console.error('[Notifications] Error:', err);
    next(err);
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Mark single notification as read
 */
async function markAsRead(req, res, next) {
  try {
    const notif = await service.markAsRead(req.params.id, req.user.id);
    res.status(200).json({ status: 'success', data: { notification: notif } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
async function markAllAsRead(req, res, next) {
  try {
    await service.markAllAsRead(req.user.id);
    res.status(200).json({ status: 'success', message: 'تم تحديد كل الإشعارات كمقروءة' });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
async function deleteNotification(req, res, next) {
  try {
    await service.deleteNotification(req.params.id, req.user.id);
    res.status(200).json({ status: 'success', message: 'تم حذف الإشعار' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};