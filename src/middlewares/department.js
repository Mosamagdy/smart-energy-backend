/**
 * Department Middleware
 * - General Manager → full access to all departments (passes through)
 * - HR Manager → full access to all departments (passes through)  
 * - Dept Head → can only access their own department
 *
 * Checks department_id from:
 *   1. req.params.department_id  (route param  e.g. /departments/:department_id)
 *   2. req.body.department_id    (request body e.g. POST body)
 *   3. req.query.department_id   (query string e.g. ?department_id=3)
 *
 * Must be used AFTER authMiddleware
 *
 * Usage:
 *   router.get('/:department_id/dashboard', authMiddleware, departmentMiddleware, controller)
 */
function departmentMiddleware(req, res, next) {
  if (!req.user) {
    const err = new Error('غير مصرح — يرجى تسجيل الدخول أولاً');
    err.statusCode = 401;
    return next(err);
  }

  // General Manager and HR Manager have full access to all departments — skip department check
  if (['general_manager', 'hr_manager'].includes(req.user.role)) {
    console.log(`[DepartmentMiddleware] Allowing ${req.user.role} global access`);
    return next();
  }

  // Get department_id from params, body, or query
  const requestedDeptId =
    parseInt(req.params.department_id) ||
    parseInt(req.body.department_id)   ||
    parseInt(req.query.department_id);

  // If no department_id in request — allow (not a department-specific route)
  if (!requestedDeptId) {
    return next();
  }

  // Check dept head is accessing their own department only
  if (req.user.department_id !== requestedDeptId) {
    const err = new Error('ليس لديك صلاحية للوصول إلى هذا القسم');
    err.statusCode = 403;
    return next(err);
  }

  next();
}

module.exports = departmentMiddleware;
