const { query } = require('../../db');

/**
 * Create inspection report
 * - Called by assigned engineer
 * - Uploads measurements, photos, technical notes
 * - Auto-notifies quotations department
 */
async function createInspectionReport({
  inspection_id,
  report_by,
  summary,
  measurements,
  required_materials,
  photos,
  technical_notes
}) {
  const result = await query(
    `INSERT INTO inspection_reports
       (inspection_id, report_by, summary, measurements, 
        required_materials, photos, technical_notes, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')
     RETURNING *`,
    [inspection_id, report_by, summary, 
     JSON.stringify(measurements || {}),
     JSON.stringify(required_materials || []),
     JSON.stringify(photos || []),
     technical_notes]
  );
  return result.rows[0];
}

/**
 * Get inspection report by ID with lead and inspection details
 */
async function getInspectionReportById(id) {
  const result = await query(
    `SELECT ir.*,
            i.lead_id,
            l.client_name,
            l.service_type,
            u.first_name AS engineer_first_name,
            u.last_name AS engineer_last_name
     FROM inspection_reports ir
     JOIN inspections i ON i.id = ir.inspection_id
     JOIN leads l ON l.id = i.lead_id
     LEFT JOIN users u ON u.id = ir.report_by
     WHERE ir.id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get inspection report by lead ID
 */
async function getInspectionReportByLeadId(leadId) {
  const result = await query(
    `SELECT ir.*,
            i.id AS inspection_id,
            l.client_name,
            u.first_name AS engineer_first_name,
            u.last_name AS engineer_last_name
     FROM inspection_reports ir
     JOIN inspections i ON i.id = ir.inspection_id
     JOIN leads l ON l.id = i.lead_id
     LEFT JOIN users u ON u.id = ir.report_by
     WHERE l.id = $1
     LIMIT 1`,
    [leadId]
  );
  return result.rows[0] || null;
}

/**
 * Update inspection report
 */
async function updateInspectionReport(id, data) {
  const allowedFields = ['summary', 'measurements', 'required_materials', 'photos', 'technical_notes'];
  const updates = [];
  const values = [];
  let paramCount = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramCount}`);
      if (typeof data[field] === 'object') {
        values.push(JSON.stringify(data[field]));
      } else {
        values.push(data[field]);
      }
      paramCount++;
    }
  }

  if (updates.length === 0) {
    return getInspectionReportById(id);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE inspection_reports SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

/**
 * Delete inspection report (soft delete by setting status to draft)
 */
async function deleteInspectionReport(id) {
  const result = await query(
    `UPDATE inspection_reports SET status = 'draft' WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  createInspectionReport,
  getInspectionReportById,
  getInspectionReportByLeadId,
  updateInspectionReport,
  deleteInspectionReport,
};
