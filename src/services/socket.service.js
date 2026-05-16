const socketIO = require('socket.io');

/**
 * Socket.io Service
 * Manages real-time connections and notifications with sound alerts
 */

let io = null;
const connectedUsers = new Map(); // userId -> socketId

/**
 * Initialize Socket.io server
 */
function initializeSocketIO(server) {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // User joins their personal room
    socket.on('join_user_room', (userId) => {
      socket.join(`user_${userId}`);
      connectedUsers.set(userId, socket.id);
      console.log(`[Socket.io] User ${userId} joined room user_${userId}`);
      
      // Send confirmation
      socket.emit('room_joined', { 
        success: true, 
        userId,
        message: 'Connected to notification system'
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      // Remove from connected users
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log(`[Socket.io] User ${userId} disconnected`);
          break;
        }
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`[Socket.io] Error for socket ${socket.id}:`, error.message);
    });
  });

  console.log('[Socket.io] Server initialized successfully');
  return io;
}

/**
 * Get Socket.io instance
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocketIO first.');
  }
  return io;
}

/**
 * Send notification to specific user with sound alert
 * @param {number} userId - The user ID to notify
 * @param {string} type - Notification type: 'chat' or 'system'
 * @param {object} data - Notification payload
 */
function sendNotification(userId, type, data = {}) {
  if (!io) {
    console.warn('[Socket.io] Not initialized, skipping notification');
    return;
  }

  const room = `user_${userId}`;
  
  // Determine event name and sound based on type
  let eventName, soundFile;
  
  if (type === 'chat') {
    // Chat messages use message.mp3
    eventName = 'new_message';
    soundFile = 'message.mp3';
  } else {
    // System notifications (invoices, warranty, projects) use notify.mp3
    eventName = 'new_notification';
    soundFile = 'notify.mp3';
  }

  // Prepare notification payload
  const notification = {
    ...data,
    sound: soundFile,
    timestamp: new Date().toISOString(),
    recipient_id: userId
  };

  // Emit to user's personal room
  io.to(room).emit(eventName, notification);
  
  console.log(`[Socket.io] Sent ${eventName} to user ${userId} with sound: ${soundFile}`);
  
  return notification;
}

/**
 * Send chat message notification
 * Convenience wrapper for chat-type notifications
 */
function sendChatNotification(userId, messageData) {
  return sendNotification(userId, 'chat', {
    type: 'chat_message',
    title: messageData.title || 'رسالة جديدة',
    message: messageData.message,
    project_id: messageData.project_id,
    sender_id: messageData.sender_id,
    badge_count: messageData.badge_count || 1
  });
}

/**
 * Send system notification
 * Convenience wrapper for system-type notifications
 */
function sendSystemNotification(userId, systemData) {
  return sendNotification(userId, 'system', {
    type: systemData.notification_type || 'system_alert',
    title: systemData.title,
    message: systemData.message,
    entity_type: systemData.entity_type,
    entity_id: systemData.entity_id,
    priority: systemData.priority || 'normal',
    badge_count: systemData.badge_count || 1
  });
}

/**
 * Broadcast notification to multiple users
 */
function broadcastToUsers(userIds, type, data) {
  if (!Array.isArray(userIds)) {
    userIds = [userIds];
  }

  const results = [];
  
  for (const userId of userIds) {
    const result = sendNotification(userId, type, data);
    results.push(result);
  }

  return results;
}

/**
 * Get count of connected users
 */
function getConnectedUserCount() {
  return connectedUsers.size;
}

/**
 * Check if user is online
 */
function isUserOnline(userId) {
  return connectedUsers.has(userId);
}

module.exports = {
  initializeSocketIO,
  getIO,
  sendNotification,
  sendChatNotification,
  sendSystemNotification,
  broadcastToUsers,
  getConnectedUserCount,
  isUserOnline,
};
