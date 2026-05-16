const express        = require('express');
const router         = express.Router();
const controller     = require('./leave.controller');
const { authMiddleware } = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role');

router.use(authMiddleware);

// ── All roles that can interact with leaves ───────────────────────────────────
const ALL_ROLES     = ['super_admin', 'hr_manager', 'general_manager', 'dept_head', 'engineer', 'sales_rep', 'employee'];
const MANAGER_ROLES = ['super_admin', 'hr_manager', 'general_manager'];
const REVIEW_ROLES  = ['super_admin', 'hr_manager', 'general_manager', 'dept_head'];

// ── Self routes (employee) ────────────────────────────────────────────────────

// IMPORTANT: static paths (/my, /my/balances) MUST come before dynamic ones (/:id)

/**
 * GET /api/leaves/my
 * Logged-in employee — their own leave requests
 */
router.get('/my',
  roleMiddleware(ALL_ROLES),
  controller.getMyLeaveRequests
);

/**
 * GET /api/leaves/my/balances
 * Logged-in employee — their own leave balances
 */
router.get('/my/balances',
  roleMiddleware(ALL_ROLES),
  controller.getMyLeaveBalances
);

/**
 * POST /api/leaves
 * Employee submits a new leave request
 */
router.post('/',
  roleMiddleware(ALL_ROLES),
  controller.createLeaveRequest
);

// ── Manager routes ────────────────────────────────────────────────────────────

/**
 * GET /api/leaves
 * All leave requests (HR/GM dashboard)
 * Optional query: ?status=pending
 */
router.get('/',
  roleMiddleware(MANAGER_ROLES),
  controller.getAllLeaveRequests
);

/**
 * GET /api/leaves/on-leave
 * Employees currently on leave (HR/GM)
 */
router.get('/on-leave',
  roleMiddleware(MANAGER_ROLES),
  controller.getEmployeesCurrentlyOnLeave
);

/**
 * GET /api/leaves/employee/:employee_id
 * Leave requests for a specific employee
 */
router.get('/employee/:employee_id',
  roleMiddleware(REVIEW_ROLES),
  controller.getLeaveRequestsByEmployee
);

/**
 * GET /api/leaves/balances/:employee_id
 * Leave balances for a specific employee
 */
router.get('/balances/:employee_id',
  roleMiddleware(REVIEW_ROLES),
  controller.getEmployeeLeaveBalances
);

/**
 * PATCH /api/leaves/:id/status
 * Approve or reject a leave request
 * Body: { status: 'approved' | 'rejected', rejection_reason?: string }
 */
router.patch('/:id/status',
  roleMiddleware(MANAGER_ROLES),
  controller.updateLeaveStatus
);

module.exports = router;