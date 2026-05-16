const jwt = require('jsonwebtoken');
const config = require('../config');
const { query } = require('../db');

/**
 * Auth Middleware
 * - Extracts Bearer token from Authorization header
 * - Verifies JWT using JWT_SECRET from config
 * - Attaches decoded payload to req.user
 * - Throws 401 if missing or invalid
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];


  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[AuthMiddleware] ❌ No Bearer token found');
    const err = new Error('لم يتم تقديم توكن المصادقة');
    err.statusCode = 401;
    return next(err);
  }

  const token = authHeader.split(' ')[1];
  console.log('[AuthMiddleware] Token length:', token?.length);

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    

    
    next();
  } catch (error) {
    console.error('[AuthMiddleware] ❌ Token verification failed:', error.message);
    console.error('[AuthMiddleware] JWT Secret used:', config.jwt.secret?.substring(0, 10) + '...');
    const err = new Error('توكن غير صالح أو منتهي الصلاحية');
    err.statusCode = 401;
    next(err);
  }
}

/**
 * Check First Login Middleware (for clients)
 * - If user is client and is_first_login = true
 * - Only allow access to /api/auth/update-password
 * - Block all other endpoints
 */
async function checkFirstLogin(req, res, next) {
  // Skip for non-client roles
  if (req.user.role !== 'client') {
    return next();
  }
  
  // Allow password update endpoint
  if (req.path === '/api/auth/update-password' && req.method === 'POST') {
    return next();
  }
  
  // Check if first login
  const { rows } = await query(
    `SELECT is_first_login FROM users WHERE id = $1`,
    [req.user.id]
  );
  
  if (rows && rows.length > 0 && rows[0].is_first_login === true) {
    const err = new Error('يجب تغيير كلمة المرور أولاً قبل استخدام البوابة');
    err.statusCode = 403;
    err.code = 'FIRST_LOGIN_REQUIRED';
    return next(err);
  }
  
  next();
}

module.exports = { authMiddleware, checkFirstLogin };
