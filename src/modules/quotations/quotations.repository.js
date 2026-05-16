const { query } = require('../../db');

async function createQuotation({
  inspection_report_id, lead_id, created_by, boq_data,
  total_price, discount, tax, details, comments, file_url
}) {
  const result = await query(
    `INSERT INTO quotations
       (inspection_report_id, lead_id, created_by, boq_data, total_price, 
        discount, tax, details, comments, file_url, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending_finance_review')
     RETURNING *`,
    [inspection_report_id, lead_id, created_by,
     JSON.stringify(boq_data || {}),
     total_price || 0, discount || 0, tax || 0,
     JSON.stringify(details || {}), comments, file_url || null]
  );
  return result.rows[0];
}

async function getQuotationById(id) {
  const result = await query(
    `SELECT q.*,
            COALESCE(q.lead_id, ir.lead_id) AS lead_id,
            l.client_name,
            l.contact_email,
            l.client_user_id,
            l.service_type,
            u.first_name AS created_by_first_name,
            u.last_name AS created_by_last_name
     FROM quotations q
     LEFT JOIN inspection_reports ir ON ir.id = q.inspection_report_id
     LEFT JOIN leads l ON l.id = COALESCE(q.lead_id, ir.lead_id)
     LEFT JOIN users u ON u.id = q.created_by
     WHERE q.id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

async function getQuotationsByLeadId(leadId) {
  const result = await query(
    `SELECT q.*,
            COALESCE(q.lead_id, ir.lead_id) AS lead_id,
            u.first_name AS created_by_first_name,
            u.last_name AS created_by_last_name
     FROM quotations q
     LEFT JOIN inspection_reports ir ON ir.id = q.inspection_report_id
     LEFT JOIN users u ON u.id = q.created_by
     WHERE COALESCE(q.lead_id, ir.lead_id) = $1
     ORDER BY q.created_at DESC`,
    [leadId]
  );
  return result.rows;
}

async function getAllQuotations(filters = {}) {
  let sql = `
    SELECT q.*,
           COALESCE(q.lead_id, ir.lead_id) AS resolved_lead_id,
           l.client_name,
           l.service_type,
           u.first_name AS created_by_first_name,
           u.last_name AS created_by_last_name
    FROM quotations q
    LEFT JOIN inspection_reports ir ON ir.id = q.inspection_report_id
    LEFT JOIN leads l ON l.id = COALESCE(q.lead_id, ir.lead_id)
    LEFT JOIN users u ON u.id = q.created_by
    WHERE 1=1
  `;

  const params = [];

  if (filters.status) {
    params.push(filters.status);
    sql += ` AND q.status = $${params.length}`;
  }

  if (filters.created_by) {
    params.push(filters.created_by);
    sql += ` AND q.created_by = $${params.length}`;
  }

  sql += ` ORDER BY q.created_at DESC`;

  const result = await query(sql, params);
  return result.rows;
}

async function updateQuotation(id, data) {
  const allowedFields = ['boq_data', 'total_price', 'discount', 'tax', 'details', 'comments', 'status'];
  const updates = [];
  const values = [];
  let paramCount = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramCount}`);
      if (typeof data[field] === 'object' && field !== 'status') {
        values.push(JSON.stringify(data[field]));
      } else {
        values.push(data[field]);
      }
      paramCount++;
    }
  }

  if (updates.length === 0) return getQuotationById(id);

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE quotations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

async function financeReview(id, action, rejectionComment, reviewerId) {
  let updateQuery, values;

  if (action === 'approve') {
    updateQuery = `
      UPDATE quotations 
      SET status = 'pending_gm_approval',
          finance_approved_by = $1,
          finance_approved_at = NOW(),
          rejection_comment = NULL,
          updated_at = NOW()
      WHERE id = $2 RETURNING *`;
    values = [reviewerId, id];
  } else if (action === 'reject') {
    updateQuery = `
      UPDATE quotations 
      SET status = 'finance_rejected',
          rejection_comment = $1,
          updated_at = NOW()
      WHERE id = $2 RETURNING *`;
    values = [rejectionComment, id];
  }

  const result = await query(updateQuery, values);
  return result.rows[0] || null;
}

async function gmReview(id, action, rejectionComment, reviewerId) {
  let updateQuery, values;

  if (action === 'approve') {
    updateQuery = `
      UPDATE quotations 
      SET status = 'gm_approved',
          gm_approved_by = $1,
          gm_approved_at = NOW(),
          rejection_comment = NULL,
          updated_at = NOW()
      WHERE id = $2 RETURNING *`;
    values = [reviewerId, id];
  } else if (action === 'reject') {
    updateQuery = `
      UPDATE quotations 
      SET status = 'gm_rejected',
          rejection_comment = $1,
          updated_at = NOW()
      WHERE id = $2 RETURNING *`;
    values = [rejectionComment, id];
  }

  const result = await query(updateQuery, values);
  return result.rows[0] || null;
}

async function approveForClient(id) {
  const result = await query(
    `UPDATE quotations 
     SET status = 'approved_for_client',
         approved_by = (SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'general_manager') LIMIT 1),
         approved_at = NOW(),
         updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

async function deleteQuotation(id) {
  const result = await query(
    `UPDATE quotations SET status = 'draft' WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  createQuotation,
  getQuotationById,
  getQuotationsByLeadId,
  getAllQuotations,
  updateQuotation,
  financeReview,
  gmReview,
  approveForClient,
  deleteQuotation
};