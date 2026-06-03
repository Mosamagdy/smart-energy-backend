/**
 * Role Middleware
 * - Checks if req.user.role is in the allowed roles array
 * - Must be used AFTER authMiddleware
 * - Throws 403 if role not allowed
 *
 * Usage:
 *   router.post('/create-dept-head', authMiddleware, roleMiddleware(['general_manager']), controller)
 *   router.get('/reports',           authMiddleware, roleMiddleware(['general_manager', 'dept_head']), controller)
 */
function roleMiddleware(allowedRoles = []) {
  return function (req, res, next) {
    if (!req.user) {
      const err = new Error('غير مصرح — يرجى تسجيل الدخول أولاً');
      err.statusCode = 401;
      return next(err);
    }

    const tokenRole =
      req.user.role ??
      req.user.role_name ??
      req.user.roleName;

    const normalizedTokenRole = typeof tokenRole === 'string' ? tokenRole.toLowerCase() : tokenRole;
    const normalizedAllowedRoles = allowedRoles.map(r =>
      typeof r === 'string' ? r.toLowerCase() : r
    );

    if (!normalizedAllowedRoles.includes(normalizedTokenRole)) {
      const err = new Error('ليس لديك صلاحية للوصول إلى هذا المورد');
      err.statusCode = 403;
      return next(err);
    }

    next();
  };
}

module.exports = roleMiddleware;
