const express = require('express');
const router = express.Router();
const controller = require('./employees.controller');
const { authMiddleware } = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role');

router.use(authMiddleware);

const writeRoles = ['super_admin', 'finance_manager', 'hr_manager'];
const readRoles = ['super_admin', 'finance_manager', 'general_manager', 'hr_manager'];

// POST /api/employees
router.post('/',
  roleMiddleware(writeRoles),
  controller.createEmployee
);

// GET /api/employees
router.get('/',
  roleMiddleware(readRoles),
  controller.getAllEmployees
);

// GET /api/employees/:id
router.get('/:id',
  roleMiddleware(readRoles),
  controller.getEmployeeById
);

// PUT /api/employees/:id
router.put('/:id',
  roleMiddleware(writeRoles),
  controller.updateEmployee
);

module.exports = router;
