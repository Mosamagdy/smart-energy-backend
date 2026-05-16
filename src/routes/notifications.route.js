const express        = require('express');
const router         = express.Router();
const controller     = require('../modules/notifications/notifications.controller');

const { authMiddleware } = require('../middlewares/auth');

router.use(authMiddleware);

// GET    /api/notifications           — كل الإشعارات
// GET    /api/notifications?unread_only=true — غير المقروءة فقط
router.get('/',                controller.getMyNotifications);

// PATCH  /api/notifications/read-all  — تحديد الكل كمقروء
router.patch('/read-all',      controller.markAllAsRead);

// PATCH  /api/notifications/:id/read  — تحديد واحد كمقروء
router.patch('/:id/read',      controller.markAsRead);

// DELETE /api/notifications/:id       — حذف إشعار
router.delete('/:id',          controller.deleteNotification);

module.exports = router;