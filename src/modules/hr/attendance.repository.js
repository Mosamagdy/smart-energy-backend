const { query } = require('../../db');

/**
 * Clock In - Creates an open time_log session
 */
async function clockIn(employeeId, clockInTime, ip, location) {
  const actualClockInTime = clockInTime || new Date().toISOString();
  const result = await query(
    `INSERT INTO time_logs (employee_id, clock_in, clock_in_ip, clock_in_location, status, device_type)
     VALUES ($1, $2, $3, $4, 'open', 'web')
     RETURNING *`,
    [employeeId, actualClockInTime, ip, location]
  );
  return result.rows[0];
}

/**
 * Clock Out - Closes the open time_log session
 * ✅ FIX: استبدلنا string interpolation بـ parameterized queries (SQL Injection كان خطر)
 */
async function clockOut(employeeId, clockOutTime, ip, location) {
  const actualClockOutTime = clockOutTime || new Date().toISOString();

  // ✅ FIX: كان `WHERE employee_id = ${employeeId}` — خطر SQL Injection
  const openSession = await query(
    `SELECT * FROM time_logs
     WHERE employee_id = $1 AND status = 'open'
     ORDER BY clock_in DESC LIMIT 1`,
    [employeeId]
  );

  if (!openSession.rows[0]) {
    return null;
  }

  const session = openSession.rows[0];

  // Calculate work hours
  const clockInTime = new Date(session.clock_in);
  const clockOutDate = new Date(actualClockOutTime);
  const diffMs = clockOutDate - clockInTime;
  const workHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));

  // ✅ FIX: كان string interpolation — استبدلناه بـ parameterized query
  const result = await query(
    `UPDATE time_logs
     SET clock_out = $1,
         status = 'closed',
         session_hours = $2
     WHERE id = $3
     RETURNING *`,
    [actualClockOutTime, workHours, session.id]
  );

  return result.rows[0];
}

/**
 * Get time logs for an employee within a date range
 */
async function getTimeLogs(employeeId, startDate, endDate) {
  const result = await query(
    `SELECT tl.*, 
            e.first_name, e.last_name, e.employee_number,
            d.name as department_name
     FROM time_logs tl
     JOIN employees e ON e.id = tl.employee_id
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE tl.employee_id = $1
       AND tl.clock_in >= $2::DATE
       AND tl.clock_in < ($3::DATE + INTERVAL '1 day')
     ORDER BY tl.clock_in DESC`,
    [employeeId, startDate, endDate]
  );
  return result.rows;
}

/**
 * Get time log by ID
 */
async function getTimeLogById(id) {
  const result = await query(
    `SELECT tl.*,
            e.first_name, e.last_name, e.employee_number,
            d.name as department_name
     FROM time_logs tl
     JOIN employees e ON e.id = tl.employee_id
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE tl.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get today's attendance summary for all employees
 */
async function getTodayAttendance(departmentId) {
  let sql = `
    SELECT DISTINCT 
      e.id as employee_id,
      e.first_name as employee_first_name, 
      e.last_name as employee_last_name, 
      e.employee_number,
      e.department_id, 
      e.job_title,
      e.status as employee_status,
      d.name as department_name,
      COALESCE(a.status, 'absent') as status,
      COALESCE(a.actual_hours, 0) as actual_hours,
      COALESCE(a.overtime_hours, 0) as overtime_hours,
      COALESCE(a.late_minutes, 0) as late_minutes,
      a.expected_hours,
      a.id as attendance_id,
      a.attendance_date,
      a.notes,
      (SELECT clock_in FROM time_logs tl 
       WHERE tl.employee_id = e.id 
       AND tl.clock_in::DATE = CURRENT_DATE 
       ORDER BY tl.clock_in ASC LIMIT 1) as clock_in_time,
      (SELECT clock_out FROM time_logs tl 
       WHERE tl.employee_id = e.id 
       AND tl.clock_in::DATE = CURRENT_DATE 
       ORDER BY tl.clock_out DESC NULLS LAST LIMIT 1) as clock_out_time
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date = CURRENT_DATE
    WHERE e.status = 'active'
  `;
  const params = [];

  if (departmentId) {
    params.push(departmentId);
    sql += ` AND e.department_id = $${params.length}`;
  }

  sql += ` ORDER BY e.first_name, e.last_name`;

  const result = await query(sql, params);

  console.log('[Attendance Repo] getTodayAttendance returned:', result.rows.length, 'unique employees for today');
  console.log('[Attendance Repo] Filtered by department_id:', departmentId);

  return result.rows;
}

/**
 * Get attendance for date range with employee details.
 */
async function getAttendanceRange(startDate, endDate, departmentId, employeeId) {
  let sql = `
    WITH date_series AS (
      SELECT generate_series($1::DATE, $2::DATE, '1 day'::INTERVAL)::DATE AS attendance_date
    ),
    active_employees AS (
      SELECT e.id, e.first_name, e.last_name, e.employee_number,
             e.department_id, e.job_title, d.name AS department_name
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.status = 'active'
  `;

  const params = [startDate, endDate];

  if (departmentId) {
    params.push(departmentId);
    sql += ` AND e.department_id = $${params.length}`;
  }

  if (employeeId) {
    params.push(employeeId);
    sql += ` AND e.id = $${params.length}`;
  }

  sql += `
    )
    SELECT 
      ds.attendance_date,
      ae.id AS employee_id,
      ae.first_name AS employee_first_name,
      ae.last_name AS employee_last_name,
      ae.employee_number,
      ae.department_id,
      ae.job_title,
      ae.department_name,
      COALESCE(a.status, 'absent') AS status,
      COALESCE(a.actual_hours, 0) AS actual_hours,
      COALESCE(a.overtime_hours, 0) AS overtime_hours,
      COALESCE(a.late_minutes, 0) AS late_minutes,
      a.expected_hours,
      a.id AS attendance_id,
      (SELECT tl.clock_in FROM time_logs tl 
       WHERE tl.employee_id = ae.id 
       AND tl.clock_in::DATE = ds.attendance_date 
       ORDER BY tl.clock_in ASC LIMIT 1) AS clock_in_time,
      (SELECT tl.clock_out FROM time_logs tl 
       WHERE tl.employee_id = ae.id 
       AND tl.clock_in::DATE = ds.attendance_date 
       ORDER BY tl.clock_out DESC NULLS LAST LIMIT 1) AS clock_out_time
    FROM date_series ds
    CROSS JOIN active_employees ae
    LEFT JOIN attendance a ON a.employee_id = ae.id AND a.attendance_date = ds.attendance_date
    ORDER BY ds.attendance_date DESC, ae.id
  `;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get or create daily attendance record
 */
async function getOrCreateDailyAttendance(employeeId, date, departmentId) {
  let result = await query(
    `SELECT * FROM attendance WHERE employee_id = $1 AND attendance_date = $2`,
    [employeeId, date]
  );

  if (result.rows[0]) {
    return result.rows[0];
  }

  result = await query(
    `INSERT INTO attendance (employee_id, attendance_date, department_id, status)
     VALUES ($1, $2, $3, 'present')
     ON CONFLICT (employee_id, attendance_date) DO NOTHING
     RETURNING *`,
    [employeeId, date, departmentId]
  );

  if (result.rows[0]) {
    return result.rows[0];
  }

  result = await query(
    `SELECT * FROM attendance WHERE employee_id = $1 AND attendance_date = $2`,
    [employeeId, date]
  );

  return result.rows[0] || null;
}

/**
 * Update daily attendance after clock out
 * ✅ FIX: أضفنا ::numeric cast على $3 و $4 عشان PostgreSQL كان بيـ conflict بين integer و numeric
 */
async function updateDailyAttendance(employeeId, date) {
  const result = await query(
    `SELECT COALESCE(SUM(session_hours), 0) as total_hours,
            COUNT(*) as sessions
     FROM time_logs
     WHERE employee_id = $1 AND DATE(clock_in) = DATE($2)`,
    [employeeId, date]
  );

  const { total_hours, sessions } = result.rows[0];

  if (Number(sessions) === 0) {
    return null;
  }

  const expectedHours = 8.00;
  const actualHours = Number(total_hours) || 0;
  const overtimeHours = Math.max(0, actualHours - expectedHours);

  // ✅ FIX: أضفنا ::numeric cast — كان بيطلع error "inconsistent types deduced for parameter $3"
  //         لأن PostgreSQL شايف $3 في SET (numeric) وفي CASE WHEN (integer) فبيـ conflict
  const updateResult = await query(
    `UPDATE attendance
     SET actual_hours = $3::numeric,
         overtime_hours = $4::numeric,
         status = CASE 
           WHEN $3::numeric >= 4 THEN 'present'
           WHEN $3::numeric > 0 THEN 'half_day'
           ELSE 'absent'
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE employee_id = $1 AND attendance_date = $2
     RETURNING *`,
    [employeeId, date, actualHours, overtimeHours]
  );

  return updateResult.rows[0] || null;
}

/**
 * Mark employee as late
 */
async function markLate(employeeId, date, lateMinutes) {
  const result = await query(
    `UPDATE attendance
     SET late_minutes = $3,
         status = 'late',
         updated_at = CURRENT_TIMESTAMP
     WHERE employee_id = $1 AND attendance_date = $2
     RETURNING *`,
    [employeeId, date, lateMinutes]
  );
  return result.rows[0] || null;
}

/**
 * Get open time log session for employee
 */
async function getOpenSession(employeeId) {
  const result = await query(
    `SELECT * FROM time_logs 
     WHERE employee_id = $1 AND DATE(clock_in) = CURRENT_DATE AND status = 'open'
     ORDER BY clock_in DESC LIMIT 1`,
    [employeeId]
  );
  return result.rows[0] || null;
}

/**
 * Calculate monthly overtime summary
 */
async function getMonthlyOvertime(employeeId, year, month) {
  const result = await query(
    `SELECT 
       COALESCE(SUM(overtime_hours), 0) as total_overtime_hours,
       COALESCE(SUM(actual_hours), 0) as total_actual_hours,
       COUNT(*) as working_days,
       AVG(actual_hours) as avg_daily_hours
     FROM attendance
     WHERE employee_id = $1
       AND EXTRACT(YEAR FROM attendance_date) = $2
       AND EXTRACT(MONTH FROM attendance_date) = $3
       AND status != 'absent'`,
    [employeeId, year, month]
  );
  return result.rows[0];
}

/**
 * Get attendance history for a specific employee within date range
 */
async function getEmployeeAttendanceHistory(employeeId, startDate, endDate) {
  const result = await query(
    `SELECT 
       a.attendance_date,
       a.status,
       a.actual_hours,
       a.overtime_hours,
       a.late_minutes,
       a.expected_hours,
       a.notes,
       a.id as attendance_id,
       (SELECT clock_in FROM time_logs tl 
        WHERE tl.employee_id = $1 
        AND tl.clock_in::DATE = a.attendance_date 
        ORDER BY tl.clock_in ASC LIMIT 1) as clock_in_time,
       (SELECT clock_out FROM time_logs tl 
        WHERE tl.employee_id = $1 
        AND tl.clock_in::DATE = a.attendance_date 
        ORDER BY tl.clock_out DESC NULLS LAST LIMIT 1) as clock_out_time
     FROM attendance a
     WHERE a.employee_id = $1
       AND a.attendance_date >= $2::DATE
       AND a.attendance_date <= $3::DATE
     ORDER BY a.attendance_date DESC`,
    [employeeId, startDate, endDate]
  );

  console.log('[Attendance Repo] getEmployeeAttendanceHistory returned:', result.rows.length, 'records for employee:', employeeId);

  return result.rows;
}

/**
 * Add or update notes for attendance record
 */
async function updateAttendanceNotes(employeeId, date, notes) {
  const result = await query(
    `UPDATE attendance
     SET notes = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE employee_id = $1 AND attendance_date = $2
     RETURNING *`,
    [employeeId, date, notes]
  );

  if (result.rows.length === 0) {
    const createResult = await query(
      `INSERT INTO attendance (employee_id, attendance_date, status, notes)
       VALUES ($1, $2, 'present', $3)
       ON CONFLICT (employee_id, attendance_date) DO UPDATE
       SET notes = EXCLUDED.notes,
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [employeeId, date, notes]
    );
    return createResult.rows[0];
  }

  return result.rows[0];
}

module.exports = {
  clockIn,
  clockOut,
  getTimeLogs,
  getTimeLogById,
  getTodayAttendance,
  getAttendanceRange,
  getOrCreateDailyAttendance,
  updateDailyAttendance,
  markLate,
  getOpenSession,
  getMonthlyOvertime,
  getEmployeeAttendanceHistory,
  updateAttendanceNotes,
};