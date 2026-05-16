/**
 * hr.route.js
 * Handles: Employees, Attendance, Evaluations
 * Leaves routes have been moved to leave.route.js → mounted at /api/leaves
 */

const express              = require('express');
const router               = express.Router();
const controller           = require('../modules/hr/hr.controller');
const attendanceController = require('../modules/hr/attendance.controller');
const { authMiddleware }   = require('../middlewares/auth');
const roleMiddleware       = require('../middlewares/role');
const uploadEmployeeFiles  = require('../config/multer-employees');

router.use(authMiddleware);

// ── Employees ─────────────────────────────────────────────────────────────────

router.post('/employees',
  roleMiddleware(['super_admin', 'hr_manager', 'general_manager']),
  controller.createEmployee
);

router.get('/employees',
  // dep_pr_manager needs read access to populate Create Project flows (employees by department)
  roleMiddleware(['super_admin', 'hr_manager', 'general_manager', 'dept_head', 'employee', 'engineer', 'sales_rep', 'finance_manager', 'dep_pr_manager', 'tech_head']),
  controller.getAllEmployees
);

router.get('/employees/me',
  roleMiddleware(['super_admin', 'hr_manager', 'general_manager', 'dept_head', 'employee', 'engineer', 'sales_rep']),
  controller.getCurrentEmployee
);

// Static route BEFORE dynamic /:id
router.get('/employees/expiring-documents',
  roleMiddleware(['super_admin', 'hr_manager', 'general_manager']),
  controller.getExpiringDocuments
);

router.get('/employees/:id',
  roleMiddleware(['super_admin', 'hr_manager', 'general_manager', 'dept_head', 'employee']),
  controller.getEmployeeById
);

router.patch('/employees/:id',
  roleMiddleware(['super_admin', 'hr_manager', 'general_manager']),
  controller.updateEmployee
);

router.delete('/employees/:id',
  roleMiddleware(['super_admin', 'hr_manager', 'general_manager']),
  controller.deleteEmployee
);

router.post('/employees/:id/upload-files',
  roleMiddleware(['super_admin', 'hr_manager', 'general_manager']),
  uploadEmployeeFiles.fields([
    { name: 'passport_file' },
    { name: 'national_id_file' },
    { name: 'residence_file' },
    { name: 'contract_file' },
  ]),
  controller.uploadEmployeeFiles
);

// ── Attendance ────────────────────────────────────────────────────────────────

const attendanceSelfRoles = ['labor', 'technicians', 'technician', 'engineer', 'employee', 'sales_rep'];
const attendanceManagerRoles = ['super_admin', 'hr_manager',  'technician', 'engineer', 'employee', 'sales_rep'];

// Static routes BEFORE dynamic ones
router.get('/attendance/range',
  roleMiddleware(attendanceManagerRoles),
  attendanceController.getAttendanceRange
);

router.get('/attendance/today',
  roleMiddleware(attendanceManagerRoles),
  attendanceController.getDailyReport
);

router.get('/attendance/daily-report',
  roleMiddleware(attendanceManagerRoles),
  attendanceController.getDailyReport
);

router.post('/attendance/manual',
  roleMiddleware(attendanceManagerRoles),
  attendanceController.recordManualAttendance
);

router.patch('/attendance/notes/:employeeId',
  roleMiddleware(attendanceManagerRoles),
  attendanceController.updateAttendanceNotes
);

router.get('/attendance/employee/:employeeId/history',
  roleMiddleware([...attendanceManagerRoles, ...attendanceSelfRoles]),
  attendanceController.getEmployeeAttendanceHistory
);

router.get('/attendance/overtime/:employeeId',
  roleMiddleware(['super_admin', 'hr_manager', 'general_manager']),
  attendanceController.getMonthlyOvertimeReport
);

router.get('/attendance/status/:employeeId',
  roleMiddleware(attendanceManagerRoles),
  attendanceController.getStatus
);

router.post('/attendance/clock-in/:employeeId',
  // Only managers can clock-in/out for other employees
  roleMiddleware(attendanceManagerRoles),
  attendanceController.clockIn
);

router.post('/attendance/clock-out/:employeeId',
  // Only managers can clock-in/out for other employees
  roleMiddleware(attendanceManagerRoles),
  attendanceController.clockOut
);

// Routes for employees to access their own data (no employeeId in URL)
router.post('/attendance/clock-in',
  roleMiddleware(attendanceSelfRoles),
  attendanceController.clockIn
);

router.post('/attendance/clock-out',
  roleMiddleware(attendanceSelfRoles),
  attendanceController.clockOut
);

router.get('/attendance/status',
  roleMiddleware(attendanceSelfRoles),
  attendanceController.getStatus
);

// ── Evaluations ───────────────────────────────────────────────────────────────

router.get('/evaluations',
  roleMiddleware(['super_admin', 'general_manager']),
  controller.getAllEvaluations
);

router.post('/evaluations',
  roleMiddleware(['super_admin', 'hr_manager', 'general_manager', 'dept_head']),
  controller.createEvaluation
);

router.get('/evaluations/:employee_id',
  roleMiddleware(['super_admin', 'hr_manager', 'general_manager', 'dept_head']),
  controller.getEmployeeEvaluations
);

module.exports = router;