const express            = require('express');
const router             = express.Router();
const controller         = require('../modules/departments/departments.controller');
const employeeController = require('../modules/employees/employees.controller');
const { authMiddleware } = require('../middlewares/auth');
const roleMiddleware     = require('../middlewares/role');

const ADMIN_ROLES = ['super_admin', 'general_manager', 'hr_manager'];
const PROJECT_READ_ROLES = ['dep_pr_manager'];

// POST /api/departments — create dept + head (full workflow)
router.post('/',
  authMiddleware,
  roleMiddleware(ADMIN_ROLES),
  controller.createDepartment
);

// POST /api/departments/simple — create dept without head
router.post('/simple',
  authMiddleware,
  roleMiddleware(ADMIN_ROLES),
  controller.createDepartmentSimple
);

// GET /api/departments — all authenticated users
router.get('/',
  authMiddleware,
  // Allow HR managers to list departments (needed for employee creation flows)
  roleMiddleware([...ADMIN_ROLES, ...PROJECT_READ_ROLES]),
  controller.getAllDepartments
);

// GET /api/departments/technical — only technical departments (for leads)
router.get('/technical',
  authMiddleware,
  controller.getTechnicalDepartments
);

// GET /api/departments/:id
router.get('/:id',
  authMiddleware,
  controller.getDepartmentById
);

// GET /api/departments/:id/employees — employees in this department
router.get('/:id/employees',
  authMiddleware,
  employeeController.getAllEmployees
);

// PATCH /api/departments/:id — update info
router.patch('/:id',
  authMiddleware,
  roleMiddleware(ADMIN_ROLES),
  controller.updateDepartment
);

// PATCH /api/departments/:id/toggle — activate/deactivate
// ✅ FIX: added general_manager (was super_admin only → caused 403)
router.patch('/:id/toggle',
  authMiddleware,
  roleMiddleware(ADMIN_ROLES),
  controller.toggleDepartment
);

// POST /api/departments/:id/assign-manager
router.post('/:id/assign-manager',
  authMiddleware,
  roleMiddleware(ADMIN_ROLES),
  controller.assignManager
);

// DELETE /api/departments/:id
router.delete('/:id',
  authMiddleware,
  roleMiddleware(ADMIN_ROLES),
  controller.deleteDepartment
);

module.exports = router;