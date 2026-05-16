const app = require('./app');
const config = require('./config');
const { initializeSocketIO } = require('./services/socket.service');

// Create HTTP server
const server = app.listen(config.port, () => {
  console.log(`Smart Energy ERP backend running in ${config.env} mode on port ${config.port}`);
  
  // Initialize Socket.io after server starts
  initializeSocketIO(server);
  console.log('[Socket.io] Real-time notification system ready\n');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  server.close(() => process.exit(1));
});

module.exports = server;
