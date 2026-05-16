const interactionsRepo = require('./lead-interactions.repository');
const leadsRepo = require('./leads.repository');
const departmentsRepo = require('../departments/departments.repository');
const notificationsRepo = require('../notifications/notifications.repository');

/**
 * Create interaction for a lead
 */
async function createInteraction(leadId, data, performedBy) {
  // Verify lead exists
  const lead = await leadsRepo.getLeadById(leadId);
  if (!lead) {
    const err = new Error('العميل المحتمل غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Create interaction
  const interaction = await interactionsRepo.createInteraction({
    lead_id: leadId,
    interaction_type: data.interaction_type,
    description: data.description,
    performed_by: performedBy,
    next_follow_up_date: data.next_follow_up_date || null
  });

  return interaction;
}

/**
 * Get all interactions for a lead
 */
async function getInteractionsByLeadId(leadId) {
  // Verify lead exists
  const lead = await leadsRepo.getLeadById(leadId);
  if (!lead) {
    const err = new Error('العميل المحتمل غير موجود');
    err.statusCode = 404;
    throw err;
  }

  return interactionsRepo.getInteractionsByLeadId(leadId);
}

/**
 * Request technical survey for a lead
 * Changes status to 'survey_requested' and notifies technical department
 */
async function requestTechnicalSurvey(leadId, requestedBy) {
  const lead = await leadsRepo.getLeadById(leadId);
  if (!lead) {
    const err = new Error('العميل المحتمل غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Check if lead has technical department assigned
  if (!lead.technical_dept_id) {
    const err = new Error('يجب تعيين قسم فني قبل طلب المعاينة');
    err.statusCode = 400;
    throw err;
  }

  // Check current status allows survey request
  const allowedStatuses = ['new', 'contacted'];
  if (!allowedStatuses.includes(lead.status)) {
    const err = new Error(`لا يمكن طلب معاينة لعميل محتمل بهذه الحالة (${lead.status})`);
    err.statusCode = 400;
    throw err;
  }

  // Update lead status
  const updatedLead = await leadsRepo.updateLeadStatus(leadId, 'survey_requested');

  // Get technical department details to find department head
  const dept = await departmentsRepo.getDepartmentById(lead.technical_dept_id);
  
  console.log('[Survey Request] Lead:', leadId, 'Technical Dept ID:', lead.technical_dept_id);
  console.log('[Survey Request] Department:', dept);
  
  if (dept && dept.head_id) {
    console.log('[Survey Request] Creating notification for Dept Head ID:', dept.head_id);
    
    // Create notification for department head
    const notification = await notificationsRepo.createNotification({
      user_id: dept.head_id,
      title: 'طلب معاينة فنية جديد',
      message: `تم طلب معاينة للعميل: ${lead.client_name}`,
      type: 'info',
      entity_type: 'lead',
      entity_id: leadId
    });
    
    console.log('[Survey Request] Notification created:', notification);
  } else {
    console.warn('[Survey Request] No department head found for dept ID:', lead.technical_dept_id);
  }

  return updatedLead;
}

/**
 * Get upcoming follow-ups
 */
async function getUpcomingFollowUps(daysAhead = 3) {
  return interactionsRepo.getUpcomingFollowUps(daysAhead);
}

module.exports = {
  createInteraction,
  getInteractionsByLeadId,
  requestTechnicalSurvey,
  getUpcomingFollowUps
};
