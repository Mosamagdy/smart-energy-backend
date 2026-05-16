/**
 * Front-end Socket.io Integration
 * Handles real-time notifications with sound alerts
 * 
 * Usage: Include this script in your HTML/React app
 */

// Configuration
const SOCKET_SERVER_URL = 'http://localhost:3000'; // Replace with your server URL
const SOUNDS_PATH = '/assets/sounds'; // Path to sound files
const USER_ID = getCurrentUserId(); // Get current logged-in user ID

let socket = null;
let unreadBadgeCount = 0;

/**
 * Initialize Socket.io connection
 */
function initializeSocket() {
  // Load Socket.io client library
  const script = document.createElement('script');
  script.src = `${SOCKET_SERVER_URL}/socket.io/socket.io.js`;
  script.onload = () => {
    connectToServer();
  };
  document.head.appendChild(script);
}

/**
 * Connect to Socket.io server
 */
function connectToServer() {
  socket = io(SOCKET_SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log('[Socket.io] Connected to server:', socket.id);
    
    // Join user's personal room
    socket.emit('join_user_room', USER_ID);
  });

  socket.on('room_joined', (data) => {
    console.log('[Socket.io] Joined room:', data);
  });

  // Listen for chat messages (message.mp3)
  socket.on('new_message', (notification) => {
    console.log('[New Message] Received:', notification);
    
    // Play message sound
    playSound(notification.sound || 'message.mp3');
    
    // Update badge count
    if (notification.badge_count) {
      updateBadgeCount(notification.badge_count);
    } else {
      incrementBadgeCount();
    }
    
    // Show desktop notification
    showDesktopNotification(notification.title, notification.message);
    
    // Trigger custom event for UI updates
    dispatchCustomEvent('chat-message-received', notification);
  });

  // Listen for system notifications (notify.mp3)
  socket.on('new_notification', (notification) => {
    console.log('[System Notification] Received:', notification);
    
    // Play notification sound
    playSound(notification.sound || 'notify.mp3');
    
    // Update badge count
    if (notification.badge_count) {
      updateBadgeCount(notification.badge_count);
    } else {
      incrementBadgeCount();
    }
    
    // Show desktop notification
    showDesktopNotification(notification.title, notification.message);
    
    // Trigger custom event for UI updates
    dispatchCustomEvent('system-notification-received', notification);
  });

  socket.on('disconnect', () => {
    console.warn('[Socket.io] Disconnected from server');
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket.io] Connection error:', error);
  });
}

/**
 * Play sound file
 * @param {string} filename - Sound file name (e.g., 'message.mp3')
 */
function playSound(filename) {
  const audioPath = `${SOUNDS_PATH}/${filename}`;
  
  // Create audio element
  const audio = new Audio(audioPath);
  
  // Handle loading errors
  audio.onerror = (error) => {
    console.error(`[Audio] Failed to load ${filename}:`, error);
    // Fallback: try default notification sound
    if (filename !== 'notify.mp3') {
      playSound('notify.mp3');
    }
  };
  
  // Play the sound
  audio.play().catch(error => {
    console.warn(`[Audio] Autoplay prevented for ${filename}:`, error);
    // Browser may require user interaction first
  });
  
  console.log(`[Audio] Playing: ${filename}`);
}

/**
 * Update badge count on UI
 * @param {number} count - New badge count
 */
function updateBadgeCount(count) {
  unreadBadgeCount = count;
  
  // Find and update all badge elements
  const badgeElements = document.querySelectorAll('.notification-badge, .badge-count, #unread-badge');
  
  badgeElements.forEach(element => {
    element.textContent = count;
    element.style.display = count > 0 ? 'inline-block' : 'none';
    
    // Add animation class
    if (count > 0) {
      element.classList.add('badge-pulse');
      setTimeout(() => element.classList.remove('badge-pulse'), 1000);
    }
  });
  
  // Update page title with count
  if (count > 0) {
    document.title = `(${count}) ${getBaseTitle()}`;
  } else {
    document.title = getBaseTitle();
  }
  
  console.log(`[Badge] Updated count: ${count}`);
}

/**
 * Increment badge count by 1
 */
function incrementBadgeCount() {
  updateBadgeCount(unreadBadgeCount + 1);
}

/**
 * Clear badge count (set to 0)
 */
function clearBadgeCount() {
  updateBadgeCount(0);
  
  // Reset document title
  document.title = getBaseTitle();
}

/**
 * Get base document title (without badge count)
 */
function getBaseTitle() {
  const title = document.title;
  const match = title.match(/^\(\d+\)\s+(.*)$/);
  return match ? match[1] : title;
}

/**
 * Show desktop notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 */
function showDesktopNotification(title, message) {
  // Check browser support
  if (!('Notification' in window)) {
    console.warn('[Notification] Desktop notifications not supported');
    return;
  }
  
  // Request permission if needed
  if (Notification.permission === 'granted') {
    createNotification(title, message);
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        createNotification(title, message);
      }
    });
  }
}

/**
 * Create desktop notification
 */
function createNotification(title, message) {
  const notification = new Notification(title, {
    body: message,
    icon: '/assets/icons/notification-icon.png', // Optional icon
    tag: 'smart-energy-erp', // Group notifications
    requireInteraction: false,
    silent: true // We handle sound separately
  });
  
  // Auto close after 5 seconds
  setTimeout(() => notification.close(), 5000);
  
  // Handle click
  notification.onclick = () => {
    window.focus();
    notification.close();
    
    // Navigate to notifications page or relevant section
    if (typeof window.navigateToNotifications === 'function') {
      window.navigateToNotifications();
    }
  };
}

/**
 * Dispatch custom event for other parts of the app to listen
 * @param {string} eventName - Custom event name
 * @param {object} data - Event data
 */
function dispatchCustomEvent(eventName, data) {
  const event = new CustomEvent(eventName, { detail: data });
  window.dispatchEvent(event);
}

/**
 * Mark all notifications as read
 * Call this when user opens notification panel
 */
function markAllAsRead() {
  clearBadgeCount();
  
  // Send API request to mark as read in database
  fetch('/api/notifications/mark-all-read', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  }).catch(error => {
    console.error('[API] Failed to mark notifications as read:', error);
  });
}

/**
 * Get current user ID from localStorage or session
 * Replace this with your actual auth logic
 */
function getCurrentUserId() {
  // Example: Get from JWT token
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || payload.userId;
    } catch (error) {
      console.error('[Auth] Failed to decode token:', error);
    }
  }
  
  // Fallback: Get from data attribute
  const userIdElement = document.querySelector('[data-user-id]');
  if (userIdElement) {
    return userIdElement.getAttribute('data-user-id');
  }
  
  console.warn('[Auth] No user ID found');
  return null;
}

/**
 * Disconnect from Socket.io
 * Call this on logout
 */
function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket.io] Disconnected');
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSocket);
} else {
  initializeSocket();
}

// Export functions for external use
window.SocketIO = {
  disconnect: disconnectSocket,
  markAllAsRead: markAllAsRead,
  clearBadgeCount: clearBadgeCount,
  playSound: playSound
};

console.log('[Socket.io] Front-end integration loaded');
