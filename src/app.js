const express      = require('express');
const morgan       = require('morgan');
const cors         = require('cors');
const path         = require('path');
const routes       = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const { initializeCronJobs } = require('./cron-jobs');
const config       = require('./config');

const app = express();

// Initialize background cron jobs
initializeCronJobs();

// ============================================================================
// SECURITY: CORS Configuration
// ============================================================================
// Only allow requests from Angular development server
// Prevents unauthorized cross-site requests (CSRF protection)
// ============================================================================
const allowedOrigins = [
  'http://localhost:4200',  // Angular dev server
  'http://127.0.0.1:4200',  // Alternative localhost
];

// In production, add your Angular deployment URL:
if (config.env === 'production') {
  allowedOrigins.push('https://your-angular-app.com'); // TODO: Update with production URL
}

app.use(cors({
  origin: true, // ✅ Allow all origins for local development debugging
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept-Language',
    'Cache-Control',
    'Pragma',
    'Expires',
    'Accept',
    'Origin',
    'X-Requested-With',
    'x-language'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Number', 'X-Page-Size'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  maxAge: 86400, // 24 hours cache for preflight requests
  optionsSuccessStatus: 200
}));

// Global middleware
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Serve uploaded files statically
// The uploads folder is at backend/uploads (one level up from src)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Debug: Log the uploads path
console.log('[Static Files] Serving uploads from:', path.join(__dirname, '..', 'uploads'));

// Routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Not Found' });
});

// Error handling
app.use(errorHandler);

module.exports = app;