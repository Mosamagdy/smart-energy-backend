const reportsRepo = require('./inspection-reports.repository');
const leadsRepo = require('./leads.repository');
const { query } = require('../../db');
const { sendNotification } = require('../../services/socket.service');

/**
 * Create inspection report for a lead
 */
async function createReport(leadId, data, userId) {
  // Verify lead exists
  const lead = await leadsRepo.getLeadById(leadId);
  if (!lead) {
    const err = new Error('العميل المحتمل غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Create report
  const report = await reportsRepo.createReport({
    lead_id: leadId,
    user_id: userId,
    report_text: data.report_text,
    file_url: data.file_url,
    images_urls: data.images_urls || []
  });

  // Update lead status to inspection_completed
  try {
    await query(
      `UPDATE leads SET status = 'inspection_completed', updated_at = NOW() WHERE id = $1`,
      [leadId]
    );
    console.log(`[Inspection Report] Updated lead ${leadId} status to inspection_completed`);
  } catch (statusError) {
    console.error('[Inspection Report] Failed to update lead status:', statusError.message);
  }

  // Notify ALL Administrative heads (dept_head) and GM when report is uploaded
  try {
    const { rows: adminUsers } = await query(`
      SELECT u.id, u.full_name, u.email, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name IN ('dept_head', 'general_manager', 'super_admin')
    `);

    if (adminUsers && adminUsers.length > 0) {
      const notificationData = {
        title: 'تقرير معاينة جديد',
        message: `تم رفع تقرير معاينة جديد للعميل "${lead.client_name}" بواسطة ${report.created_by_name || 'المهندس'}`,
        entity_type: 'lead',
        entity_id: leadId,
        notification_type: 'inspection_report_uploaded',
        priority: 'high'
      };

      // Send notification to each admin user
      for (const admin of adminUsers) {
        await sendNotification(admin.id, 'system', {
          ...notificationData,
          badge_count: 1
        });
        
        console.log(`[Inspection Report] Notified admin ${admin.full_name} (${admin.role_name}) about new report for lead ${leadId}`);
      }
    }
  } catch (notificationError) {
    // Don't fail the report creation if notification fails
    console.error('[Inspection Report] Failed to send admin notifications:', notificationError.message);
  }

  // Notify ALL Quotation Specialists to prepare quotation
  try {
    const { rows: quotationSpecialists } = await query(`
      SELECT u.id, u.full_name, u.email, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'quotation_specialist'
    `);

    if (quotationSpecialists && quotationSpecialists.length > 0) {
      const quotationNotification = {
        title: 'تقرير معاينة جاهز لإنشاء عرض السعر',
        message: `تقرير معاينة جديد جاهز للعميل "${lead.client_name}". يرجى إعداد عرض السعر.`,
        entity_type: 'lead',
        entity_id: leadId,
        notification_type: 'quotation_ready',
        priority: 'high'
      };

      // Send notification to each quotation specialist
      for (const specialist of quotationSpecialists) {
        await sendNotification(specialist.id, 'system', {
          ...quotationNotification,
          badge_count: 1
        });
        
        console.log(`[Inspection Report] Notified quotation specialist ${specialist.full_name} about lead ${leadId}`);
      }
    }
  } catch (quotationNotificationError) {
    console.error('[Inspection Report] Failed to notify quotation specialists:', quotationNotificationError.message);
  }

  return report;
}

/**
 * Get all reports for a lead
 */
async function getReportsByLeadId(leadId) {
  // Verify lead exists
  const lead = await leadsRepo.getLeadById(leadId);
  if (!lead) {
    const err = new Error('العميل المحتمل غير موجود');
    err.statusCode = 404;
    throw err;
  }

  return reportsRepo.getReportsByLeadId(leadId);
}

/**
 * Delete a report (only by uploader)
 */
async function deleteReport(reportId, userId) {
  const report = await reportsRepo.getReportById(reportId);
  if (!report) {
    const err = new Error('التقرير غير موجود');
    err.statusCode = 404;
    throw err;
  }

  if (report.user_id !== userId) {
    const err = new Error('غير مصرح لك بحذف هذا التقرير');
    err.statusCode = 403;
    throw err;
  }

  return reportsRepo.deleteReport(reportId, userId);
}

module.exports = {
  createReport,
  getReportsByLeadId,
  deleteReport
};
