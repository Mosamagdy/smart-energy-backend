const service = require('./attendance.service');

const ATTENDANCE_MANAGER_ROLES = new Set(['super_admin', 'hr_manager', 'technician', 'engineer', 'employee', 'sales_rep']);
const ATTENDANCE_HEAD_ROLES    = new Set(['tech_head', 'dep_pr_manager', 'sales_manager', 'project_manager']);
const ATTENDANCE_SELF_ROLES    = new Set(['labor', 'technicians', 'technician', 'engineer', 'employee', 'sales_rep']);

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolve employee row-id from JWT user (employee_id > user_id lookup)
// ─────────────────────────────────────────────────────────────────────────────
async function resolveCurrentEmployeeId(user) {
  if (!user) return null;

  // 1. Token already carries employee_id
  if (user.employee_id) return Number(user.employee_id);

  const { query: dbQuery } = require('../../db');

  // 2. Look up by user_id (most common case)
  const byUser = await dbQuery(
    `SELECT id FROM employees WHERE user_id = $1 LIMIT 1`,
    [user.id]
  );
  if (byUser.rows[0]?.id) return Number(byUser.rows[0].id);

  // 3. Fallback: user.id might already be the employee id
  const byId = await dbQuery(
    `SELECT id FROM employees WHERE id = $1 LIMIT 1`,
    [user.id]
  );
  if (byId.rows[0]?.id) return Number(byId.rows[0].id);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/hr/attendance/clock-in/:employeeId?
// ─────────────────────────────────────────────────────────────────────────────
async function clockIn(req, res, next) {
  try {
    const role = (req.user?.role || '').toLowerCase();
    let employeeId = req.params.employeeId;

    if (employeeId && !ATTENDANCE_MANAGER_ROLES.has(role)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    if (!employeeId && ATTENDANCE_HEAD_ROLES.has(role)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    if (!employeeId && !ATTENDANCE_SELF_ROLES.has(role)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    // ✅ Use resolveCurrentEmployeeId instead of relying solely on token field
    if (!employeeId) {
      const resolved = await resolveCurrentEmployeeId(req.user);
      if (!resolved) {
        return res.status(404).json({ status: 'error', message: 'Employee not found' });
      }
      employeeId = resolved;
    }

    const ip       = req.ip;
    const location = req.body?.location || null;
    const result   = await service.clockIn(employeeId, ip, location);
    res.status(200).json({ status: 'success', message: result.message, data: result });
  } catch (error) {
    console.error('[Controller] ClockIn error:', error);
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/hr/attendance/clock-out/:employeeId?
// ─────────────────────────────────────────────────────────────────────────────
async function clockOut(req, res, next) {
  try {
    const role = (req.user?.role || '').toLowerCase();
    let employeeId = req.params.employeeId;

    if (employeeId && !ATTENDANCE_MANAGER_ROLES.has(role)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    if (!employeeId && ATTENDANCE_HEAD_ROLES.has(role)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    if (!employeeId && !ATTENDANCE_SELF_ROLES.has(role)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    // ✅ Use resolveCurrentEmployeeId instead of relying solely on token field
    if (!employeeId) {
      const resolved = await resolveCurrentEmployeeId(req.user);
      if (!resolved) {
        return res.status(404).json({ status: 'error', message: 'Employee not found' });
      }
      employeeId = resolved;
    }

    const ip       = req.ip;
    const location = req.body?.location || null;
    const result   = await service.clockOut(employeeId, ip, location);
    res.status(200).json({ status: 'success', message: result.message, data: result });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/attendance/status/:employeeId?
// ─────────────────────────────────────────────────────────────────────────────
async function getStatus(req, res, next) {
  try {
    let employeeId = req.params.employeeId;

    // ✅ FIX: when no :employeeId in URL, resolve from JWT via DB lookup
    if (!employeeId) {
      const resolved = await resolveCurrentEmployeeId(req.user);
      if (!resolved) {
        return res.status(404).json({ status: 'error', message: 'Employee not found' });
      }
      employeeId = resolved;
    }

    const result = await service.getStatus(employeeId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/attendance/range?start_date=&end_date=&department_id=
// ─────────────────────────────────────────────────────────────────────────────
async function getAttendanceRange(req, res, next) {
  try {
    const { start_date, end_date, department_id, employee_id } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        status: 'error',
        message: 'start_date و end_date مطلوبان',
      });
    }

    const result = await service.getAttendanceSummary(
      start_date,
      end_date,
      department_id ? parseInt(department_id) : null,
      employee_id   ? parseInt(employee_id)   : null
    );

    res.status(200).json({
      status: 'success',
      data: { records: result.records, summary: result.summary },
    });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/attendance/today?department_id=
// ─────────────────────────────────────────────────────────────────────────────
async function getDailyReport(req, res, next) {
  try {
    const { department_id } = req.query;
    const date   = new Date().toISOString().split('T')[0];
    const result = await service.getDailyReport(
      date,
      department_id ? parseInt(department_id) : null
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/attendance/overtime/:employeeId?year=&month=
// ─────────────────────────────────────────────────────────────────────────────
async function getMonthlyOvertimeReport(req, res, next) {
  try {
    const { employeeId }  = req.params;
    const { year, month } = req.query;
    const now             = new Date();

    const result = await service.getMonthlyOvertimeReport(
      parseInt(employeeId),
      year  ? parseInt(year)  : now.getFullYear(),
      month ? parseInt(month) : now.getMonth() + 1
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/hr/attendance/manual
// ─────────────────────────────────────────────────────────────────────────────
async function recordManualAttendance(req, res, next) {
  try {
    const result = await service.recordManualAttendance(req.body, req.user?.id);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/attendance/employee/:employeeId/history?start_date=&end_date=
// ─────────────────────────────────────────────────────────────────────────────
async function getEmployeeAttendanceHistory(req, res, next) {
  try {
    const { employeeId }        = req.params;
    const { start_date, end_date } = req.query;
    const role                  = (req.user?.role || '').toLowerCase();
    const requestedEmployeeId   = Number(employeeId);
    const isManager             = ATTENDANCE_MANAGER_ROLES.has(role);

    if (!isManager) {
      const ownEmployeeId = await resolveCurrentEmployeeId(req.user);
      if (!ownEmployeeId || Number(ownEmployeeId) !== requestedEmployeeId) {
        return res.status(403).json({ status: 'error', message: 'Forbidden' });
      }
    }

    if (!start_date || !end_date) {
      return res.status(400).json({
        status: 'error',
        message: 'start_date and end_date are required',
      });
    }

    const records = await service.getEmployeeAttendanceHistory(
      parseInt(employeeId),
      start_date,
      end_date
    );

    res.status(200).json({ status: 'success', data: { records } });
  } catch (error) {
    console.error('[Controller] getEmployeeAttendanceHistory error:', error);
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/hr/attendance/notes/:employeeId
// ─────────────────────────────────────────────────────────────────────────────
async function updateAttendanceNotes(req, res, next) {
  try {
    const { employeeId }  = req.params;
    const { date, notes } = req.body;

    if (!date) {
      return res.status(400).json({ status: 'error', message: 'date is required' });
    }

    const result = await service.updateAttendanceNotes(parseInt(employeeId), date, notes);
    res.status(200).json({
      status: 'success',
      message: 'Notes updated successfully',
      data: result,
    });
  } catch (error) {
    console.error('[Controller] updateAttendanceNotes error:', error);
    next(error);
  }
}

module.exports = {
  clockIn,
  clockOut,
  getStatus,
  getAttendanceRange,
  getDailyReport,
  getMonthlyOvertimeReport,
  recordManualAttendance,
  getEmployeeAttendanceHistory,
  updateAttendanceNotes,
};