const { pool, query } = require('../../db');

// ============================================================================
// Employees Repository - Data Access Layer
// ============================================================================

async function createEmployee(data, client = null) {
  const {
    employee_number, first_name, last_name, arabic_name, department_id, job_title,
    national_id, passport_number, nationality, contract_start_date,
    basic_salary, housing_allowance, transport_allowance, other_allowances,
    bank_account, bank_name, iban, created_by,
    passport_file_path, id_document_url, residence_file_path, contract_file_path,
    gosi_registered, currency, employment_type,
    personal_email, personal_phone, status,
    date_of_birth, gender, marital_status, religion, emergency_contact, emergency_phone,
    passport_expiry, national_id_expiry, residence_permit, residence_expiry,
    contract_end_date, probation_end_date
  } = data;

  const dbClient = client || require('../../db');
  const queryFn = client ? client.query.bind(client) : dbClient.query;

  const result = await queryFn(
    `INSERT INTO employees (
      employee_number, first_name, last_name, arabic_name, department_id, job_title,
      national_id, passport_number, nationality, contract_start_date,
      basic_salary, housing_allowance, transport_allowance, other_allowances,
      bank_account, bank_name, iban, created_by,
      passport_file_path, id_document_url, residence_file_path, contract_file_path,
      gosi_registered, currency, employment_type,
      personal_email, personal_phone, status,
      date_of_birth, gender, marital_status, religion, emergency_contact, emergency_phone,
      passport_expiry, national_id_expiry, residence_permit, residence_expiry,
      contract_end_date, probation_end_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42)
    RETURNING *`,
    [
      employee_number, first_name, last_name, arabic_name, department_id, job_title,
      national_id, passport_number, nationality, contract_start_date || null,
      basic_salary || 0, housing_allowance || 0, transport_allowance || 0, other_allowances || 0,
      bank_account || null, bank_name || null, iban || null, created_by,
      passport_file_path || null, id_document_url || null, residence_file_path || null, contract_file_path || null,
      gosi_registered || false, currency || 'SAR', employment_type || 'full_time',
      personal_email || null, personal_phone || null, status || 'active',
      date_of_birth || null, gender || null, marital_status || null, religion || null,
      emergency_contact || null, emergency_phone || null,
      passport_expiry || null, national_id_expiry || null, residence_permit || null, residence_expiry || null,
      contract_end_date || null, probation_end_date || null
    ]
  );

  return result.rows[0];
}

async function getEmployeeById(id) {
  const result = await query(
    `SELECT 
       e.*,
       u.first_name || ' ' || u.last_name AS created_by_name
     FROM employees e
     LEFT JOIN users u ON u.id = e.created_by
     WHERE e.id = $1 LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

async function getAllEmployees(filters = {}) {
  const { department, department_id, status } = filters;
  
  let whereClause = 'WHERE 1=1';
  const values = [];
  let paramCount = 1;

  if (department_id) {
    // Filter by department ID (integer)
    whereClause += ` AND e.department_id = $${paramCount}`;
    values.push(department_id);
    paramCount++;
  } else if (department) {
    // Filter by department name (string)
    whereClause += ` AND e.department = $${paramCount}`;
    values.push(department);
    paramCount++;
  }

  // Default to active employees only if no status filter provided
  if (status !== undefined) {
    whereClause += ` AND e.status = $${paramCount}`;
    values.push(status);
    paramCount++;
  } else {
    whereClause += ` AND e.status = 'active'`;
  }

  const result = await query(
    `SELECT e.*
     FROM employees e
     ${whereClause}
     ORDER BY e.first_name ASC`,
    values
  );

  return result.rows;
}

async function updateEmployee(id, data, client = null) {
  const allowedFields = [
    'first_name', 'last_name', 'arabic_name', 'department_id', 'job_title',
    'national_id', 'passport_number', 'nationality', 'contract_start_date', 'contract_end_date',
    'basic_salary', 'housing_allowance', 'transport_allowance', 'other_allowances',
    'bank_account', 'bank_name', 'iban', 'status',
    'passport_file_path', 'id_document_url', 'residence_file_path', 'contract_file_path',
    'gosi_registered', 'currency', 'employment_type',
    'personal_email', 'personal_phone', 'payroll_status'
  ];
  
  const keys = Object.keys(data).filter(key => allowedFields.includes(key));

  if (keys.length === 0) {
    return getEmployeeById(id);
  }

  const dbClient = client || require('../../db');
  const queryFn = client ? client.query.bind(client) : dbClient.query;

  const setClauses = [];
  const values = [];

  keys.forEach((key, index) => {
    setClauses.push(`${key} = $${index + 1}`);
    values.push(data[key]);
  });

  const setClause = setClauses.join(', ');
  const allValues = [...values, id];

  const sql = `UPDATE employees SET ${setClause}, updated_at = NOW() 
               WHERE id = $${keys.length + 1} RETURNING *`;

  const result = await queryFn(sql, allValues);
  return result.rows[0] || null;
}

async function generateEmployeeCode() {
  const result = await query(
    `SELECT 'EMP-' || LPAD((COUNT(*) + 1)::TEXT, 4, '0') as employee_number
     FROM employees`
  );
  
  return result.rows[0].employee_number;
}

async function getEmployeesByDepartment(department) {
  const result = await query(
    `SELECT * FROM employees
     WHERE department = $1 AND is_active = true
     ORDER BY full_name ASC`,
    [department]
  );

  return result.rows;
}

module.exports = {
  createEmployee,
  getEmployeeById,
  getAllEmployees,
  updateEmployee,
  generateEmployeeCode,
  getEmployeesByDepartment
};
