const repo                   = require('./leave.repository');
const { notifyRole, notify } = require('../../utils/notify');
const { query }              = require('../../db');

// ── Helpers ───────────────────────────────────────────────────────────────────

function calculateBusinessDays(startDate, endDate) {
  let count = 0;
  let current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 5 && day !== 6) count++; // skip Fri & Sat (Saudi weekend)
    current.setDate(current.getDate() + 1);
  }
  return count;
}

const LEAVE_TYPE_LABELS = {
  annual:     'إجازة سنوية',
  sick:       'إجازة مرضية',
  emergency:  'إجازة طارئة',
  unpaid:     'إجازة بدون راتب',
  maternity:  'إجازة أمومة',
  paternity:  'إجازة أبوة',
};

// ── My Leaves (logged-in employee) ───────────────────────────────────────────

/**
 * Employee submits a leave request
 */
async function createLeaveRequest(data, currentUser) {
  const { leave_type, start_date, end_date, reason, document_url } = data;

  if (!leave_type || !start_date || !end_date) {
    const err = new Error('نوع الإجازة وتاريخ البداية والنهاية مطلوبين');
    err.statusCode = 400;
    throw err;
  }

  // Resolve the employee record from the logged-in user
  const emp = await repo.getEmployeeByUserId(currentUser.id);
  if (!emp) {
    const err = new Error('لا يوجد سجل موظف لهذا المستخدم');
    err.statusCode = 404;
    throw err;
  }

  const start = new Date(start_date);
  const end   = new Date(end_date);
  if (end < start) {
    const err = new Error('تاريخ النهاية يجب أن يكون بعد البداية');
    err.statusCode = 400;
    throw err;
  }

  const days_count = calculateBusinessDays(start_date, end_date);
  if (days_count <= 0) {
    const err = new Error('لا يمكن طلب إجازة في عطلات نهاية الأسبوع فقط');
    err.statusCode = 400;
    throw err;
  }

  const hasOverlap = await repo.checkOverlappingLeave(emp.id, start_date, end_date);
  if (hasOverlap) {
    const err = new Error('لديك طلب إجازة موجود في نفس الفترة');
    err.statusCode = 400;
    throw err;
  }

  // Ensure balance record exists, then check
  let balance = await repo.getEmployeeLeaveBalance(emp.id, leave_type.toLowerCase());
  if (!balance) {
    balance = await repo.createOrUpdateLeaveBalance(emp.id, leave_type.toLowerCase(), 21);
  }
  if (balance.remaining < days_count) {
    const err = new Error(
      `لا يوجد رصيد كافٍ — المطلوب: ${days_count} يوم — المتاح: ${balance.remaining} يوم`
    );
    err.statusCode = 400;
    throw err;
  }

  const leave = await repo.createLeaveRequest({
    employee_id: emp.id,
    leave_type,
    start_date,
    end_date,
    days_count,
    reason,
    document_url,
    status: 'pending',
  });

  // ── Notifications ─────────────────────────────────────────────────────────
  const typeLabel  = LEAVE_TYPE_LABELS[leave_type.toLowerCase()] || leave_type;
  const empName    = `${emp.first_name} ${emp.last_name}`;
  const notifTitle = 'طلب إجازة جديد بانتظار مراجعتك';
  const notifMsg   = `الموظف/ة: ${empName} — النوع: ${typeLabel} — المدة: ${days_count} يوم (${start_date} → ${end_date})`;

  await notifyRole('hr_manager', {
    title: notifTitle,
    message: notifMsg,
    type: 'warning',
    entity_type: 'leave_request',
    entity_id: leave.id,
  });

  await notifyRole('general_manager', {
    title: notifTitle,
    message: notifMsg,
    type: 'warning',
    entity_type: 'leave_request',
    entity_id: leave.id,
  });

  return leave;
}

/**
 * Get the logged-in employee's own leave requests
 */
async function getMyLeaveRequests(currentUser) {
  const emp = await repo.getEmployeeByUserId(currentUser.id);
  if (!emp) {
    const err = new Error('لا يوجد سجل موظف لهذا المستخدم');
    err.statusCode = 404;
    throw err;
  }
  return repo.getLeaveRequestsByEmployee(emp.id);
}

/**
 * Get the logged-in employee's own leave balances
 */
async function getMyLeaveBalances(currentUser) {
  const emp = await repo.getEmployeeByUserId(currentUser.id);
  if (!emp) {
    const err = new Error('لا يوجد سجل موظف لهذا المستخدم');
    err.statusCode = 404;
    throw err;
  }
  return _ensureAndGetBalances(emp.id);
}

// ── HR / GM Management ────────────────────────────────────────────────────────

/**
 * Get all leave requests (hr_manager / general_manager)
 * Optionally filter by status: ?status=pending
 */
async function getAllLeaveRequests(filters, currentUser) {
  const role = (currentUser.role || currentUser.role_name || '').toLowerCase();
  const allowed = ['super_admin', 'hr_manager', 'general_manager'];
  if (!allowed.includes(role)) {
    const err = new Error('ليس لديك صلاحية لعرض كل طلبات الإجازات');
    err.statusCode = 403;
    throw err;
  }
  return repo.getAllLeaveRequests(filters);
}

/**
 * Get leave requests for a specific employee (by HR/GM)
 */
async function getLeaveRequestsByEmployee(employee_id, currentUser) {
  const role = (currentUser.role || currentUser.role_name || '').toLowerCase();
  const allowed = ['super_admin', 'hr_manager', 'general_manager', 'dept_head'];
  if (!allowed.includes(role)) {
    const err = new Error('ليس لديك صلاحية');
    err.statusCode = 403;
    throw err;
  }
  const emp = await repo.getEmployeeById(employee_id);
  if (!emp) {
    const err = new Error('الموظف غير موجود');
    err.statusCode = 404;
    throw err;
  }
  return repo.getLeaveRequestsByEmployee(employee_id);
}

/**
 * Approve or reject a leave request — single-stage
 * Only hr_manager / general_manager / super_admin
 */
async function updateLeaveStatus(id, { status, rejection_reason }, currentUser) {
  const validStatuses = ['approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    const err = new Error('الحالة يجب أن تكون approved أو rejected');
    err.statusCode = 400;
    throw err;
  }

  if (status === 'rejected' && !rejection_reason) {
    const err = new Error('سبب الرفض مطلوب');
    err.statusCode = 400;
    throw err;
  }

  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  const allowed  = ['super_admin', 'hr_manager', 'general_manager'];
  if (!allowed.includes(userRole)) {
    const err = new Error('فقط مدير الموارد البشرية أو المدير العام يقدر يوافق/يرفض');
    err.statusCode = 403;
    throw err;
  }

  const leave = await repo.getLeaveRequestById(id);
  if (!leave) {
    const err = new Error('طلب الإجازة غير موجود');
    err.statusCode = 404;
    throw err;
  }

  if (leave.status !== 'pending') {
    const err = new Error(`الطلب بالفعل في حالة "${leave.status_arabic}" ولا يمكن تعديله`);
    err.statusCode = 400;
    throw err;
  }

  // Who approved/rejected
  const approverName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim();
  const roleLabel    = userRole === 'hr_manager' ? 'مدير الموارد البشرية' : 'المدير العام';
  const typeLabel    = LEAVE_TYPE_LABELS[leave.leave_type?.toLowerCase()] || leave.leave_type;

  const updated = await repo.updateLeaveStatus(id, {
    status,
    approved_by: currentUser.id,
    rejection_reason: status === 'rejected' ? rejection_reason : null,
  });

  // Deduct balance only on approval
  if (status === 'approved') {
    await repo.deductLeaveBalance(leave.employee_id, leave.leave_type.toLowerCase(), leave.days_count);
  }

  // ── Notification to the employee ─────────────────────────────────────────
  if (leave.employee_user_id) {
    if (status === 'approved') {
      await notify({
        user_id: leave.employee_user_id,
        title: 'تمت الموافقة على إجازتك ✅',
        message:
          `تمت الموافقة على طلب ${typeLabel} بتاعك` +
          ` (${leave.days_count} يوم: ${leave.start_date?.toString().slice(0,10)} → ${leave.end_date?.toString().slice(0,10)})` +
          ` من قِبَل ${roleLabel} ${approverName}`,
        type: 'success',
        entity_type: 'leave_request',
        entity_id: id,
      });
    } else {
      await notify({
        user_id: leave.employee_user_id,
        title: 'تم رفض طلب إجازتك ❌',
        message:
          `رفض ${roleLabel} ${approverName} طلب ${typeLabel} بتاعك` +
          ` — السبب: ${rejection_reason}`,
        type: 'danger',
        entity_type: 'leave_request',
        entity_id: id,
      });
    }
  }

  return updated;
}

// ── Leave Balances (HR/GM) ────────────────────────────────────────────────────

async function getEmployeeLeaveBalances(employee_id, currentUser) {
  const role = (currentUser.role || currentUser.role_name || '').toLowerCase();
  const allowed = ['super_admin', 'hr_manager', 'general_manager', 'dept_head'];
  if (!allowed.includes(role)) {
    const err = new Error('ليس لديك صلاحية');
    err.statusCode = 403;
    throw err;
  }

  const emp = await repo.getEmployeeById(employee_id);
  if (!emp) {
    const err = new Error('الموظف غير موجود');
    err.statusCode = 404;
    throw err;
  }

  return _ensureAndGetBalances(employee_id);
}

/**
 * Employees currently on leave (HR/GM)
 */
async function getEmployeesCurrentlyOnLeave(currentUser) {
  const role = (currentUser.role || currentUser.role_name || '').toLowerCase();
  const allowed = ['super_admin', 'hr_manager', 'general_manager'];
  if (!allowed.includes(role)) {
    const err = new Error('ليس لديك صلاحية');
    err.statusCode = 403;
    throw err;
  }

  const today = new Date().toISOString().slice(0, 10);
  return repo.getEmployeesCurrentlyOnLeave(today);
}

// ── Internal helper ───────────────────────────────────────────────────────────

async function _ensureAndGetBalances(employee_id) {
  const defaults = [
    { leave_type: 'annual', total_allowed: 21 },
    { leave_type: 'sick',   total_allowed: 10 },
  ];

  const existing = await repo.getAllEmployeeLeaveBalances(employee_id);
  for (const def of defaults) {
    if (!existing.find(b => b.leave_type === def.leave_type)) {
      await repo.createOrUpdateLeaveBalance(employee_id, def.leave_type, def.total_allowed);
    }
  }

  return repo.getAllEmployeeLeaveBalances(employee_id);
}

module.exports = {
  createLeaveRequest,
  getMyLeaveRequests,
  getMyLeaveBalances,
  getAllLeaveRequests,
  getLeaveRequestsByEmployee,
  updateLeaveStatus,
  getEmployeeLeaveBalances,
  getEmployeesCurrentlyOnLeave,
};