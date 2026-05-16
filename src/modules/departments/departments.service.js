const bcrypt = require('bcryptjs');
const { query } = require('../../db');
const repo     = require('./departments.repository');
const authRepo = require('../auth/auth.repository');

/**
 * Create department + dept head in a single transaction
 * If creating the head fails → department is rolled back
 */
async function createDepartmentWithHead({
  // Department fields
  name,
  description,
  icon,
  dept_type,
  // Head fields
  head_first_name,
  head_last_name,
  head_email,
  head_username,
  head_password,
  head_phone,
}, created_by) {

  // 1. Check department name not duplicate
  const existingDept = await repo.findDepartmentByName(name);
  if (existingDept) {
    const err = new Error('اسم الإدارة مستخدم بالفعل');
    err.statusCode = 409;
    throw err;
  }

  // 2. Check head email not duplicate
  const existingUser = await authRepo.findUserByEmail(head_email);
  if (existingUser) {
    const err = new Error('البريد الإلكتروني للمدير مستخدم بالفعل');
    err.statusCode = 409;
    throw err;
  }

  // 3. Get dept_head role
  const role = await authRepo.findRoleByName('dept_head');
  if (!role) {
    const err = new Error('دور مدير القسم غير موجود، يرجى تشغيل الـ seed أولاً');
    err.statusCode = 500;
    throw err;
  }

  // 4. Hash password
  const password_hash = await bcrypt.hash(head_password, 12);

  // 5. Run as transaction — dept + head together
  await query('BEGIN');

  try {
    // Create department
    const dept = await repo.createDepartment({ name, description, icon, dept_type, created_by });

    // Create dept head user linked to this department
    const head = await authRepo.createDeptHeadUser({
      first_name:    head_first_name,
      last_name:     head_last_name,
      email:         head_email,
      username:      head_username,
      password_hash,
      phone:         head_phone,
      department_id: dept.id,
      role_id:       role.id,
    });

    await query('COMMIT');

    return {
      department: dept,
      head: {
        id:         head.id,
        first_name: head.first_name,
        last_name:  head.last_name,
        email:      head.email,
        username:   head.username,
        phone:      head.phone,
      },
    };
  } catch (err) {
    await query('ROLLBACK');
    throw err;
  }
}

/**
 * Create department WITHOUT head - simpler version
 * Just name and optional description/icon
 * Head will be assigned later
 */
async function createDepartmentSimple({ name, description, icon, dept_type }, created_by) {
  // Check department name not duplicate
  const existingDept = await repo.findDepartmentByName(name);
  if (existingDept) {
    const err = new Error('اسم الإدارة مستخدم بالفعل');
    err.statusCode = 409;
    throw err;
  }

  // Create department directly
  const dept = await repo.createDepartment({ name, description, icon, dept_type, created_by });

  return dept;
}

/**
 * Get all departments
 */
async function getAllDepartments() {
  return repo.getAllDepartments();
}

/**
 * Get only technical departments (for lead assignment)
 */
async function getTechnicalDepartments() {
  return repo.getTechnicalDepartments();
}

/**
 * Get single department by id — 404 if not found
 */
async function getDepartmentById(id) {
  const dept = await repo.getDepartmentById(id);
  if (!dept) {
    const err = new Error('الإدارة غير موجودة');
    err.statusCode = 404;
    throw err;
  }
  return dept;
}

/**
 * Update department info
 */
async function updateDepartment(id, data) {
  // Check name not taken by another department
  if (data.name) {
    const existing = await repo.findDepartmentByName(data.name);
    if (existing && existing.id !== parseInt(id)) {
      const err = new Error('اسم الإدارة مستخدم بالفعل');
      err.statusCode = 409;
      throw err;
    }
  }

  const updated = await repo.updateDepartment(id, data);
  if (!updated) {
    const err = new Error('الإدارة غير موجودة');
    err.statusCode = 404;
    throw err;
  }
  return updated;
}

/**
 * Toggle department active status
 */
async function toggleActive(id, is_active) {
  const updated = await repo.toggleDepartmentActive(id, is_active);
  if (!updated) {
    const err = new Error('الإدارة غير موجودة');
    err.statusCode = 404;
    throw err;
  }
  return updated;
}

/**
 * Auto-toggle department active status (flips current status)
 */
async function toggleActiveAuto(id) {
  const dept = await repo.getDepartmentById(id);
  if (!dept) {
    const err = new Error('الإدارة غير موجودة');
    err.statusCode = 404;
    throw err;
  }
  const newStatus = !dept.is_active;
  const updated = await repo.toggleDepartmentActive(id, newStatus);
  return updated;
}

/**
 * Assign a manager to a department by creating a new user
 */
async function assignManager(departmentId, managerData, currentUser) {
  const { first_name, last_name, email, username, password, phone, role_id } = managerData;

  // 1. Check department exists
  const dept = await repo.getDepartmentById(departmentId);
  if (!dept) {
    const err = new Error('الإدارة غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  // 2. Check email not duplicate
  const existingUser = await authRepo.findUserByEmail(email);
  if (existingUser) {
    const err = new Error('البريد الإلكتروني مستخدم بالفعل');
    err.statusCode = 409;
    throw err;
  }

  // 3. Hash password
  const password_hash = await bcrypt.hash(password, 12);

  // 4. Create user with department_id and role_id using createDeptHeadUser
  // This function works for any role, not just dept_head
  const manager = await authRepo.createDeptHeadUser({
    first_name,
    last_name,
    email,
    username,
    password_hash,
    phone,
    department_id: parseInt(departmentId, 10),
    role_id: parseInt(role_id, 10)
  });

  return {
    id: manager.id,
    first_name: manager.first_name,
    last_name: manager.last_name,
    email: manager.email,
    username: manager.username,
    phone: manager.phone,
    role_id: manager.role_id,
    department_id: manager.department_id
  };
}

/**
 * Delete department — validates no employees are linked first
 */
async function deleteDepartment(id) {
  // Check department exists
  const dept = await repo.getDepartmentById(id);
  if (!dept) {
    const err = new Error('الإدارة غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  // Repository will check for employees and throw error if any exist
  const deleted = await repo.deleteDepartment(id);
  return deleted;
}

module.exports = {
  createDepartmentWithHead,
  createDepartmentSimple,
  getAllDepartments,
  getTechnicalDepartments,
  getDepartmentById,
  updateDepartment,
  toggleActive,
  toggleActiveAuto,
  assignManager,
  deleteDepartment,
};
