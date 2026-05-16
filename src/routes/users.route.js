const express = require('express');
const router = express.Router();
const authRepo = require('../modules/auth/auth.repository');
const roleMiddleware = require('../middlewares/role');
const { authMiddleware } = require('../middlewares/auth');

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * GET /api/users/by-role/:roleName
 * Get all users by role name (for assignment dropdowns)
 * Allowed: super_admin, general_manager, dept_head
 */
router.get('/by-role/:roleName',
  roleMiddleware(['super_admin', 'general_manager', 'sales_manager']),
  async (req, res, next) => {
    try {
      const { roleName } = req.params;
      
      // Validate role name
      const allowedRoles = ['sales_rep', 'engineer', 'sales_manager', 'quotation_specialist'];
      if (!allowedRoles.includes(roleName)) {
        const err = new Error('نوع الدور غير صالح');
        err.statusCode = 400;
        return next(err);
      }

      const users = await authRepo.getUsersByRole(roleName);
      
      res.status(200).json({
        status: 'success',
        data: { users }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/users/by-department/:deptId/role/:roleName
 * Get users by department AND role (for engineer assignment)
 * Allowed: super_admin, general_manager, dept_head, project_manager
 */
router.get('/by-department/:deptId/role/:roleName',
  roleMiddleware(['super_admin', 'general_manager', 'tech_head', 'project_manager']),
  async (req, res, next) => {
    try {
      const { deptId, roleName } = req.params;
      
      // Validate role name
      const allowedRoles = ['engineer', 'sales_rep', 'tech_head'];
      if (!allowedRoles.includes(roleName)) {
        const err = new Error('نوع الدور غير صالح');
        err.statusCode = 400;
        return next(err);
      }

      const users = await authRepo.getUsersByDeptAndRole(parseInt(deptId), roleName);
      
      res.status(200).json({
        status: 'success',
        data: { users }
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
