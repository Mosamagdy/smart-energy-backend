const { query } = require('../../db');

/**
 * Create a new inspection report
 */
async function createReport({ lead_id, user_id, report_text, file_url, images_urls }) {
  const result = await query(
    `INSERT INTO inspection_reports (lead_id, user_id, report_text, file_url, images_urls)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [lead_id, user_id, report_text || null, file_url || null, JSON.stringify(images_urls || [])]
  );
  return result.rows[0];
}

/**
 * Get all reports for a lead with uploader info
 */
async function getReportsByLeadId(leadId) {
  const result = await query(
    `SELECT 
       r.*,
       u.first_name || ' ' || u.last_name AS uploader_name,
       u.email AS uploader_email,
       ur.name AS uploader_role
     FROM inspection_reports r
     LEFT JOIN users u ON u.id = r.user_id
     LEFT JOIN roles ur ON ur.id = u.role_id
     WHERE r.lead_id = $1
     ORDER BY r.created_at DESC`,
    [leadId]
  );
  return result.rows;
}

/**
 * Get single report by ID
 */
async function getReportById(id) {
  const result = await query(
    `SELECT * FROM inspection_reports WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Delete a report
 */
async function deleteReport(id, userId) {
  const result = await query(
    `DELETE FROM inspection_reports 
     WHERE id = $1 AND user_id = $2 
     RETURNING *`,
    [id, userId]
  );
  return result.rows[0] || null;
}

module.exports = {
  createReport,
  getReportsByLeadId,
  getReportById,
  deleteReport
};
