const { pool, query } = require('../../db');

// ============================================================================
// Payroll Repository - Data Access Layer
// ============================================================================

async function createPayrollRun(data, client) {
  const queryFn = client.query.bind(client);
  const result = await queryFn(
    `INSERT INTO payroll_runs (
      run_number, payroll_month, payroll_year, department,
      total_basic, total_allowances, total_deductions, total_net,
      created_by, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [data.run_number, data.payroll_month, data.payroll_year, data.department,
     data.total_basic, data.total_allowances, data.total_deductions, data.total_net,
     data.created_by, data.notes]
  );
  return result.rows[0];
}

async function getPayrollRunById(id) {
  const result = await query(
    `SELECT 
       pr.*,
       u1.first_name || ' ' || u1.last_name AS created_by_name,
       u2.first_name || ' ' || u2.last_name AS approved_by_name
     FROM payroll_runs pr
     LEFT JOIN users u1 ON u1.id = pr.created_by
     LEFT JOIN users u2 ON u2.id = pr.approved_by
     WHERE pr.id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

async function getAllPayrollRuns(filters = {}) {
  const { payroll_year, payroll_month, department, status } = filters;
  let whereClause = 'WHERE 1=1';
  const values = [];
  let paramCount = 1;

  if (payroll_year) {
    whereClause += ` AND pr.payroll_year = $${paramCount}`;
    values.push(payroll_year);
    paramCount++;
  }
  if (payroll_month) {
    whereClause += ` AND pr.payroll_month = $${paramCount}`;
    values.push(payroll_month);
    paramCount++;
  }
  if (department) {
    whereClause += ` AND pr.department = $${paramCount}`;
    values.push(department);
    paramCount++;
  }
  if (status) {
    whereClause += ` AND pr.status = $${paramCount}`;
    values.push(status);
    paramCount++;
  }

  const result = await query(
    `SELECT 
       pr.*,
       u1.first_name || ' ' || u1.last_name AS created_by_name
     FROM payroll_runs pr
     LEFT JOIN users u1 ON u1.id = pr.created_by
     ${whereClause}
     ORDER BY pr.payroll_year DESC, pr.payroll_month DESC`,
    values
  );
  return result.rows;
}

async function createPayrollLines(lines, client) {
  const queryFn = client.query.bind(client);
  for (const line of lines) {
    await queryFn(
      `INSERT INTO payroll_lines (
        payroll_run_id, employee_id, basic_salary, housing_allowance,
        transport_allowance, other_allowances, overtime_amount, deductions,
        gosi_employee, gosi_employer, net_salary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        line.payroll_run_id, line.employee_id, line.basic_salary, line.housing_allowance,
        line.transport_allowance, line.other_allowances, line.overtime_amount, line.deductions,
        line.gosi_employee, line.gosi_employer, line.net_salary
      ]
    );
  }
}

async function getPayrollLines(payrollRunId) {
  const result = await query(
    `SELECT 
       pl.*,
       e.employee_code,
       e.full_name,
       e.full_name_ar,
       e.department,
       e.nationality
     FROM payroll_lines pl
     JOIN employees e ON e.id = pl.employee_id
     WHERE pl.payroll_run_id = $1
     ORDER BY e.full_name`,
    [payrollRunId]
  );
  return result.rows;
}

async function updatePayrollRunStatus(id, status, journalEntryId, client) {
  const queryFn = client.query.bind(client);
  const result = await queryFn(
    `UPDATE payroll_runs 
     SET status = $1, journal_entry_id = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [status, journalEntryId, id]
  );
  return result.rows[0];
}

async function generatePayrollRunNumber(month, year) {
  return `PAY-${year}-${String(month).padStart(2, '0')}`;
}

async function getEndOfServiceHistory(employeeId) {
  const result = await query(
    `SELECT 
       eos.*,
       e.employee_code,
       e.full_name,
       u.first_name || ' ' || u.last_name AS created_by_name
     FROM end_of_service eos
     JOIN employees e ON e.id = eos.employee_id
     LEFT JOIN users u ON u.id = eos.created_by
     WHERE eos.employee_id = $1
     ORDER BY eos.termination_date DESC`,
    [employeeId]
  );
  return result.rows;
}

async function createEndOfService(data, client) {
  const queryFn = client.query.bind(client);
  const result = await queryFn(
    `INSERT INTO end_of_service (
      employee_id, termination_date, termination_reason, years_of_service,
      entitlement_amount, paid_amount, status, created_by, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [data.employee_id, data.termination_date, data.termination_reason, data.years_of_service,
     data.entitlement_amount, data.paid_amount || 0, data.status || 'pending', data.created_by, data.notes]
  );
  return result.rows[0];
}

module.exports = {
  createPayrollRun,
  getPayrollRunById,
  getAllPayrollRuns,
  createPayrollLines,
  getPayrollLines,
  updatePayrollRunStatus,
  generatePayrollRunNumber,
  getEndOfServiceHistory,
  createEndOfService
};
