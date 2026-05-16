const { query } = require('../../db');

/**
 * Find user by email — includes role name
 */
async function findUserByEmail(email) {
  const result = await query(
    `SELECT u.*, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1
     LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Find user by id — includes password_hash for password update
 */
async function findUserWithPasswordById(id) {
  const result = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.username,
            u.phone, u.status, u.department_id, u.role_id,
            u.password_hash,
            r.name AS role_name,
            d.dept_type
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get all users by role name (for assignment dropdowns)
 */
async function getUsersByRole(roleName) {
  const result = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.department_id,
            r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = $1 AND u.status = 'active'
     ORDER BY u.first_name, u.last_name`,
    [roleName]
  );
  return result.rows;
}

/**
 * Get users by department AND role (for engineer assignment)
 */
async function getUsersByDeptAndRole(departmentId, roleName) {
  const result = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.department_id,
            r.name AS role_name,
            r.name AS job_title,
            NULL AS employee_number
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN employees e ON e.user_id = u.id
     WHERE u.department_id = $1 
       AND r.name = $2 
       AND u.status = 'active'
     ORDER BY u.first_name, u.last_name`,
    [departmentId, roleName]
  );
  return result.rows;
}

/**
 * Update user's password
 */
async function updateUserPassword(id, new_password_hash) {
  await query(
    `UPDATE users
     SET password_hash = $1,     -- 1. لازم فاصلة (comma) هنا عشان فيه عمود تاني هيتحدث
         is_first_login = FALSE  -- 2. شيل الفاصلة اللي كانت هنا (قبل WHERE)
     WHERE id = $2
     RETURNING id, email         -- 3. اتأكد إن الـ returning في سطر لوحدها (اختياري بس أنظف)
     `,
    [new_password_hash, id]
  );
}

/**
 * Find role by name
 */
async function findRoleByName(name) {
  const result = await query(
    `SELECT * FROM roles WHERE name = $1 LIMIT 1`,
    [name]
  );
  return result.rows[0] || null;
}

/**
 * Get all permission names for a role
 */
async function getUserPermissions(role_id) {
  const result = await query(
    `SELECT p.name
     FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role_id = $1`,
    [role_id]
  );
  return result.rows.map(r => r.name);
}

/**
 * Create a new dept head user
 */
async function createDeptHeadUser({ first_name, last_name, email, username, password_hash, phone, department_id, role_id }) {
  const result = await query(
    `INSERT INTO users
       (first_name, last_name, email, username, password_hash, phone, department_id, role_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, first_name, last_name, email, username, phone, department_id, role_id`,
    [first_name, last_name, email, username, password_hash, phone, department_id, role_id]
  );
  return result.rows[0];
}

/**
 * Create a new general manager user
 */
async function createGeneralManagerUser({ first_name, last_name, email, username, password_hash, phone, role_id }) {
  const result = await query(
    `INSERT INTO users
       (first_name, last_name, email, username, password_hash, phone, role_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, first_name, last_name, email, username, phone, role_id`,
    [first_name, last_name, email, username, password_hash, phone, role_id]
  );
  return result.rows[0];
}

/**
 * Create a new HR Manager user with global access
 */
async function createHrManagerUser({ first_name, last_name, email, username, password_hash, phone, department_id, role_id }) {
  const result = await query(
    `INSERT INTO users
       (first_name, last_name, email, username, password_hash, phone, department_id, role_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, first_name, last_name, email, username, phone, department_id, role_id`,
    [first_name, last_name, email, username, password_hash, phone, department_id, role_id]
  );
  return result.rows[0];
}

/**
 * Save OTP code to DB
 */
async function saveOtp(user_id, code, expires_at) {
  await query(
    `INSERT INTO otp_codes (user_id, code, expires_at)
     VALUES ($1, $2, $3)`,
    [user_id, code, expires_at]
  );
}

/**
 * Find a valid (unused + not expired) OTP for a user
 */
async function findValidOtp(user_id, code) {
  const result = await query(
    `SELECT * FROM otp_codes
     WHERE user_id = $1
       AND code = $2
       AND used = false
       AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1`,
    [user_id, code]
  );
  return result.rows[0] || null;
}

/**
 * Mark OTP as used
 */
async function markOtpUsed(otp_id) {
  await query(
    `UPDATE otp_codes SET used = true WHERE id = $1`,
    [otp_id]
  );
}

module.exports = {
  findUserByEmail,
  findUserWithPasswordById, // 👈 الجديد
  updateUserPassword,        // 👈 update الحقيقي
  findRoleByName,
  getUserPermissions,
  createDeptHeadUser,
  createGeneralManagerUser,
  createHrManagerUser,
  saveOtp,
  findValidOtp,
  markOtpUsed,
  getUsersByRole,            // 👈 NEW: For assignment dropdowns
  getUsersByDeptAndRole,     // 👈 NEW: For engineer assignment
};