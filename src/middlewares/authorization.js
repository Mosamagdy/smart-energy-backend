const { query } = require('../db');
const {
  canManageEmployee,
  canAccessLeaveRequest,
  canAccessEvaluation,
} = require('../utils/permissions');

/**
 * Authorization Guard - Read All Employees
 * Validates that user has permission to view all employees
 * 
 * For dept_head: filters by their department (unless HR dept_head)
 */
async function authorizeReadAllEmployees(req, res, next) {
  try {
    const user = req.user;
    const userRole = (user.role || user.role_name || '').toLowerCase();

    // Super admin and hr_manager can view all employees without restrictions
    if (['super_admin', 'hr_manager'].includes(userRole)) {
      return next();
    }

    // dept_head can view employees (will be filtered in service layer)
    if (userRole === 'dept_head') {
      return next();
    }

    // Other roles not authorized
    const err = new Error('ليس لديك صلاحية لعرض قائمة الموظفين');
    err.statusCode = 403;
    return next(err);
  } catch (error) {
    return next(error);
  }
}

/**
 * Authorization Guard - Read Employee by ID
 * Validates that user has permission to view a specific employee
 */
async function authorizeReadEmployee(req, res, next) {
  try {
    const user = req.user;
    const employeeId = req.params.id;

    if (!employeeId) {
      const err = new Error('معرف الموظف مطلوب');
      err.statusCode = 400;
      return next(err);
    }

    // Fetch employee's department
    const { rows } = await query(
      `SELECT id, department_id FROM employees WHERE id = $1 LIMIT 1`,
      [employeeId]
    );

    if (!rows[0]) {
      const err = new Error('الموظف غير موجود');
      err.statusCode = 404;
      return next(err);
    }

    const employee = rows[0];
    const canAccess = await canManageEmployee(user, employee);

    if (!canAccess) {
      const err = new Error('لا يوجد لديك صلاحية الوصول لهذا الموظف');
      err.statusCode = 403;
      return next(err);
    }

    req.authorizedEmployee = employee; // Cache for later use
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Authorization Guard - Update Employee
 * Validates that user has permission to update a specific employee
 */
async function authorizeUpdateEmployee(req, res, next) {
  try {
    const user = req.user;
    const employeeId = req.params.id;

    if (!employeeId) {
      const err = new Error('معرف الموظف مطلوب');
      err.statusCode = 400;
      return next(err);
    }

    // Fetch employee's department
    const { rows } = await query(
      `SELECT id, department_id FROM employees WHERE id = $1 LIMIT 1`,
      [employeeId]
    );

    if (!rows[0]) {
      const err = new Error('الموظف غير موجود');
      err.statusCode = 404;
      return next(err);
    }

    const employee = rows[0];
    const canUpdate = await canManageEmployee(user, employee);

    if (!canUpdate) {
      const err = new Error('لا يوجد لديك صلاحية تعديل بيانات هذا الموظف');
      err.statusCode = 403;
      return next(err);
    }

    req.authorizedEmployee = employee; // Cache for later use
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Authorization Guard - Leave Request Operations
 * Validates that user has permission to create/approve leave requests
 */
async function authorizeLeaveOperation(req, res, next) {
  try {
    const user = req.user;
    const userRole = (user.role || user.role_name || '').toLowerCase();

    // Super admin and hr_manager have global access
    if (['super_admin', 'hr_manager'].includes(userRole)) {
      return next();
    }

    // For POST /leaves - creating a leave request
    if (req.method === 'POST' || req.path.includes('/leaves') && !req.params.id) {
      const employeeId = req.body.employee_id;

      if (!employeeId) {
        const err = new Error('معرف الموظف مطلوب لإنشاء طلب الإجازة');
        err.statusCode = 400;
        return next(err);
      }

      // Fetch employee's department
      const { rows } = await query(
        `SELECT id, department_id FROM employees WHERE id = $1 LIMIT 1`,
        [employeeId]
      );

      if (!rows[0]) {
        const err = new Error('الموظف غير موجود');
        err.statusCode = 404;
        return next(err);
      }

      const canCreate = await canManageEmployee(user, rows[0]);

      if (!canCreate) {
        const err = new Error('لا يوجد لديك صلاحية إنشاء طلب إجازة لهذا الموظف');
        err.statusCode = 403;
        return next(err);
      }

      return next();
    }

    // For PATCH /leaves/:id/status - approving/rejecting a leave
    if (req.params.id) {
      const leaveId = req.params.id;

      // Fetch leave request with employee info
      const { rows } = await query(
        `SELECT lr.id, lr.employee_id, e.department_id 
         FROM leave_requests lr
         INNER JOIN employees e ON e.id = lr.employee_id
         WHERE lr.id = $1 LIMIT 1`,
        [leaveId]
      );

      if (!rows[0]) {
        const err = new Error('طلب الإجازة غير موجود');
        err.statusCode = 404;
        return next(err);
      }

      const canApprove = await canManageEmployee(user, { department_id: rows[0].department_id });

      if (!canApprove) {
        const err = new Error('لا يوجد لديك صلاحية الموافقة على هذه الإجازة');
        err.statusCode = 403;
        return next(err);
      }

      req.authorizedLeave = rows[0]; // Cache for later use
      return next();
    }

    // Default: allow if dept_head (for reading leaves in their department)
    if (userRole === 'dept_head') {
      return next();
    }

    const err = new Error('ليس لديك صلاحية للوصول إلى طلبات الإجازات');
    err.statusCode = 403;
    return next(err);
  } catch (error) {
    return next(error);
  }
}

/**
 * Authorization Guard - Evaluation Operations
 * Validates that user has permission to create/view evaluations
 */
async function authorizeEvaluationOperation(req, res, next) {
  try {
    const user = req.user;
    const userRole = (user.role || user.role_name || '').toLowerCase();

    // Super admin and hr_manager have global access
    if (['super_admin', 'hr_manager'].includes(userRole)) {
      return next();
    }

    // For POST /evaluations - creating an evaluation
    if (req.method === 'POST') {
      const employeeId = req.body.employee_id;

      if (!employeeId) {
        const err = new Error('معرف الموظف مطلوب لإنشاء التقييم');
        err.statusCode = 400;
        return next(err);
      }

      // Fetch employee's department
      const { rows } = await query(
        `SELECT id, department_id FROM employees WHERE id = $1 LIMIT 1`,
        [employeeId]
      );

      if (!rows[0]) {
        const err = new Error('الموظف غير موجود');
        err.statusCode = 404;
        return next(err);
      }

      const canCreate = await canManageEmployee(user, rows[0]);

      if (!canCreate) {
        const err = new Error('لا يوجد لديك صلاحية إنشاء تقييم لهذا الموظف');
        err.statusCode = 403;
        return next(err);
      }

      return next();
    }

    // For GET /evaluations/:employee_id - viewing evaluations
    if (req.params.employee_id) {
      const employeeId = req.params.employee_id;

      // Fetch employee's department
      const { rows } = await query(
        `SELECT id, department_id FROM employees WHERE id = $1 LIMIT 1`,
        [employeeId]
      );

      if (!rows[0]) {
        const err = new Error('الموظف غير موجود');
        err.statusCode = 404;
        return next(err);
      }

      const canView = await canManageEmployee(user, rows[0]);

      if (!canView) {
        const err = new Error('لا يوجد لديك صلاحية عرض تقييمات هذا الموظف');
        err.statusCode = 403;
        return next(err);
      }

      return next();
    }

    const err = new Error('ليس لديك صلاحية الوصول إلى التقييمات');
    err.statusCode = 403;
    return next(err);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  authorizeReadAllEmployees,
  authorizeReadEmployee,
  authorizeUpdateEmployee,
  authorizeLeaveOperation,
  authorizeEvaluationOperation,
};
