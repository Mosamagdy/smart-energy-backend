const repo = require('./attendance.repository');

const LATE_THRESHOLD_MINUTES = 15; // Minutes past expected start to count as late
const STANDARD_WORK_HOURS = 8.00;
const OVERTIME_RATE_MULTIPLIER = 1.50; // 150% of hourly rate

/**
 * Clock In - Employee starts work
 */
async function clockIn(paramId, ip, location) {
  const empData = await getEmployeeIdFromParam(paramId);
  
  if (!empData) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }
  
  const { employeeId, departmentId } = empData;

  // Check if already clocked in today
  const openSession = await repo.getOpenSession(employeeId);
  if (openSession) {
    const err = new Error('لديك جلسة مفتوحة بالفعل اليوم - يرجى clock out أولاً');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  
  // Create clock-in record
  const timeLog = await repo.clockIn(employeeId, now.toISOString(), ip, location);

  // Create or update daily attendance
  const attendance = await repo.getOrCreateDailyAttendance(employeeId, now.toISOString().split('T')[0], departmentId);

  // Check if late (assuming 8 AM start time)
  const hour = now.getHours();
  if (hour >= 8 && hour < 10) { // Late if clocked in after 8:00 but before 10:00
    const lateMinutes = (hour - 8) * 60 + now.getMinutes();
    if (lateMinutes > LATE_THRESHOLD_MINUTES) {
      await repo.markLate(employeeId, now.toISOString().split('T')[0], lateMinutes);
    }
  }

  return {
    timeLog,
    attendance,
    message: 'تم تسجيل الحضور بنجاح',
  };
}

/**
 * Clock Out - Employee ends work
 */
async function clockOut(paramId, ip, location) {
  const empData = await getEmployeeIdFromParam(paramId);
  
  if (!empData) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }
  
  const { employeeId } = empData;
  
  const now = new Date();

  // Close the time log session
  const timeLog = await repo.clockOut(employeeId, now.toISOString(), ip, location);

  if (!timeLog) {
    const err = new Error('لا توجد جلسة مفتوحة للتسجيل الخروج');
    err.statusCode = 400;
    throw err;
  }

  // Update daily attendance with calculated hours
  const attendance = await repo.updateDailyAttendance(employeeId, now.toISOString().split('T')[0]);

  return {
    timeLog,
    attendance,
    message: 'تم تسجيل الانصراف بنجاح',
  };
}

/**
 * Helper to get employeeId from either employeeId or userId
 */
async function getEmployeeIdFromParam(param) {
  const { query: dbQuery } = require('../../db');
  
  let empResult = await dbQuery(
    `SELECT id, department_id FROM employees WHERE id = $1`,
    [param]
  );
  
  if (!empResult.rows[0]) {
    empResult = await dbQuery(
      `SELECT id, department_id FROM employees WHERE user_id = $1`,
      [param]
    );
  }
  
  if (!empResult.rows[0]) {
    return null;
  }
  
  return {
    employeeId: empResult.rows[0].id,
    departmentId: empResult.rows[0].department_id
  };
}

/**
 * Get current status - Check if employee is clocked in
 */
async function getStatus(paramId) {
  const empData = await getEmployeeIdFromParam(paramId);
  
  if (!empData) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }
  
  const { employeeId, departmentId } = empData;
  
  const openSession = await repo.getOpenSession(employeeId);
  const todayAttendance = await repo.getOrCreateDailyAttendance(
    employeeId, 
    new Date().toISOString().split('T')[0],
    departmentId
  );

  return {
    is_clocked_in: !!openSession,
    current_session: openSession || null,
    today_summary: todayAttendance,
  };
}

/**
 * Get attendance summary for date range
 */
async function getAttendanceSummary(startDate, endDate, departmentId, employeeId) {
  const records = await repo.getAttendanceRange(startDate, endDate, departmentId, employeeId);

  // Calculate summary statistics
  const summary = {
    total_records: records.length,
    total_hours: 0,
    total_overtime: 0,
    days_present: 0,
    days_absent: 0,
    days_late: 0,
    total_late_minutes: 0,
  };

  records.forEach(record => {
    summary.total_hours += Number(record.actual_hours || 0);
    summary.total_overtime += Number(record.overtime_hours || 0);

    if (record.status === 'present' || record.status === 'late') {
      summary.days_present++;
    }
    if (record.status === 'absent') {
      summary.days_absent++;
    }
    if (record.status === 'late') {
      summary.days_late++;
      summary.total_late_minutes += record.late_minutes || 0;
    }
  });

  return {
    records,
    summary,
  };
}

/**
 * Get daily attendance report (all employees)
 */
async function getDailyReport(date, departmentId) {
  const records = await repo.getTodayAttendance(departmentId);

  const summary = {
    total_employees: records.length,
    present: records.filter(r => r.status === 'present' || r.status === 'late').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
    half_day: records.filter(r => r.status === 'half_day').length,
    on_leave: records.filter(r => r.status === 'leave').length,
    total_hours: records.reduce((sum, r) => sum + Number(r.actual_hours || 0), 0),
    total_overtime: records.reduce((sum, r) => sum + Number(r.overtime_hours || 0), 0),
  };

  return { records, summary };
}

/**
 * Calculate overtime payment based on salary (Smart Energy Logic)
 * Uses the 45-column employee structure: basic_salary, allowances, etc.
 */
async function calculateOvertimePayment(employeeId, overtimeHours) {
  // Get employee salary details from 45-column structure
  const { query: dbQuery } = require('../../db');
  const result = await dbQuery(
    `SELECT 
       basic_salary,
       housing_allowance,
       transport_allowance,
       other_allowances,
       currency
     FROM employees 
     WHERE id = $1`,
    [employeeId]
  );

  if (!result.rows[0]) {
    return null;
  }

  const emp = result.rows[0];
  
  // Calculate daily rate: (basic_salary / 30)
  // Calculate hourly rate: (daily_rate / 8)
  // Overtime: hourly_rate * 1.5 * overtime_hours
  
  const basicSalary = Number(emp.basic_salary) || 0;
  const totalAllowances = 
    Number(emp.housing_allowance || 0) + 
    Number(emp.transport_allowance || 0) + 
    Number(emp.other_allowances || 0);
  
  const totalMonthly = basicSalary + totalAllowances;
  const dailyRate = totalMonthly / 30;
  const hourlyRate = dailyRate / 8;
  const overtimeRate = hourlyRate * OVERTIME_RATE_MULTIPLIER; // 1.5x
  
  const overtimePayment = overtimeRate * overtimeHours;

  return {
    employee_id: employeeId,
    overtime_hours: overtimeHours,
    hourly_rate: Number(hourlyRate.toFixed(4)),
    overtime_rate_per_hour: Number(overtimeRate.toFixed(4)),
    total_payment: Number(overtimePayment.toFixed(2)),
    currency: emp.currency || 'SAR',
    calculation: {
      basic_salary: basicSalary,
      total_allowances: totalAllowances,
      monthly_total: totalMonthly,
      daily_rate: Number(dailyRate.toFixed(2)),
      standard_hourly_rate: Number(hourlyRate.toFixed(4)),
      overtime_multiplier: OVERTIME_RATE_MULTIPLIER,
    },
  };
}

/**
 * Get monthly overtime report for payroll
 */
async function getMonthlyOvertimeReport(employeeId, year, month) {
  const stats = await repo.getMonthlyOvertime(employeeId, year, month);
  
  if (Number(stats.total_overtime_hours) === 0) {
    return {
      ...stats,
      overtime_payment: 0,
      employee_id: employeeId,
      year,
      month,
    };
  }

  const payment = await calculateOvertimePayment(employeeId, Number(stats.total_overtime_hours));

  return {
    employee_id: employeeId,
    year,
    month,
    ...stats,
    overtime_payment: payment?.total_payment || 0,
    currency: payment?.currency || 'SAR',
  };
}

/**
 * Get time logs for employee
 */
async function getTimeLogs(employeeId, startDate, endDate) {
  return repo.getTimeLogs(employeeId, startDate, endDate);
}

/**
 * Record manual attendance (HR/Admin only)
 */
async function recordManualAttendance(data, recordedBy) {
  const { employee_id, attendance_date, status, expected_hours, actual_hours, overtime_hours, late_minutes } = data;

  // Validate employee exists
  const { query: dbQuery } = require('../../db');
  const empCheck = await dbQuery(`SELECT id FROM employees WHERE id = $1`, [employee_id]);
  if (!empCheck.rows[0]) {
    const err = new Error('الموظف غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Insert or update attendance record
  const result = await dbQuery(
    `INSERT INTO attendance (
       employee_id, attendance_date, department_id, 
       expected_hours, actual_hours, overtime_hours, late_minutes, status
     ) VALUES ($1, $2::DATE, 
       (SELECT department_id FROM employees WHERE id = $1),
       $3, $4, $5, $6, $7
     )
     ON CONFLICT (employee_id, attendance_date) 
     DO UPDATE SET
       status = EXCLUDED.status,
       expected_hours = COALESCE($3, attendance.expected_hours),
       actual_hours = COALESCE($4, attendance.actual_hours),
       overtime_hours = COALESCE($5, attendance.overtime_hours),
       late_minutes = COALESCE($6, attendance.late_minutes),
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [employee_id, attendance_date, expected_hours, actual_hours, overtime_hours, late_minutes || 0, status]
  );

  return result.rows[0];
}

/**
 * Get employee attendance history for date range
 */
async function getEmployeeAttendanceHistory(employeeId, startDate, endDate) {
  return repo.getEmployeeAttendanceHistory(employeeId, startDate, endDate);
}

/**
 * Add or update notes for attendance record
 */
async function updateAttendanceNotes(employeeId, date, notes) {
  return repo.updateAttendanceNotes(employeeId, date, notes);
}

module.exports = {
  clockIn,
  clockOut,
  getStatus,
  getAttendanceSummary,
  getDailyReport,
  calculateOvertimePayment,
  getMonthlyOvertimeReport,
  getTimeLogs,
  recordManualAttendance,
  getEmployeeAttendanceHistory,
  updateAttendanceNotes,
};