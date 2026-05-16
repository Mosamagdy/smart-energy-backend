const service = require('./quotations.service');

/**
 * POST /api/quotations
 * Create quotation with BOQ data and file upload
 */
async function createQuotation(req, res, next) {
  try {
    const {
      inspection_report_id,
      boq_data,
      total_price,
      discount,
      tax,
      details,
      comments
    } = req.body;

    // Parse boq_data if it's a string (from FormData)
    const parsedBoqData = typeof boq_data === 'string' ? JSON.parse(boq_data) : boq_data;

    // Get file URL if file was uploaded
    const fileUrl = req.file ? `/uploads/reports/${req.file.filename}` : null;

    const quotation = await service.createQuotation({
      inspection_report_id,
      boq_data: parsedBoqData,
      total_price,
      discount,
      tax,
      details,
      comments,
      file_url: fileUrl
    }, req.user.id);

    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء عرض السعر بنجاح وإخطار الإدارة المالية',
      data: { quotation }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/quotations/:id
 * Get single quotation
 */
async function getQuotationById(req, res, next) {
  try {
    const quotation = await service.getQuotationById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: { quotation }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leads/:leadId/quotations
 * Get all quotations for a lead
 */
async function getQuotationsByLeadId(req, res, next) {
  try {
    const quotations = await service.getQuotationsByLeadId(req.params.leadId);
    res.status(200).json({
      status: 'success',
      data: { quotations, count: quotations.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/quotations
 * Get all quotations with filters
 */
async function getAllQuotations(req, res, next) {
  try {
    const { status, created_by } = req.query;
    const filters = {};
    
    if (status) filters.status = status;
    if (created_by) filters.created_by = created_by;

    const quotations = await service.getAllQuotations(filters);
    res.status(200).json({
      status: 'success',
      data: { quotations, count: quotations.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/quotations/:id/finance-review
 * Finance manager reviews quotation
 */
async function financeReview(req, res, next) {
  try {
    const { action, rejection_comment } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      const err = new Error('الإجراء يجب أن يكون approve أو reject');
      err.statusCode = 400;
      return next(err);
    }

    const quotation = await service.financeReview(
      req.params.id,
      action,
      action === 'reject' ? rejection_comment : null,
      req.user.id
    );

    const message = action === 'approve' 
      ? 'تمت الموافقة المالية على عرض السعر'
      : 'تم رفض عرض السعر مالياً';

    res.status(200).json({
      status: 'success',
      message,
      data: { quotation }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/quotations/:id/gm-review
 * General manager reviews quotation
 */
async function gmReview(req, res, next) {
  try {
    const { action, rejection_comment } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      const err = new Error('الإجراء يجب أن يكون approve أو reject');
      err.statusCode = 400;
      return next(err);
    }

    const quotation = await service.gmReview(
      req.params.id,
      action,
      action === 'reject' ? rejection_comment : null,
      req.user.id
    );

    const message = action === 'approve'
      ? 'تم اعتماد عرض السعر من المدير العام'
      : 'تم رفض عرض السعر من قبل المدير العام';

    res.status(200).json({
      status: 'success',
      message,
      data: { quotation }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/quotations/:id/approve-for-client
 * Final approval - ready to send to client
 */
async function approveForClient(req, res, next) {
  try {
    const quotation = await service.approveForClient(req.params.id, req.user.id);
    
    res.status(200).json({
      status: 'success',
      message: 'عرض السعر جاهز للإرسال للعميل',
      data: { quotation }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/quotations/:id
 * Update quotation (before approval)
 */
async function updateQuotation(req, res, next) {
  try {
    const {
      boq_data,
      total_price,
      discount,
      tax,
      details,
      comments
    } = req.body;

    const updateData = {};
    if (boq_data !== undefined) updateData.boq_data = boq_data;
    if (total_price !== undefined) updateData.total_price = total_price;
    if (discount !== undefined) updateData.discount = discount;
    if (tax !== undefined) updateData.tax = tax;
    if (details !== undefined) updateData.details = details;
    if (comments !== undefined) updateData.comments = comments;

    const quotation = await service.updateQuotation(
      req.params.id,
      updateData,
      req.user.id
    );

    res.status(200).json({
      status: 'success',
      message: 'تم تحديث عرض السعر بنجاح',
      data: { quotation }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/quotations/:id
 * Soft delete quotation
 */
async function deleteQuotation(req, res, next) {
  try {
    await service.deleteQuotation(req.params.id, req.user.id);
    res.status(200).json({
      status: 'success',
      message: 'تم حذف عرض السعر بنجاح'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/client/my-quotations
 * Get all quotations for the logged-in client (by email)
 */
async function getClientQuotations(req, res, next) {
  try {
    // Security: Client can ONLY see their own quotations
    // req.user.email is from JWT token
    const clientEmail = req.user.email;
    
    // Fetch quotations linked to leads with this client's email
    const quotations = await service.getQuotationsByClientEmail(clientEmail);
    
    res.status(200).json({
      status: 'success',
      data: { quotations, count: quotations.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/client/quotations/:id/respond
 * Client responds to quotation (approve or reject)
 */
async function respondToQuotation(req, res, next) {
  try {
    const { status, rejection_reason } = req.body;
    const clientEmail = req.user.email;
    const quotationId = req.params.id;
    
    // Validate response
    if (!status || !['client_approved', 'client_rejected'].includes(status)) {
      const err = new Error('الحالة يجب أن تكون client_approved أو client_rejected');
      err.statusCode = 400;
      throw err;
    }
    
    // If rejected, reason is required
    if (status === 'client_rejected' && !rejection_reason) {
      const err = new Error('سبب الرفض مطلوب');
      err.statusCode = 400;
      throw err;
    }
    
    // Update quotation status
    const updatedQuotation = await service.clientRespondToQuotation(
      quotationId,
      clientEmail,
      status,
      rejection_reason
    );
    
    // Automation: Update parent lead status
    const leadService = require('../leads/leads.service');

    if (status === 'client_approved') {
      // Update lead to won
      await leadService.updateLeadStatus(updatedQuotation.lead_id, 'won');
      
      // Notify GM and Sales Rep with sound alert
      await notifyRole('general_manager', {
        title: 'العميل وافق على عرض السعر! 🎉',
        message: `العميل وافق على العرض - يرجى متابعة الإجراءات النهائية`,
        type: 'success',
        entity_type: 'quotation',
        entity_id: quotationId,
        sound: 'success.mp3'
      });
      
      await notifyRole('sales_rep', {
        title: 'العميل وافق على عرض السعر! 🎉',
        message: `يرجى التواصل مع العميل لإتمام الإجراءات`,
        type: 'success',
        entity_type: 'quotation',
        entity_id: quotationId,
        sound: 'success.mp3'
      });
      
    } else if (status === 'client_rejected') {
      // Update lead to lost
      await leadService.updateLeadStatus(updatedQuotation.lead_id, 'lost');
      
      // Notify GM and Sales Rep
      await notifyRole('general_manager', {
        title: 'العميل رفض عرض السعر',
        message: `سبب الرفض: ${rejection_reason}`,
        type: 'warning',
        entity_type: 'quotation',
        entity_id: quotationId,
        sound: 'notify.mp3'
      });
      
      await notifyRole('sales_rep', {
        title: 'العميل رفض عرض السعر',
        message: `يرجى مراجعة السبب والتواصل مع العميل`,
        type: 'warning',
        entity_type: 'quotation',
        entity_id: quotationId,
        sound: 'notify.mp3'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: status === 'client_approved' 
        ? 'شكراً لموافقتكم! سيتم التواصل معكم قريباً' 
        : 'تم تسجيل رفضكم، سيتم مراجعته',
      data: { 
        quotation: updatedQuotation,
        lead_status: status === 'client_approved' ? 'won' : 'lost'
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/quotations/:id/send-to-client
 * Send quotation to client & auto-create client account
 */
async function sendToClient(req, res, next) {
  try {
    const result = await service.sendToClient(req.params.id, req.user.id);
    
    res.status(200).json({
      status: 'success',
      message: result.temp_password 
        ? 'تم إرسال العرض للعميل وإنشاء حساب جديد' 
        : 'تم إرسال العرض للعميل',
      data: { 
        quotation: result.quotation,
        client_user_id: result.client_user_id,
        temp_password: result.temp_password // Only present if new user created
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/quotations/:id/convert-to-project
 * Convert approved quotation to project with BOQ migration
 */
async function convertToProject(req, res, next) {
  try {
    const result = await service.convertQuotationToProject(req.params.id, req.user.id);
    
    res.status(201).json({
      status: 'success',
      message: 'تم تحويل عرض السعر لمشروع بنجاح',
      data: { 
        project: result.project,
        tasks_created: result.tasks_created,
        quotation_id: result.quotation_id
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/quotations/:id/confirm-downpayment
 * Confirm downpayment received
 */
async function confirmDownpayment(req, res, next) {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      const err = new Error('المبلغ غير صحيح');
      err.statusCode = 400;
      throw err;
    }
    
    const updated = await service.confirmDownpayment(req.params.id, amount, req.user.id);
    
    res.status(200).json({
      status: 'success',
      message: 'تم تأكيد استلام الدفعة الأولى',
      data: { quotation: updated }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createQuotation,
  getQuotationById,
  getQuotationsByLeadId,
  getAllQuotations,
  financeReview,
  gmReview,
  approveForClient,
  updateQuotation,
  deleteQuotation,
  getClientQuotations,
  respondToQuotation,
  sendToClient,
  convertToProject,
  confirmDownpayment
};
