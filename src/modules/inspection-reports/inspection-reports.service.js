const repo = require('./inspection-reports.repository');
const { notifyRole } = require('../../utils/notify');
const { query } = require('../../db');

/**
 * Create inspection report and trigger quotation workflow
 * - Validates engineer is assigned to this lead
 * - Creates report with measurements and photos
 * - Auto-notifies quotations department
 * - Updates lead status to 'inspection_completed'
 */
async function createInspectionReport(data, userId) {
  // Validate required fields
  if (!data.inspection_id) {
    const err = new Error('معرّف المعاينة مطلوب');
    err.statusCode = 400;
    throw err;
  }

  if (!data.summary) {
    const err = new Error('ملخص التقرير مطلوب');
    err.statusCode = 400;
    throw err;
  }

  // Get inspection details to verify lead
  const { rows: [inspection] } = await query(
    `SELECT i.*, l.id AS lead_id, l.client_name, l.service_type
     FROM inspections i
     JOIN leads l ON i.lead_id = l.id
     WHERE i.id = $1`,
    [data.inspection_id]
  );

  if (!inspection) {
    const err = new Error('المعاينة غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  // Verify user is the assigned engineer OR has dept_head role
  const { rows: [user] } = await query(
    `SELECT u.*, r.name AS role_name, u.department_id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [userId]
  );

  const userRole = (user?.role_name || '').toLowerCase();
  
  const isAssignedEngineer = Number(inspection.assigned_engineer_id) === Number(userId);
  const isTechnicalDeptHead = userRole === 'dept_head';
  
  if (!isAssignedEngineer && !isTechnicalDeptHead) {
    const err = new Error('غير مصرّح لك برفع هذا التقرير');
    err.statusCode = 403;
    throw err;
  }

  // Check if report already exists for this inspection
  const { rows: [existingReport] } = await query(
    `SELECT * FROM inspection_reports WHERE inspection_id = $1`,
    [data.inspection_id]
  );

  let report;
  if (existingReport) {
    // Update existing report
    report = await repo.updateInspectionReport(existingReport.id, {
      summary: data.summary,
      measurements: data.measurements || {},
      required_materials: data.required_materials || [],
      photos: data.photos || [],
      technical_notes: data.technical_notes || '',
      updated_by: userId
    });
  } else {
    // Create new report
    report = await repo.createInspectionReport({
      inspection_id: data.inspection_id,
      report_by: userId,
      summary: data.summary,
      measurements: data.measurements || {},
      required_materials: data.required_materials || [],
      photos: data.photos || [],
      technical_notes: data.technical_notes || ''
    });
  }

  // Update inspection status from 'pending' to 'completed'
  await query(
    `UPDATE inspections 
     SET status = 'completed', updated_at = NOW()
     WHERE id = $1`,
    [data.inspection_id]
  );

  // Get lead details for notification
  const { rows: [lead] } = await query(
    `SELECT l.id, l.client_name, l.service_type 
     FROM leads l
     JOIN inspections i ON i.lead_id = l.id
     WHERE i.id = $1`,
    [data.inspection_id]
  );

  // Update lead status to inspection_completed
  await query(
    `UPDATE leads 
     SET status = 'inspection_completed', updated_at = NOW()
     WHERE id = $1`,
    [lead?.id]
  );

  // Auto-notify quotations department to prepare BOQ
  await notifyRole('quotation_specialist', {
    title: 'تقرير معاينة جاهز',
    message: `تم الانتهاء من معاينة العميل ${lead?.client_name || 'العميل'} — يرجى إعداد عرض السعر`,
    type: 'warning',
    entity_type: 'inspection_report',
    entity_id: report.id
  });

  // Notify general manager
  await notifyRole('general_manager', {
    title: 'تم الانتهاء من المعاينة',
    message: `تم الانتهاء من معاينة العميل ${lead?.client_name || 'العميل'} وجاري إعداد عرض السعر`,
    type: 'info',
    entity_type: 'inspection_report',
    entity_id: report.id
  });

  return report;
}


/**
 * Get inspection report by ID
 */
async function getInspectionReportById(id) {
  const report = await repo.getInspectionReportById(id);
  if (!report) {
    const err = new Error('تقرير المعاينة غير موجود');
    err.statusCode = 404;
    throw err;
  }
  return report;
}

/**
 * Get inspection report by lead ID
 */
async function getInspectionReportByLeadId(leadId) {
  return await repo.getInspectionReportByLeadId(leadId);
}

/**
 * Update inspection report
 * - Only allow updates before quotation is created
 */
async function updateInspectionReport(id, data, userId) {
  const report = await repo.getInspectionReportById(id);
  if (!report) {
    const err = new Error('تقرير المعاينة غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Check if quotation already exists for this inspection
  const { rows: [quotation] } = await query(
    `SELECT id FROM quotations WHERE inspection_report_id = $1 LIMIT 1`,
    [id]
  );

  if (quotation) {
    const err = new Error('لا يمكن تعديل تقرير المعاينة بعد إنشاء عرض السعر');
    err.statusCode = 400;
    throw err;
  }

  // Verify user is authorized to update
  const { rows: [user] } = await query(
    `SELECT u.*, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [userId]
  );

  const userRole = (user?.role_name || '').toLowerCase();
  const canUpdate = 
    Number(report.report_by) === Number(userId) ||
    ['super_admin', 'general_manager', 'dept_head'].includes(userRole);

  if (!canUpdate) {
    const err = new Error('غير مصرّح لك بتعديل هذا التقرير');
    err.statusCode = 403;
    throw err;
  }

  return await repo.updateInspectionReport(id, data);
}

/**
 * Delete inspection report (soft delete)
 */
async function deleteInspectionReport(id, userId) {
  const report = await repo.getInspectionReportById(id);
  if (!report) {
    const err = new Error('تقرير المعاينة غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Check authorization
  const { rows: [user] } = await query(
    `SELECT u.*, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [userId]
  );

  const userRole = (user?.role_name || '').toLowerCase();
  if (!['super_admin', 'general_manager'].includes(userRole)) {
    const err = new Error('غير مصرّح لك بحذف هذا التقرير');
    err.statusCode = 403;
    throw err;
  }

  return await repo.deleteInspectionReport(id);
}

module.exports = {
  createInspectionReport,
  getInspectionReportById,
  getInspectionReportByLeadId,
  updateInspectionReport,
  deleteInspectionReport
};
