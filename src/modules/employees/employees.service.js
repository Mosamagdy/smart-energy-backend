const { pool } = require('../../db');
const repo = require('./employees.repository');

// ============================================================================
// Employees Service - Business Logic Layer
// ============================================================================

const VALID_DEPARTMENTS = ['sales', 'design', 'operations', 'admin'];

async function createEmployee(data, currentUser) {
  const { first_name, last_name, department_id, basic_salary } = data;

  if (!first_name || !last_name || !department_id || basic_salary === undefined) {
    const err = new Error('جميع الحقول المطلوبة يجب تعبئتها: first_name, last_name, department_id, basic_salary');
    err.statusCode = 400;
    throw err;
  }

  const employeeNumber = await repo.generateEmployeeCode();

  const employee = await repo.createEmployee({
    ...data,
    employee_number: employeeNumber,
    created_by: currentUser.id
  });

  return employee;
}

async function getAllEmployees(filters = {}) {
  // Default to status='active' to fetch ALL active employees
  if (!filters.status) {
    filters.status = 'active';
  }
  return repo.getAllEmployees(filters);
}

async function getEmployeeById(id) {
  const employee = await repo.getEmployeeById(id);
  
  if (!employee) {
    const err = new Error('الموظف غير موجود');
    err.statusCode = 404;
    throw err;
  }

  return employee;
}

async function updateEmployee(id, data, currentUser) {
  const employee = await repo.updateEmployee(id, data);
  
  if (!employee) {
    const err = new Error('الموظف غير موجود');
    err.statusCode = 404;
    throw err;
  }

  return employee;
}

module.exports = {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  VALID_DEPARTMENTS
};
