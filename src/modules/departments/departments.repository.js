const { query } = require('../../db');

/**
 * Create a new department
 */
async function createDepartment({ name, description, icon, dept_type, created_by }) {
  const result = await query(
    `INSERT INTO departments (name, description, icon, dept_type, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, description, icon, dept_type || 'administrative', created_by]
  );
  return result.rows[0];
}

/**
 * Get all active departments with their head info
 * Uses DISTINCT ON to prevent duplicates from LEFT JOIN
 */
async function getAllDepartments() {
  const result = await query(
    `SELECT DISTINCT ON (d.id)
       d.*,
       u.id         AS head_id,
       u.first_name AS head_first_name,
       u.last_name  AS head_last_name,
       u.email      AS head_email,
       u.phone      AS head_phone,
       r.name       AS head_role_name,
       r.description AS head_role_description
     FROM departments d
     LEFT JOIN users u ON u.department_id = d.id
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE (r.name LIKE '%manager%' OR r.name = 'dept_head' OR r.name = 'engineer'
        OR u.department_id IS NOT NULL)
        OR u.id IS NULL
     ORDER BY d.id, d.created_at DESC, 
       CASE 
         WHEN r.name = 'dept_head' THEN 1
         WHEN r.name LIKE '%manager%' THEN 2
         ELSE 3
       END,
       u.id ASC`
  );
  return result.rows;
}

/**
 * Get only technical departments (for lead assignment)
 */
async function getTechnicalDepartments() {
  const result = await query(
    `SELECT id, name, description, icon, dept_type
     FROM departments
     WHERE dept_type = 'technical' AND is_active = true
     ORDER BY name ASC`
  );
  return result.rows;
}

/**
 * Get single department by id
 */
async function getDepartmentById(id) {
  const result = await query(
    `SELECT
       d.*,
       u.id         AS head_id,
       u.first_name AS head_first_name,
       u.last_name  AS head_last_name,
       u.email      AS head_email,
       u.phone      AS head_phone
     FROM departments d
     LEFT JOIN users u ON u.department_id = d.id AND u.role_id = (
       SELECT id FROM roles WHERE name = 'dept_head' LIMIT 1
     )
     WHERE d.id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Check if department name already exists
 */
async function findDepartmentByName(name) {
  const result = await query(
    `SELECT id FROM departments WHERE name = $1 LIMIT 1`,
    [name]
  );
  return result.rows[0] || null;
}

/**
 * Update department fields
 */
async function updateDepartment(id, { name, description, icon }) {
  const result = await query(
    `UPDATE departments
     SET
       name        = COALESCE($1, name),
       description = COALESCE($2, description),
       icon        = COALESCE($3, icon)
     WHERE id = $4
     RETURNING *`,
    [name, description, icon, id]
  );
  return result.rows[0] || null;
}

/**
 * Toggle department active/inactive
 */
async function toggleDepartmentActive(id, is_active) {
  const result = await query(
    `UPDATE departments SET is_active = $1 WHERE id = $2 RETURNING *`,
    [is_active, id]
  );
  return result.rows[0] || null;
}

/**
 * Delete department (only if no employees are linked)
 */
async function deleteDepartment(id) {
  // First, check if department has any employees
  const employeeCheck = await query(
    `SELECT COUNT(*) as count FROM users WHERE department_id = $1`,
    [id]
  );
  
  const employeeCount = parseInt(employeeCheck.rows[0].count, 10);
  
  if (employeeCount > 0) {
    throw new Error(`لا يمكن حذف قسم يحتوي على موظفين، يرجى نقل الموظفين أولاً`);
  }
  
  // If no employees, proceed with deletion
  const result = await query(
    `DELETE FROM departments WHERE id = $1 RETURNING *`,
    [id]
  );
  
  return result.rows[0] || null;
}

module.exports = {
  createDepartment,
  getAllDepartments,
  getTechnicalDepartments,
  getDepartmentById,
  findDepartmentByName,
  updateDepartment,
  toggleDepartmentActive,
  deleteDepartment,
};
