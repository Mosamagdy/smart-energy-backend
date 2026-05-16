/**
 * hr.repository.js
 * Handles: Employees, Evaluations
 * Leaves queries have been moved to modules/leaves/leave.repository.js
 */

const { query } = require('../../db');

// ── Employees ─────────────────────────────────────────────────────────────────

async function createEmployee(data) {
  const {
    user_id, department_id, first_name, last_name, arabic_name,
    nationality, date_of_birth, gender, marital_status, religion,
    personal_email, personal_phone, emergency_contact, emergency_phone,
    passport_number, passport_expiry, passport_file_path,
    national_id, national_id_expiry, national_id_file_path,
    residence_permit, residence_expiry, residence_file_path,
    employee_number, job_title, employment_type,
    contract_start_date, contract_end_date, contract_file_path, probation_end_date,
    basic_salary, housing_allowance, transport_allowance, other_allowances,
    currency, bank_name, bank_account, iban, created_by,
  } = data;

  const result = await query(
    `INSERT INTO employees (
      user_id, department_id, first_name, last_name, arabic_name,
      nationality, date_of_birth, gender, marital_status, religion,
      personal_email, personal_phone, emergency_contact, emergency_phone,
      passport_number, passport_expiry, passport_file_path,
      national_id, national_id_expiry, national_id_file_path,
      residence_permit, residence_expiry, residence_file_path,
      employee_number, job_title, employment_type,
      contract_start_date, contract_end_date, contract_file_path, probation_end_date,
      basic_salary, housing_allowance, transport_allowance, other_allowances,
      currency, bank_name, bank_account, iban, created_by
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
      $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
      $31,$32,$33,$34,$35,$36,$37,$38,$39
    ) RETURNING *`,
    [
      user_id, department_id, first_name, last_name, arabic_name,
      nationality, date_of_birth, gender, marital_status, religion,
      personal_email, personal_phone, emergency_contact, emergency_phone,
      passport_number, passport_expiry, passport_file_path,
      national_id, national_id_expiry, national_id_file_path,
      residence_permit, residence_expiry, residence_file_path,
      employee_number, job_title, employment_type || 'full_time',
      contract_start_date, contract_end_date, contract_file_path, probation_end_date,
      basic_salary || 0, housing_allowance || 0, transport_allowance || 0, other_allowances || 0,
      currency || 'SAR', bank_name, bank_account, iban, created_by,
    ]
  );
  return result.rows[0];
}

async function getAllEmployees({ department_id, status } = {}) {
  const parsedDepartmentId =
    department_id === undefined || department_id === null || department_id === ''
      ? null
      : Number(department_id);

  if (parsedDepartmentId !== null && !Number.isInteger(parsedDepartmentId)) {
    const err = new Error('department_id يجب أن يكون رقمًا صحيحًا');
    err.statusCode = 400;
    throw err;
  }

  let sql = `
    SELECT e.*,
           u.first_name AS user_first_name,
           u.last_name  AS user_last_name,
           d.name       AS department_name,
           u.email      AS system_email,
           r.name       AS role_name
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN users u       ON u.id = e.user_id
    LEFT JOIN roles r       ON r.id = u.role_id
    WHERE ($1::INTEGER IS NULL OR e.department_id = $1)
  `;
  const params = [parsedDepartmentId];
  if (status) {
    params.push(status);
    sql += ` AND e.status = $${params.length}`;
  }
  sql += ` ORDER BY e.created_at DESC`;
  const result = await query(sql, params);
  return result.rows;
}

async function getEmployeeById(id) {
  const result = await query(
    `SELECT e.*,
            d.name  AS department_name,
            u.email AS system_email,
            u.first_name, u.last_name,
            r.name  AS role_name,
            creator.first_name || ' ' || creator.last_name AS created_by_name
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN users u       ON u.id = e.user_id
     LEFT JOIN roles r       ON r.id = u.role_id
     LEFT JOIN users creator ON creator.id = e.created_by
     WHERE e.id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

async function updateEmployee(id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return getEmployeeById(id);

  const cleanFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) cleanFields[key] = value;
  }

  const cleanKeys = Object.keys(cleanFields);
  if (cleanKeys.length === 0) return getEmployeeById(id);

  const setClauses = [];
  const values     = [];
  cleanKeys.forEach((key, index) => {
    setClauses.push(`"${key}" = $${index + 1}`);
    values.push(cleanFields[key]);
  });

  const sql = `
    UPDATE employees
    SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${cleanKeys.length + 1}
    RETURNING *
  `;

  const result = await query(sql, [...values, id]);
  return result.rows[0] || null;
}

async function deleteEmployee(id) {
  await query(`DELETE FROM employees WHERE id = $1`, [id]);
}

async function getExpiringDocuments(days = 30) {
  const result = await query(
    `SELECT e.id, e.first_name, e.last_name, e.employee_number,
            e.passport_number, e.passport_expiry,
            e.residence_permit, e.residence_expiry,
            e.contract_end_date,
            d.name AS department_name
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE e.status = 'active'
       AND (
         e.passport_expiry   BETWEEN now() AND now() + ($1 || ' days')::INTERVAL OR
         e.residence_expiry  BETWEEN now() AND now() + ($1 || ' days')::INTERVAL OR
         e.contract_end_date BETWEEN now() AND now() + ($1 || ' days')::INTERVAL
       )
     ORDER BY LEAST(e.passport_expiry, e.residence_expiry, e.contract_end_date)`,
    [days]
  );
  return result.rows;
}

async function updateFilePath(id, field, filePath) {
  const result = await query(
    `UPDATE employees SET ${field} = $1 WHERE id = $2 RETURNING id`,
    [filePath, id]
  );
  return result.rows[0] || null;
}

async function findUserByEmail(email, excludeUserId) {
  const result = await query(
    `SELECT id FROM users WHERE email = $1 AND id != $2 LIMIT 1`,
    [email, excludeUserId]
  );
  return result.rows[0] || null;
}

async function findUserByPhone(phone, excludeUserId) {
  const result = await query(
    `SELECT id FROM users WHERE phone = $1 AND id != $2 LIMIT 1`,
    [phone, excludeUserId]
  );
  return result.rows[0] || null;
}

async function updateUser(userId, data) {
  const keys = Object.keys(data);
  if (!keys.length) return null;

  const setClauses = [];
  const values     = [];
  keys.forEach((key, index) => {
    setClauses.push(`"${key}" = $${index + 1}`);
    values.push(data[key]);
  });

  const sql = `
    UPDATE users
    SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${keys.length + 1}
    RETURNING id, first_name, last_name, email, phone
  `;
  const result = await query(sql, [...values, userId]);
  return result.rows[0] || null;
}

// ── Evaluations ───────────────────────────────────────────────────────────────

async function createEvaluation({ employee_id, evaluator_id, evaluation_type, project_id, period, score, notes }) {
  const result = await query(
    `INSERT INTO employee_evaluations
       (employee_id, evaluator_id, evaluation_type, project_id, period, score, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [employee_id, evaluator_id, evaluation_type, project_id, period, score, notes]
  );
  return result.rows[0];
}

async function getEmployeeEvaluations(employee_id) {
  const result = await query(
    `SELECT ev.*,
            u.first_name AS evaluator_first,
            u.last_name  AS evaluator_last
     FROM employee_evaluations ev
     LEFT JOIN users u ON u.id = ev.evaluator_id
     WHERE ev.employee_id = $1
     ORDER BY ev.created_at DESC`,
    [employee_id]
  );
  return result.rows;
}

async function getAllEvaluations() {
  const result = await query(
    `SELECT ev.*,
            e.first_name AS emp_first, e.last_name AS emp_last, e.employee_number,
            d.name AS department_name,
            u.first_name AS evaluator_first, u.last_name AS evaluator_last
     FROM employee_evaluations ev
     JOIN  employees   e ON e.id  = ev.employee_id
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN users u ON u.id = ev.evaluator_id
     ORDER BY ev.created_at DESC`
  );
  return result.rows;
}

module.exports = {
  createEmployee, getAllEmployees, getEmployeeById,
  updateEmployee, deleteEmployee,
  getExpiringDocuments, updateFilePath,
  findUserByEmail, findUserByPhone, updateUser,
  createEvaluation, getEmployeeEvaluations, getAllEvaluations,
};