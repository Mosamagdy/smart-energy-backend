const service = require('./leave.service');

// ── Employee (self) ───────────────────────────────────────────────────────────

/**
 * POST /api/leaves
 * Employee submits a leave request
 */
async function createLeaveRequest(req, res, next) {
  try {
    const leave = await service.createLeaveRequest(req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'تم تقديم طلب الإجازة بنجاح — بانتظار الموافقة',
      data: { leave },
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/leaves/my
 * Logged-in employee sees their own requests
 */
async function getMyLeaveRequests(req, res, next) {
  try {
    const leaves = await service.getMyLeaveRequests(req.user);
    res.status(200).json({
      status: 'success',
      message: 'طلبات إجازاتي',
      data: { leaves, count: leaves.length },
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/leaves/my/balances
 * Logged-in employee sees their leave balances
 */
async function getMyLeaveBalances(req, res, next) {
  try {
    const balances = await service.getMyLeaveBalances(req.user);
    res.status(200).json({
      status: 'success',
      message: 'أرصدة إجازاتي',
      data: { balances },
    });
  } catch (err) { next(err); }
}

// ── HR / GM Management ────────────────────────────────────────────────────────

/**
 * GET /api/leaves
 * All leave requests — hr_manager / general_manager
 * Optional query: ?status=pending
 */
async function getAllLeaveRequests(req, res, next) {
  try {
    const { status } = req.query;
    const leaves = await service.getAllLeaveRequests({ status }, req.user);
    res.status(200).json({
      status: 'success',
      data: { leaves, count: leaves.length },
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/leaves/employee/:employee_id
 * Leave requests for a specific employee
 */
async function getLeaveRequestsByEmployee(req, res, next) {
  try {
    const leaves = await service.getLeaveRequestsByEmployee(req.params.employee_id, req.user);
    res.status(200).json({
      status: 'success',
      data: { leaves, count: leaves.length },
    });
  } catch (err) { next(err); }
}

/**
 * PATCH /api/leaves/:id/status
 * Approve or reject — hr_manager / general_manager
 * Body: { status: 'approved' | 'rejected', rejection_reason?: string }
 */
async function updateLeaveStatus(req, res, next) {
  try {
    const leave = await service.updateLeaveStatus(req.params.id, req.body, req.user);

    const message = req.body.status === 'approved'
      ? 'تمت الموافقة على طلب الإجازة'
      : 'تم رفض طلب الإجازة';

    res.status(200).json({
      status: 'success',
      message,
      data: { leave },
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/leaves/balances/:employee_id
 * Leave balances for a specific employee
 */
async function getEmployeeLeaveBalances(req, res, next) {
  try {
    const balances = await service.getEmployeeLeaveBalances(req.params.employee_id, req.user);
    res.status(200).json({
      status: 'success',
      message: 'أرصدة الإجازات',
      data: { balances },
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/leaves/on-leave
 * Employees currently on approved leave (today within range)
 */
async function getEmployeesCurrentlyOnLeave(req, res, next) {
  try {
    const records = await service.getEmployeesCurrentlyOnLeave(req.user);
    res.status(200).json({
      status: 'success',
      data: { records, count: records.length },
    });
  } catch (err) { next(err); }
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