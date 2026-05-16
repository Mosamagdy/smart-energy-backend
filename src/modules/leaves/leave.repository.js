const { query } = require('../../db');

// ── Leave Requests ────────────────────────────────────────────────────────────

async function createLeaveRequest({ employee_id, leave_type, start_date, end_date, days_count, reason, document_url, status = 'pending' }) {
  const result = await query(
    `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, days_count, reason, document_url, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [employee_id, leave_type, start_date, end_date, days_count, reason, document_url, status]
  );
  return result.rows[0];
}

async function getLeaveRequestById(id) {
  const result = await query(
    `SELECT lr.*,
            e.first_name, e.last_name, e.employee_number, e.user_id AS employee_user_id,
            e.department_id,
            d.name AS department_name,
            u.first_name AS approver_first_name,
            u.last_name  AS approver_last_name,
            CASE
              WHEN lr.status = 'pending'             THEN 'قيد الانتظار'
              WHEN lr.status = 'approved'            THEN 'موافق نهائياً'
              WHEN lr.status = 'rejected'            THEN 'مرفوض'
              ELSE lr.status
            END AS status_arabic
     FROM leave_requests lr
     JOIN employees   e ON e.id = lr.employee_id
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN users  u ON u.id = lr.approved_by
     WHERE lr.id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

async function getLeaveRequestsByEmployee(employee_id) {
  const result = await query(
    `SELECT lr.*,
            e.first_name, e.last_name,
            u.first_name AS approver_first_name,
            u.last_name  AS approver_last_name,
            CASE
              WHEN lr.status = 'pending'  THEN 'قيد الانتظار'
              WHEN lr.status = 'approved' THEN 'موافق نهائياً'
              WHEN lr.status = 'rejected' THEN 'مرفوض'
              ELSE lr.status
            END AS status_arabic
     FROM leave_requests lr
     JOIN employees e ON e.id = lr.employee_id
     LEFT JOIN users u ON u.id = lr.approved_by
     WHERE lr.employee_id = $1
     ORDER BY lr.created_at DESC`,
    [employee_id]
  );
  return result.rows;
}

/**
 * Get all pending leave requests (for hr_manager / general_manager dashboard)
 */
async function getAllLeaveRequests({ status } = {}) {
  let sql = `
    SELECT lr.*,
           e.first_name, e.last_name, e.employee_number,
           d.name AS department_name,
           u.first_name AS approver_first_name,
           u.last_name  AS approver_last_name,
           CASE
             WHEN lr.status = 'pending'  THEN 'قيد الانتظار'
             WHEN lr.status = 'approved' THEN 'موافق نهائياً'
             WHEN lr.status = 'rejected' THEN 'مرفوض'
             ELSE lr.status
           END AS status_arabic
    FROM leave_requests lr
    JOIN employees   e ON e.id = lr.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN users  u ON u.id = lr.approved_by
  `;
  const params = [];
  if (status) {
    params.push(status);
    sql += ` WHERE lr.status = $1`;
  }
  sql += ` ORDER BY lr.created_at DESC`;
  const result = await query(sql, params);
  return result.rows;
}

async function updateLeaveStatus(id, { status, approved_by, rejection_reason }) {
  const result = await query(
    `UPDATE leave_requests
     SET status           = $1::text,
         approved_by      = $2,
         approved_at      = CASE WHEN $1::text = 'approved' THEN now() ELSE NULL END,
         rejection_reason = $3
     WHERE id = $4 RETURNING *`,
    [status, approved_by, rejection_reason, id]
  );
  return result.rows[0] || null;
}

// ── Leave Balances ────────────────────────────────────────────────────────────

async function getEmployeeLeaveBalance(employee_id, leave_type) {
  const result = await query(
    `SELECT * FROM employee_leave_balances
     WHERE employee_id = $1 AND leave_type = $2 LIMIT 1`,
    [employee_id, leave_type]
  );
  return result.rows[0] || null;
}

async function getAllEmployeeLeaveBalances(employee_id) {
  const result = await query(
    `SELECT * FROM employee_leave_balances
     WHERE employee_id = $1 ORDER BY leave_type`,
    [employee_id]
  );
  return result.rows;
}

async function createOrUpdateLeaveBalance(employee_id, leave_type, total_allowed = 21) {
  const result = await query(
    `INSERT INTO employee_leave_balances (employee_id, leave_type, total_allowed, used, remaining)
     VALUES ($1, $2, $3, 0, $3)
     ON CONFLICT (employee_id, leave_type)
     DO UPDATE SET updated_at = now()
     RETURNING *`,
    [employee_id, leave_type, total_allowed]
  );
  return result.rows[0];
}

async function deductLeaveBalance(employee_id, leave_type, days) {
  const result = await query(
    `UPDATE employee_leave_balances
     SET used      = used + $1,
         remaining = remaining - $1,
         updated_at = now()
     WHERE employee_id = $2 AND leave_type = $3
     RETURNING *`,
    [days, employee_id, leave_type]
  );
  return result.rows[0] || null;
}

async function checkOverlappingLeave(employee_id, start_date, end_date, exclude_request_id = null) {
  let sql = `
    SELECT id FROM leave_requests
    WHERE employee_id = $1
      AND status IN ('pending', 'approved')
      AND (start_date <= $3 AND end_date >= $2)
  `;
  const params = [employee_id, start_date, end_date];
  if (exclude_request_id) {
    sql += ` AND id != $4`;
    params.push(exclude_request_id);
  }
  const result = await query(sql, params);
  return result.rows.length > 0;
}

/**
 * Employees currently on leave (approved + date range contains today)
 */
async function getEmployeesCurrentlyOnLeave(todayIsoDate) {
  const result = await query(
    `SELECT
        lr.id AS leave_request_id,
        lr.employee_id,
        lr.leave_type,
        lr.start_date,
        lr.end_date,
        lr.days_count,
        lr.status,
        e.first_name,
        e.last_name,
        e.employee_number,
        e.department_id,
        d.name AS department_name
     FROM leave_requests lr
     JOIN employees e ON e.id = lr.employee_id
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE lr.status = 'approved'
       AND lr.start_date <= $1::date
       AND lr.end_date   >= $1::date
     ORDER BY lr.end_date ASC, e.first_name ASC`,
    [todayIsoDate]
  );
  return result.rows;
}

// ── Employee helpers (needed inside leave logic) ──────────────────────────────

async function getEmployeeByUserId(user_id) {
  const result = await query(
    `SELECT e.*, d.name AS department_name
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE e.user_id = $1 LIMIT 1`,
    [user_id]
  );
  return result.rows[0] || null;
}

async function getEmployeeById(id) {
  const result = await query(
    `SELECT e.*, d.name AS department_name
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE e.id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  createLeaveRequest,
  getLeaveRequestById,
  getLeaveRequestsByEmployee,
  getAllLeaveRequests,
  updateLeaveStatus,
  getEmployeeLeaveBalance,
  getAllEmployeeLeaveBalances,
  createOrUpdateLeaveBalance,
  deductLeaveBalance,
  checkOverlappingLeave,
  getEmployeesCurrentlyOnLeave,
  getEmployeeByUserId,
  getEmployeeById,
};