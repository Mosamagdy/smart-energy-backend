const { query } = require('../../db');

/**
 * Create a new lead with technical department assignment
 */
async function createLead({
  owner_id, client_name, contact_email, contact_phone,
  service_type, location, source, priority, estimated_value, notes,
  technical_dept_id, assigned_engineer_id, status
}) {
  const result = await query(
    `INSERT INTO leads
       (owner_id, client_name, contact_email, contact_phone,
        service_type, location, source, priority, estimated_value, notes,
        technical_dept_id, assigned_engineer_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, COALESCE($13, 'new'))
     RETURNING *`,
    [owner_id, client_name, contact_email, contact_phone,
     service_type, location, source, priority || 'medium',
     estimated_value || 0, notes, technical_dept_id || null,
     assigned_engineer_id || null, status || 'new']
  );
  return result.rows[0];
}

/**
 * Get all leads with owner info + engineer name + dept name + optional filters
 * CRITICAL: Department isolation ONLY applies to users in technical departments
 * Sales/Management/Quotation Specialists see ALL leads
 */
async function getAllLeads({ status, priority, owner_id, user_role, user_department_id, user_id } = {}) {
  let sql = `
    SELECT
      l.*,
      -- Owner (creator)
      u.first_name  AS owner_first_name,
      u.last_name   AS owner_last_name,
      u.email       AS owner_email,
      -- Assigned sales rep
      sr.first_name || ' ' || sr.last_name AS assigned_sales_rep_name,
      sr.email AS assigned_sales_rep_email,
      sr.phone AS assigned_sales_rep_phone,
      -- Assigned engineer
      eng.first_name || ' ' || eng.last_name AS assigned_engineer_name,
      eng.email AS assigned_engineer_email,
      eng.phone AS assigned_engineer_phone,
      -- Technical department
      d.name AS technical_dept_name
    FROM leads l
    LEFT JOIN users u   ON u.id  = l.owner_id
    LEFT JOIN users sr  ON sr.id = l.assigned_sales_rep_id
    LEFT JOIN users eng ON eng.id = l.assigned_engineer_id
    LEFT JOIN departments d ON d.id = l.technical_dept_id
    WHERE 1=1
  `;
  const params = [];

  // ───────────────────────────────────────────────────────────────────────────
  // CRM SCOPING
  // ───────────────────────────────────────────────────────────────────────────

  // sales_rep: بيشوف بس الـ leads المعين عليها
  if (user_role === 'sales_rep') {
    if (!user_id) {
      console.warn('[Leads Repo] sales_rep without user_id; returning empty set for safety');
      return [];
    }
    params.push(user_id);
    sql += ` AND l.assigned_sales_rep_id = $${params.length}`;
  }

  // sales_manager: بيشوف بس الـ leads اللي هو owner عليها
  if (user_role === 'sales_manager') {
    if (!user_id) {
      console.warn('[Leads Repo] sales_manager without user_id; returning empty set for safety');
      return [];
    }
    params.push(user_id);
    sql += ` AND l.owner_id = $${params.length}`;
  }

  // ✅ FIX: tech_head بيشوف بس الـ leads بتاعة قسمه الفني فقط
  if (user_role === 'tech_head') {
    if (!user_department_id) {
      console.warn('[Leads Repo] tech_head without department_id; returning empty set for safety');
      return [];
    }
    // تأكد إن القسم فعلاً technical
    const deptResult = await query(
      `SELECT dept_type FROM departments WHERE id = $1`,
      [user_department_id]
    );

    if (deptResult.rows.length > 0 && deptResult.rows[0].dept_type === 'technical') {
      params.push(user_department_id);
      sql += ` AND l.technical_dept_id = $${params.length}`;
      console.log('[Leads Repo] tech_head isolation: filtering by dept_id =', user_department_id);
    } else {
      // القسم مش technical — ارجع فاضي للأمان
      console.warn('[Leads Repo] tech_head department is not technical; returning empty set');
      return [];
    }
  }

  // dept_head: نفس منطق tech_head — بس للـ dept_head العادي
  if (user_role === 'dept_head' && user_department_id) {
    const deptResult = await query(
      `SELECT dept_type FROM departments WHERE id = $1`,
      [user_department_id]
    );

    if (deptResult.rows.length > 0 && deptResult.rows[0].dept_type === 'technical') {
      params.push(user_department_id);
      sql += ` AND l.technical_dept_id = $${params.length}`;
      console.log('[Leads Repo] dept_head (technical) isolation: filtering by dept_id =', user_department_id);
    }
    // لو مش technical — يشوف كل الـ leads (sales dept head مثلاً)
  }

  if (status) {
    params.push(status);
    sql += ` AND l.status = $${params.length}`;
  }
  if (priority) {
    params.push(priority);
    sql += ` AND l.priority = $${params.length}`;
  }
  if (owner_id) {
    params.push(owner_id);
    sql += ` AND l.owner_id = $${params.length}`;
  }

  sql += ` ORDER BY l.created_at DESC`;
  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get single lead by id with owner + engineer + dept names
 */
async function getLeadById(id) {
  const result = await query(
    `SELECT
       l.*,
       -- Owner (creator)
       u.first_name  AS owner_first_name,
       u.last_name   AS owner_last_name,
       u.email       AS owner_email,
       -- Assigned sales rep
       sr.first_name || ' ' || sr.last_name AS assigned_sales_rep_name,
       sr.email AS assigned_sales_rep_email,
       sr.phone AS assigned_sales_rep_phone,
       -- Assigned engineer name
       eng.first_name || ' ' || eng.last_name AS assigned_engineer_name,
       eng.email AS assigned_engineer_email,
       eng.phone AS assigned_engineer_phone,
       -- Technical department name
       d.name AS technical_dept_name,
       -- Inspection report ID (for quotation creation)
       ir.id AS inspection_report_id
     FROM leads l
     LEFT JOIN users u   ON u.id   = l.owner_id
     LEFT JOIN users sr  ON sr.id  = l.assigned_sales_rep_id
     LEFT JOIN users eng ON eng.id = l.assigned_engineer_id
     LEFT JOIN departments d ON d.id = l.technical_dept_id
     LEFT JOIN inspection_reports ir ON ir.lead_id = l.id
     WHERE l.id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get leads assigned to a specific user (Engineer or Sales Rep)
 */
async function getAssignedLeads(userId, role) {
  let sql = `
    SELECT
      l.*,
      u.first_name || ' ' || u.last_name AS owner_name,
      d.name AS technical_dept_name
    FROM leads l
    LEFT JOIN users u ON u.id = l.owner_id
    LEFT JOIN departments d ON d.id = l.technical_dept_id
    WHERE 1=1
  `;
  const params = [];

  if (role === 'engineer') {
    params.push(userId);
    sql += ` AND l.assigned_engineer_id = $${params.length}`;
    params.push('inspection_assigned');
    sql += ` AND l.status = $${params.length}`;
  } else if (role === 'sales_rep') {
    params.push(userId);
    sql += ` AND l.assigned_sales_rep_id = $${params.length}`;
  } else if (role === 'quotation_specialist') {
    sql += ` AND l.status = 'inspection_completed'`;
    sql += ` AND EXISTS (
      SELECT 1 FROM inspection_reports ir 
      WHERE ir.lead_id = l.id
    )`;
    sql += ` AND NOT EXISTS (
      SELECT 1 FROM quotations q
      JOIN inspection_reports ir ON ir.id = q.inspection_report_id
      WHERE ir.lead_id = l.id
    )`;
  } else if (role === 'admin') {
    sql += ` AND l.status IN ('new', 'inspection_scheduled', 'inspection_completed', 'quotation_pending')`;
  } else {
    return [];
  }

  sql += ` ORDER BY l.created_at DESC`;
  const result = await query(sql, params);
  return result.rows;
}

/**
 * Update lead info
 */
async function updateLead(id, {
  client_name, contact_email, contact_phone,
  service_type, location, source, priority, estimated_value, notes
}) {
  const result = await query(
    `UPDATE leads SET
       client_name     = COALESCE($1,  client_name),
       contact_email   = COALESCE($2,  contact_email),
       contact_phone   = COALESCE($3,  contact_phone),
       service_type    = COALESCE($4,  service_type),
       location        = COALESCE($5,  location),
       source          = COALESCE($6,  source),
       priority        = COALESCE($7,  priority),
       estimated_value = COALESCE($8,  estimated_value),
       notes           = COALESCE($9,  notes)
     WHERE id = $10
     RETURNING *`,
    [client_name, contact_email, contact_phone,
     service_type, location, source, priority,
     estimated_value, notes, id]
  );
  return result.rows[0] || null;
}

/**
 * Update lead status only
 */
async function updateLeadStatus(id, status) {
  const result = await query(
    `UPDATE leads SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0] || null;
}

/**
 * Assign sales rep to lead
 */
async function assignSalesRep(id, sales_rep_id) {
  const { rows } = await query(
    `UPDATE leads 
     SET assigned_sales_rep_id = $2,
         status = CASE 
           WHEN status IN ('new', 'contacted') THEN 'contacted'
           ELSE status
         END,
         updated_at = NOW() 
     WHERE id = $1 
     RETURNING *`,
    [id, sales_rep_id]
  );
  return rows[0];
}

/**
 * Remove sales rep from lead (set to NULL)
 */
async function removeSalesRep(id) {
  const { rows } = await query(
    `UPDATE leads 
     SET assigned_sales_rep_id = NULL,
         status = 'new',
         updated_at = NOW() 
     WHERE id = $1 
     RETURNING *`,
    [id]
  );
  return rows[0];
}

/**
 * Assign engineer to lead for inspection
 */
async function assignEngineer(id, engineer_id) {
  const result = await query(
    `UPDATE leads 
     SET assigned_engineer_id = $1, 
         status = 'inspection_assigned'
     WHERE id = $2 
     RETURNING *`,
    [engineer_id, id]
  );
  return result.rows[0] || null;
}

/**
 * Remove engineer from lead (set to NULL)
 */
async function removeEngineer(id) {
  const result = await query(
    `UPDATE leads 
     SET assigned_engineer_id = NULL,
         status = 'survey_requested',
         updated_at = NOW() 
     WHERE id = $1 
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Update rejection comment
 */
async function updateRejectionComment(id, rejectionComment) {
  const result = await query(
    `UPDATE leads 
     SET rejection_comment = $1,
         updated_at = NOW()
     WHERE id = $2 
     RETURNING *`,
    [rejectionComment, id]
  );
  return result.rows[0] || null;
}

/**
 * Delete lead
 */
async function deleteLead(id) {
  await query(`DELETE FROM leads WHERE id = $1`, [id]);
}

/**
 * Customer statement of account by lead
 */
async function getCustomerStatementByLeadId(leadId) {
  const leadResult = await query(
    `SELECT id, client_name, receivable_account_id
     FROM leads
     WHERE id = $1
     LIMIT 1`,
    [leadId]
  );

  const lead = leadResult.rows[0];
  if (!lead || !lead.receivable_account_id) return null;

const entriesResult = await query(
    `SELECT
       je.entry_date AS date,
       COALESCE(je.entry_number::text, 'JE-' || je.id::text) AS reference_no,
       je.reference_type,
       jl.debit_amount AS debit,
       jl.credit_amount AS credit
     FROM journal_entry_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     WHERE jl.account_id = $1
     ORDER BY je.entry_date ASC, je.id ASC, jl.id ASC`,
    [lead.receivable_account_id]
  );

  return {
    lead_id: lead.id,
    client_name: lead.client_name,
    receivable_account_id: lead.receivable_account_id,
    entries: entriesResult.rows
  };
}

module.exports = {
  createLead,
  getAllLeads,
  getLeadById,
  getAssignedLeads,
  updateLead,
  updateLeadStatus,
  assignSalesRep,
  removeSalesRep,
  assignEngineer,
  removeEngineer,
  updateRejectionComment,
  deleteLead,
  getCustomerStatementByLeadId,
};