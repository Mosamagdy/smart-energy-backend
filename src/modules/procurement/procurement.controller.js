const service = require('./procurement.service');

// ============================================================================
// Procurement Controller - Purchase Order Approval Workflow
// ============================================================================

/**
 * POST /api/procurement/approve-by-procurement/:id
 * Procurement Manager approves → sends to Finance
 */
async function approveByProcurement(req, res, next) {
  try {
    const { id } = req.params;
    const { approval_notes } = req.body;

    const result = await service.approveByProcurement(id, approval_notes, req.user);

    res.status(200).json({
      status: 'success',
      message: 'تمت الموافقة المبدئية وإرسال أمر الشراء إلى الإدارة المالية',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/procurement/approve-by-finance/:id
 * Finance Manager approves → PO becomes 'approved'
 */
async function approveByFinance(req, res, next) {
  try {
    const { id } = req.params;
    const { approval_notes, is_tax_applied } = req.body;

    const result = await service.approveByFinance(id, approval_notes, req.user, is_tax_applied !== undefined ? is_tax_applied : true);

    res.status(200).json({
      status: 'success',
      message: 'تمت الموافقة المالية على أمر الشراء',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/procurement/reject/:id
 * Reject by either procurement or finance
 */
async function rejectRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { rejection_reason, rejection_stage } = req.body;

    if (!rejection_reason || rejection_reason.trim() === '') {
      const err = new Error('يجب إدخال سبب الرفض');
      err.statusCode = 400;
      throw err;
    }

    const result = await service.rejectRequest(id, rejection_reason, rejection_stage, req.user);

    res.status(200).json({
      status: 'success',
      message: 'تم رفض أمر الشراء',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/procurement/pending-finance
 * Get pending finance approvals for Finance Manager dashboard
 */
async function getPendingFinanceApprovals(req, res, next) {
  try {
    const approvals = await service.getPendingFinanceApprovals(req.user);

    res.status(200).json({
      status: 'success',
      data: {
        approvals,
        count: approvals.length
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/procurement/pending-procurement
 * Get pending procurement approvals for Procurement Manager dashboard
 */
async function getPendingProcurementApprovals(req, res, next) {
  try {
    const approvals = await service.getPendingProcurementApprovals(req.user);

    res.status(200).json({
      status: 'success',
      data: {
        approvals,
        count: approvals.length
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  approveByProcurement,
  approveByFinance,
  rejectRequest,
  getPendingFinanceApprovals,
  getPendingProcurementApprovals
};
