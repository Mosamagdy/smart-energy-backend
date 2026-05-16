const service = require('./client.service');

/**
 * Client Portal Controller
 * HTTP request handlers for client-facing endpoints
 */

// ============================================
// CLIENT PROFILE
// ============================================

/**
 * GET /api/client/profile
 * Get client profile information
 */
async function getClientProfile(req, res, next) {
  try {
    const profile = await service.getClientProfile(req.user.id);
    
    res.json({
      status: 'success',
      message: 'تم جلب البيانات الشخصية بنجاح',
      data: profile
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// QUOTATIONS
// ============================================

/**
 * GET /api/client/my-quotations
 * Get all quotations for this client
 */
async function getMyQuotations(req, res, next) {
  try {
    const quotations = await service.getMyQuotations(req.user.id);
    
    res.json({
      status: 'success',
      count: quotations.length,
      data: quotations
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/client/quotations/:id/respond
 * Client responds to quotation (accept/reject)
 */
async function respondToQuotation(req, res, next) {
  try {
    const quotationId = parseInt(req.params.id);
    const { status, rejection_reason } = req.body;
    
    if (isNaN(quotationId)) {
      const err = new Error('رقم عرض السعر غير صحيح');
      err.statusCode = 400;
      throw err;
    }
    
    if (!['client_approved', 'client_rejected'].includes(status)) {
      const err = new Error('حالة الرد غير صحيحة');
      err.statusCode = 400;
      throw err;
    }
    
    if (status === 'client_rejected' && !rejection_reason) {
      const err = new Error('يرجى ذكر سبب الرفض');
      err.statusCode = 400;
      throw err;
    }
    
    const quotation = await service.respondToQuotation(
      quotationId,
      req.user.id,
      { status, rejection_reason }
    );
    
    res.json({
      status: 'success',
      message: status === 'client_approved' 
        ? 'تم قبول عرض السعر بنجاح' 
        : 'تم رفض عرض السعر',
      data: quotation
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// PROJECTS
// ============================================

/**
 * GET /api/client/projects
 * Get all projects for this client
 */
async function getClientProjects(req, res, next) {
  try {
    const projects = await service.getClientProjects(req.user.id);
    
    res.json({
      status: 'success',
      count: projects.length,
      data: projects
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/client/projects/:id
 * Get single project with tasks
 */
async function getClientProject(req, res, next) {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      const err = new Error('رقم المشروع غير صحيح');
      err.statusCode = 400;
      throw err;
    }
    
    const project = await service.getClientProjectById(projectId, req.user.id);
    
    res.json({
      status: 'success',
      message: 'تم جلب تفاصيل المشروع بنجاح',
      data: project
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// INVOICES
// ============================================

/**
 * GET /api/client/invoices
 * Get all invoices for this client
 */
async function getClientInvoices(req, res, next) {
  try {
    const invoices = await service.getClientInvoices(req.user.id);
    
    res.json({
      status: 'success',
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/client/invoices/:id
 * Get single invoice with payment history
 */
async function getClientInvoice(req, res, next) {
  try {
    const invoiceId = parseInt(req.params.id);
    
    if (isNaN(invoiceId)) {
      const err = new Error('رقم الفاتورة غير صحيح');
      err.statusCode = 400;
      throw err;
    }
    
    const invoice = await service.getClientInvoiceById(invoiceId, req.user.id);
    
    res.json({
      status: 'success',
      message: 'تم جلب تفاصيل الفاتورة بنجاح',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// MAINTENANCE
// ============================================

/**
 * GET /api/client/maintenance/assets
 * Get client's installed assets
 */
async function getClientAssets(req, res, next) {
  try {
    const assets = await service.getClientAssets(req.user.id);
    
    res.json({
      status: 'success',
      count: assets.length,
      data: assets
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/client/maintenance/visits
 * Get client's maintenance visits
 */
async function getClientMaintenanceVisits(req, res, next) {
  try {
    const visits = await service.getClientMaintenanceVisits(req.user.id);
    
    res.json({
      status: 'success',
      count: visits.length,
      data: visits
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/client/maintenance/contracts
 * Get client's maintenance contracts
 */
async function getClientMaintenanceContracts(req, res, next) {
  try {
    const contracts = await service.getClientMaintenanceContracts(req.user.id);
    
    res.json({
      status: 'success',
      count: contracts.length,
      data: contracts
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// CLIENT SUPPORT MESSAGES (Chat)
// ============================================

/**
 * GET /api/client/projects/:projectId/messages
 * Get support messages for a project
 */
async function getProjectMessages(req, res, next) {
  try {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      const err = new Error('رقم المشروع غير صحيح');
      err.statusCode = 400;
      throw err;
    }
    
    const messages = await service.getClientSupportMessages(projectId, req.user.id);
    
    res.json({
      status: 'success',
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/client/projects/:projectId/messages
 * Send message to sales representative
 */
async function sendMessage(req, res, next) {
  try {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      const err = new Error('رقم المشروع غير صحيح');
      err.statusCode = 400;
      throw err;
    }
    
    const { message, parent_message_id } = req.body;
    
    if (!message) {
      const err = new Error('الرجاء كتابة رسالة');
      err.statusCode = 400;
      throw err;
    }
    
    const newMessage = await service.sendMessageToSalesRep(
      projectId, 
      req.user.id, 
      { message, parent_message_id }
    );
    
    res.status(201).json({
      status: 'success',
      message: 'تم إرسال الرسالة بنجاح',
      data: newMessage
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/client/messages/:id/read
 * Mark message as read
 */
async function markMessageRead(req, res, next) {
  try {
    const messageId = parseInt(req.params.id);
    
    if (isNaN(messageId)) {
      const err = new Error('رقم الرسالة غير صحيح');
      err.statusCode = 400;
      throw err;
    }
    
    const updated = await service.markMessageAsRead(messageId, req.user.id);
    
    res.json({
      status: 'success',
      message: 'تم تحديث حالة الرسالة بنجاح',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/client/messages/unread-count
 * Get unread message count
 */
async function getUnreadCount(req, res, next) {
  try {
    const count = await service.getUnreadMessagesCount(req.user.id);
    
    res.json({
      status: 'success',
      data: { unread_count: count }
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// PROJECT RATINGS
// ============================================

/**
 * GET /api/client/projects/:id/rating-eligibility
 * Check if client can rate a project
 */
async function checkRatingEligibility(req, res, next) {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      const err = new Error('رقم المشروع غير صحيح');
      err.statusCode = 400;
      throw err;
    }
    
    const eligibility = await service.checkRatingEligibility(projectId, req.user.id);
    
    res.json({
      status: 'success',
      data: eligibility
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/client/projects/:id/ratings
 * Submit project rating
 */
async function submitProjectRating(req, res, next) {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      const err = new Error('رقم المشروع غير صحيح');
      err.statusCode = 400;
      throw err;
    }
    
    const { rating, comment, is_anonymous } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      const err = new Error('التقييم يجب أن يكون بين 1 و 5 نجوم');
      err.statusCode = 400;
      throw err;
    }
    
    const ratingResult = await service.submitProjectRating(
      projectId,
      req.user.id,
      { rating, comment, is_anonymous }
    );
    
    res.status(201).json({
      status: 'success',
      message: 'تم تقديم تقييمك بنجاح',
      data: ratingResult
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/client/ratings
 * Get client's submitted ratings
 */
async function getClientRatings(req, res, next) {
  try {
    const ratings = await service.getClientRatings(req.user.id);
    
    res.json({
      status: 'success',
      count: ratings.length,
      data: ratings
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  // Profile
  getClientProfile,
  
  // Quotations
  getMyQuotations,
  respondToQuotation,
  
  // Projects
  getClientProjects,
  getClientProject,
  
  // Invoices
  getClientInvoices,
  getClientInvoice,
  
  // Maintenance
  getClientAssets,
  getClientMaintenanceVisits,
  getClientMaintenanceContracts,
  
  // Support Messages
  getProjectMessages,
  sendMessage,
  markMessageRead,
  getUnreadCount,
  
  // Ratings
  checkRatingEligibility,
  submitProjectRating,
  getClientRatings,
};
