const express        = require('express');
const router         = express.Router();
const controller     = require('../modules/auth/auth.controller');
const { authMiddleware } = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');

// ─── Public Routes ───────────────────────────────────────────────────────────

// POST /api/auth/login
router.post('/login', controller.login);

// POST /api/auth/verify-otp
router.post('/verify-otp', controller.verifyOtp);

// ─── Protected Routes ────────────────────────────────────────────────────────

// GET /api/auth/me
router.get('/me', authMiddleware, controller.getMe);



// POST /api/auth/create-general-manager — super_admin only
router.post(
  '/create-general-manager',
  authMiddleware,
  roleMiddleware(['super_admin']),
  controller.createGeneralManager
);


// POST /api/auth/create-dept-head
router.post(
  '/create-dept-head',
  authMiddleware,
  roleMiddleware(['super_admin', 'general_manager']),
  controller.createDeptHead
);

// POST /api/auth/create-hr-manager — general_manager only
// HR Manager gets GLOBAL ACCESS to all departments
router.post(
  '/create-hr-manager',
  authMiddleware,
  roleMiddleware(['general_manager']),
  controller.createHrManager
);

/**
 * @route   POST /api/auth/update-password
 * @desc    Update password for authenticated user
 * @access  Private (All authenticated users)
 */
router.post('/update-password',
  authMiddleware,
  controller.updateUserPassword
);


module.exports = router;
