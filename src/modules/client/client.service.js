const repo = require('./client.repository');
const { notify, notifyRole } = require('../../utils/notify');
const { sendOtpEmail } = require('../../utils/mailer');

/**
 * Client Portal Service
 * Business logic for client-facing features
 * CRITICAL: All operations MUST validate client ownership
 */

// ============================================
// CLIENT PROFILE
// ============================================

/**
 * Get client profile
 */
async function getClientProfile(clientId) {
  const profile = await repo.getClientProfile(clientId);
  
  if (!profile) {
    const err = new Error('الملف الشخصي غير موجود');
    err.statusCode = 404;
    throw err;
  }
  
  return profile;
}

// ============================================
// QUOTATIONS
// ============================================

/**
 * Get all quotations for this client
 */
async function getMyQuotations(clientId) {
  const quotations = await repo.getMyQuotations(clientId);
  
  return quotations.map(q => ({
    ...q,
    total_amount: parseFloat(q.total_amount),
    down_payment_amount: parseFloat(q.down_payment_amount) || 0,
    monthly_amount: parseFloat(q.monthly_amount) || 0
  }));
}

/**
 * Client responds to quotation (accept/reject)
 * DELEGATED TO: quotations.service.clientRespondToQuotation
 * This ensures auto-project creation and transaction safety
 */
async function respondToQuotation(quotationId, clientId, response) {
  // Get client email for validation
  const clientEmail = await repo.getClientEmail(clientId);
  
  if (!clientEmail) {
    const err = new Error('البريد الإلكتروني غير موجود');
    err.statusCode = 400;
    throw err;
  }
  
  // Delegate to quotations service (has auto-project creation)
  const quotationsService = require('../quotations/quotations.service');
  const updatedQuotation = await quotationsService.clientRespondToQuotation(
    quotationId,
    clientEmail,
    response.status,
    response.rejection_reason
  );
  
  return updatedQuotation;
}

// ============================================
// PROJECTS
// ============================================

/**
 * Get all client projects
 */
async function getClientProjects(clientId) {
  const projects = await repo.getClientProjects(clientId);
  
  return projects.map(project => ({
    ...project,
    completion_percentage: parseFloat(project.completion_percentage) || 0,
    total_invoiced: parseFloat(project.total_invoiced) || 0,
    total_paid: parseFloat(project.total_paid) || 0,
    outstanding_amount: parseFloat(project.outstanding_amount) || 0
  }));
}

/**
 * Get single project with full details
 */
async function getClientProjectById(projectId, clientId) {
  // Verify project belongs to client
  const project = await repo.getClientProjectById(projectId, clientId);
  
  if (!project) {
    const err = new Error('المشروع غير موجود أو لا تملك صلاحية عرضه');
    err.statusCode = 404;
    throw err;
  }
  
  // Get tasks for this project
  const tasks = await repo.getProjectTasks(projectId, clientId);
  
  return {
    ...project,
    tasks
  };
}

// ============================================
// INVOICES
// ============================================

/**
 * Get all client invoices
 */
async function getClientInvoices(clientId) {
  const invoices = await repo.getClientInvoices(clientId);
  
  return invoices.map(invoice => ({
    ...invoice,
    total_amount: parseFloat(invoice.total_amount),
    paid_amount: parseFloat(invoice.paid_amount),
    outstanding_amount: parseFloat(invoice.total_amount - invoice.paid_amount)
  }));
}

/**
 * Get single invoice with payment history
 */
async function getClientInvoiceById(invoiceId, clientId) {
  const invoice = await repo.getClientInvoiceById(invoiceId, clientId);
  
  if (!invoice) {
    const err = new Error('الفاتورة غير موجودة أو لا تملك صلاحية عرضها');
    err.statusCode = 404;
    throw err;
  }
  
  // Get payments for this invoice
  const payments = await repo.getInvoicePayments(invoiceId, clientId);
  
  return {
    ...invoice,
    total_amount: parseFloat(invoice.total_amount),
    paid_amount: parseFloat(invoice.paid_amount),
    payments
  };
}

// ============================================
// MAINTENANCE
// ============================================

/**
 * Get client's installed assets
 */
async function getClientAssets(clientId) {
  return await repo.getClientAssets(clientId);
}

/**
 * Get client's maintenance visits
 */
async function getClientMaintenanceVisits(clientId) {
  return await repo.getClientMaintenanceVisits(clientId);
}

/**
 * Get client's maintenance contracts
 */
async function getClientMaintenanceContracts(clientId) {
  const contracts = await repo.getClientMaintenanceContracts(clientId);
  
  return contracts.map(contract => ({
    ...contract,
    value: parseFloat(contract.value),
    included_asset_ids: contract.included_asset_ids || []
  }));
}

// ============================================
// CLIENT SUPPORT MESSAGES (Chat with Sales Rep)
// ============================================

/**
 * Get support messages for a project
 */
async function getClientSupportMessages(projectId, clientId) {
  // Verify project belongs to client
  const project = await repo.getClientProjectById(projectId, clientId);
  
  if (!project) {
    const err = new Error('المشروع غير موجود أو لا تملك صلاحية عرضه');
    err.statusCode = 404;
    throw err;
  }
  
  if (!project.assigned_sales_rep_id) {
    const err = new Error('لا يوجد ممثل مبيعات معين لهذا المشروع');
    err.statusCode = 400;
    throw err;
  }
  
  return await repo.getClientSupportMessages(projectId, clientId);
}

/**
 * Send message to sales representative
 */
async function sendMessageToSalesRep(projectId, clientId, messageData) {
  // Verify project belongs to client
  const project = await repo.getClientProjectById(projectId, clientId);
  
  if (!project) {
    const err = new Error('المشروع غير موجود أو لا تملك صلاحية العرض');
    err.statusCode = 404;
    throw err;
  }
  
  if (!project.assigned_sales_rep_id) {
    const err = new Error('لا يوجد ممثل مبيعات معين لهذا المشروع');
    err.statusCode = 400;
    throw err;
  }
  
  if (!messageData.message || messageData.message.trim() === '') {
    const err = new Error('الرجاء كتابة رسالة');
    err.statusCode = 400;
    throw err;
  }
  
  // Create the message
  const newMessage = await repo.createClientSupportMessage({
    project_id: projectId,
    client_id: clientId,
    sales_rep_id: project.assigned_sales_rep_id,
    message: messageData.message.trim(),
    is_from_client: true,
    parent_message_id: messageData.parent_message_id || null
  });
  
  // Notify the sales representative
  try {
    await notify(project.assigned_sales_rep_id, {
      title: 'رسالة جديدة من العميل',
      message: `لديك رسالة جديدة من العميل بخصوص المشروع: ${project.name}`,
      type: 'info',
      entity_type: 'client_support_message',
      entity_id: newMessage.id,
    });
    
    // Also send email notification
    const salesRep = await repo.getClientProfile(project.assigned_sales_rep_id);
    if (salesRep && salesRep.email) {
      await sendOtpEmail(salesRep.email, `رسالة جديدة من العميل - ${project.name}`);
    }
  } catch (notifError) {
    console.error('Failed to send notification:', notifError.message);
  }
  
  return newMessage;
}

/**
 * Mark message as read
 */
async function markMessageAsRead(messageId, clientId) {
  const updated = await repo.markMessageAsRead(messageId, clientId);
  
  if (!updated) {
    const err = new Error('الرسالة غير موجودة');
    err.statusCode = 404;
    throw err;
  }
  
  return updated;
}

/**
 * Get unread message count
 */
async function getUnreadMessagesCount(clientId) {
  return await repo.getUnreadMessageCount(clientId);
}

// ============================================
// PROJECT RATINGS (30-Day Post-Delivery)
// ============================================

/**
 * Check if client can rate a project
 */
async function checkRatingEligibility(projectId, clientId) {
  const eligibility = await repo.canClientRateProject(projectId, clientId);
  
  if (!eligibility.can_rate) {
    const err = new Error(
      eligibility.reason === 'Already rated' 
        ? 'لقد قمت بتقييم هذا المشروع مسبقاً'
        : eligibility.reason === 'Too early'
          ? `يمكنك التقييم بعد ${eligibility.days_remaining} يوماً`
          : 'المشروع غير مؤهل للتقييم'
    );
    err.statusCode = 400;
    throw err;
  }
  
  return eligibility.project;
}

/**
 * Submit project rating
 */
async function submitProjectRating(projectId, clientId, ratingData) {
  // Validate rating
  if (!ratingData.rating || ratingData.rating < 1 || ratingData.rating > 5) {
    const err = new Error('التقييم يجب أن يكون بين 1 و 5 نجوم');
    err.statusCode = 400;
    throw err;
  }
  
  // Check eligibility
  const eligibility = await repo.canClientRateProject(projectId, clientId);
  
  if (!eligibility.can_rate) {
    const err = new Error(
      eligibility.reason === 'Already rated' 
        ? 'لقد قمت بتقييم هذا المشروع مسبقاً'
        : 'المشروع غير مؤهل للتقييم'
    );
    err.statusCode = 400;
    throw err;
  }
  
  // Create the rating
  const rating = await repo.createProjectRating({
    project_id: projectId,
    client_id: clientId,
    rating: ratingData.rating,
    comment: ratingData.comment || null,
    is_anonymous: ratingData.is_anonymous || false
  });
  
  // Notify general manager about the new rating
  try {
    const { notifyRole } = require('../../utils/notify');
    await notifyRole('general_manager', {
      title: 'تقييم جديد للمشروع',
      message: `قام العميل بتقييم المشروع بـ ${ratingData.rating} نجوم`,
      type: 'info',
      entity_type: 'project_rating',
      entity_id: rating.id,
    });
  } catch (notifError) {
    console.error('Failed to send notification:', notifError.message);
  }
  
  return rating;
}

/**
 * Get client's submitted ratings
 */
async function getClientRatings(clientId) {
  return await repo.getClientRatings(clientId);
}

module.exports = {
  // Profile
  getClientProfile,
  
  // Quotations
  getMyQuotations,
  respondToQuotation,
  
  // Projects
  getClientProjects,
  getClientProjectById,
  
  // Invoices
  getClientInvoices,
  getClientInvoiceById,
  
  // Maintenance
  getClientAssets,
  getClientMaintenanceVisits,
  getClientMaintenanceContracts,
  
  // Support Messages
  getClientSupportMessages,
  sendMessageToSalesRep,
  markMessageAsRead,
  getUnreadMessagesCount,
  
  // Ratings
  checkRatingEligibility,
  submitProjectRating,
  getClientRatings,
};
