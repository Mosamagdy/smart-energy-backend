const service = require('./leads.service');

/**
 * POST /api/leads
 * Create new lead
 */
async function createLead(req, res, next) {
  try {
    const lead = await service.createLead(req.body, req.user.id);
    res.status(201).json({
      status:  'success',
      message: 'تم إضافة العميل المحتمل بنجاح',
      data:    { lead },
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/leads
 * Get all leads — ?status=new&priority=high&owner_id=1
 * CRITICAL: Dept Heads only see leads from their department
 * Quotation Specialists can see ALL leads (especially inspection_completed)
 */
async function getAllLeads(req, res, next) {
  try {
    const { status, priority, owner_id } = req.query;
    
    // Pass user info for departmental isolation
    const user = {
      id: req.user?.id,
      role: req.user?.role,
      department_id: req.user?.department_id
    };
    
    console.log('[Leads Controller] User:', user.role, 'Dept ID:', user.department_id);
    
    const leads = await service.getAllLeads({ status, priority, owner_id }, user);
    res.status(200).json({
      status: 'success',
      data:   { leads, count: leads.length },
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/leads/:id
 * Access Control:
 * - Engineers: Only if assigned_engineer_id === user.id
 * - Sales Reps: Only if assigned_sales_rep_id === user.id
 * - Others: Standard role-based access
 */
async function getLeadById(req, res, next) {
  try {
    const lead = await service.getLeadById(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // CRITICAL: Engineers can ONLY access leads they are assigned to
    if (userRole === 'engineer') {
      if (lead.assigned_engineer_id !== userId) {
        const err = new Error('غير مصرح لك بالوصول إلى هذا العميل');
        err.statusCode = 403;
        return next(err);
      }
    }
    
    // CRITICAL: Sales Reps can ONLY access leads they are assigned to
    if (userRole === 'sales_rep') {
      if (lead.assigned_sales_rep_id !== userId) {
        const err = new Error('غير مصرح لك بالوصول إلى هذا العميل');
        err.statusCode = 403;
        return next(err);
      }
    }
    
    res.status(200).json({ status: 'success', data: { lead } });
  } catch (err) { next(err); }
}

/**
 * PATCH /api/leads/:id
 * Update lead info
 */
async function updateLead(req, res, next) {
  try {
    const lead = await service.updateLead(req.params.id, req.body);
    res.status(200).json({
      status:  'success',
      message: 'تم تحديث بيانات العميل المحتمل',
      data:    { lead },
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/leads/my-tasks
 * Get leads assigned to current user (Engineer or Sales Rep)
 */
async function getMyTasks(req, res, next) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Map role names
    let role;
    if (userRole === 'engineer') {
      role = 'engineer';
    } else if (userRole === 'sales_rep') {
      role = 'sales_rep';
    } else if (userRole === 'quotation_specialist') {
      role = 'quotation_specialist';
    } else if (userRole === 'general_manager' || userRole === 'super_admin') {
      // Admins see all leads that need action
      role = 'admin';
    } else {
      return res.status(200).json({
        status: 'success',
        data: { leads: [] } // Other roles don't have assigned tasks
      });
    }
    
    const leads = await service.getAssignedLeads(userId, role);
    res.status(200).json({
      status: 'success',
      data: { leads, count: leads.length }
    });
  } catch (err) { next(err); }
}

/**
 * PATCH /api/leads/:id/assign
 * Assign sales rep to lead — dept_head only
 * Body: { sales_rep_id }
 */
async function assignSalesRep(req, res, next) {
  try {
    const { sales_rep_id } = req.body;
    if (!sales_rep_id) {
      const err = new Error('sales_rep_id مطلوب');
      err.statusCode = 400;
      return next(err);
    }
    const lead = await service.assignSalesRep(req.params.id, sales_rep_id, req.user.id);
    res.status(200).json({
      status:  'success',
      message: 'تم تعيين مندوب المبيعات بنجاح',
      data:    { lead },
    });
  } catch (err) { next(err); }
}

/**
 * PATCH /api/leads/:id/remove-sales-rep
 * Remove sales rep from lead — GM only
 */
async function removeSalesRep(req, res, next) {
  try {
    const lead = await service.removeSalesRep(req.params.id);
    res.status(200).json({
      status:  'success',
      message: 'تم إزالة مندوب المبيعات بنجاح',
      data:    { lead },
    });
  } catch (err) { next(err); }
}

/**
 * PATCH /api/leads/:id/assign-engineer
 * Assign engineer to lead for inspection — technical dept_head only
 * Creates inspection record with transaction safety
 * Body: { engineer_id }
 */
async function assignEngineer(req, res, next) {
  try {
    const { engineer_id } = req.body;
    if (!engineer_id) {
      const err = new Error('engineer_id مطلوب');
      err.statusCode = 400;
      return next(err);
    }
    
    const result = await service.assignEngineer(req.params.id, engineer_id, req.user.id);
    
    res.status(200).json({
      status:  'success',
      message: 'تم تعيين المهندس للمعاينة بنجاح وإنشاء سجل المعاينة',
      data: {
        lead: result.lead,
        inspection: result.inspection  // Critical for frontend/mobile app
      },
    });
  } catch (err) { next(err); }
}

/**
 * PATCH /api/leads/:id/remove-engineer
 * Remove engineer from lead — Technical Dept Head or GM only
 */
async function removeEngineer(req, res, next) {
  try {
    const lead = await service.removeEngineer(req.params.id);
    res.status(200).json({
      status:  'success',
      message: 'تم إزالة مهندس المعاينة بنجاح',
      data:    { lead },
    });
  } catch (err) { next(err); }
}

/**
 * PATCH /api/leads/:id/status
 * Update lead status — validates flow + sends notifications
 * Body: { status }
 */
async function updateLeadStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) {
      const err = new Error('الحالة الجديدة مطلوبة');
      err.statusCode = 400;
      return next(err);
    }
    const lead = await service.updateLeadStatus(req.params.id, status, req.user.id);
    res.status(200).json({
      status:  'success',
      message: `تم تغيير حالة العميل إلى "${status}"`,
      data:    { lead },
    });
  } catch (err) { next(err); }
}

/**
 * DELETE /api/leads/:id
 */
async function deleteLead(req, res, next) {
  try {
    await service.deleteLead(req.params.id);
    res.status(200).json({
      status:  'success',
      message: 'تم حذف العميل المحتمل بنجاح',
    });
  } catch (err) { next(err); }
}

/**
 * PATCH /api/leads/:id/approve-by-finance
 * Finance department approval
 */
async function approveByFinance(req, res, next) {
  try {
    const { finance_notes, total_cost } = req.body;
    
    const updatedLead = await service.updateLeadStatus(req.params.id, 'finance_approved');
    
    if (finance_notes || total_cost) {
      await service.updateLead(req.params.id, { finance_notes, total_cost });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'تم اعتماد العرض المالي وإرساله للمدير العام',
      data: { lead: updatedLead }
    });
  } catch (err) { next(err); }
}

/**
 * PATCH /api/leads/:id/approve-by-gm
 * General Manager approval
 */
async function approveByGm(req, res, next) {
  try {
    const { gm_notes } = req.body;
    
    const lead = await service.getLeadById(req.params.id);
    if (lead.status !== 'finance_approved') {
      const err = new Error('العرض يجب أن يكون معتمد مالياً أولاً');
      err.statusCode = 400;
      throw err;
    }
    
    const updatedLead = await service.updateLeadStatus(req.params.id, 'gm_approved');
    
    if (gm_notes) {
      await service.updateLead(req.params.id, { gm_notes });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'تم اعتماد العرض من المدير العام - جاهز للإرسال للعميل',
      data: { lead: updatedLead }
    });
  } catch (err) { next(err); }
}

/**
 * Approve lead for client - creates user account and sends credentials
 */
async function approveForClient(req, res, next) {
  try {
    const result = await service.approveForClient(req.params.id, req.user.id);
    
    res.status(200).json({
      status: 'success',
      message: 'تم اعتماد العميل وإرسال بيانات تسجيل الدخول',
      data: {
        lead: result.lead,
        client_user: result.client_user,
        is_new_user: result.isNewUser,
        client_credentials_sent: result.client_credentials_sent,
        new_user_id: result.new_user_id
      }
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/leads/:id/customer-statement
 */
async function getCustomerStatement(req, res, next) {
  try {
    const statement = await service.getCustomerStatement(req.params.id);
    res.status(200).json({
      status: 'success',
      message: 'تم جلب كشف حساب العميل بنجاح',
      data: statement
    });
  } catch (err) { next(err); }
}


module.exports = {
  createLead,
  getAllLeads,
  getMyTasks,
  getLeadById,
  updateLead,
  assignSalesRep,
  assignEngineer,
  updateLeadStatus,
  deleteLead,
  removeSalesRep,
  removeEngineer,
  approveByFinance,
  approveByGm,
  approveForClient,
  getCustomerStatement,
};