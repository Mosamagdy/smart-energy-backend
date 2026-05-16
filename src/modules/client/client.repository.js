const { query } = require('../../db');

/**
 * Client Portal Repository
 * CRITICAL: All queries MUST filter by client_id to ensure data isolation
 * Clients can ONLY see their own data - never expose other clients' information
 */

// ============================================
// CLIENT PROFILE
// ============================================

/**
 * Get client profile by user ID
 */
async function getClientProfile(clientId) {
  const sql = `
    SELECT 
      u.id,
      u.email,
      u.username,
      u.first_name,
      u.last_name,
      u.phone,
      u.status,
      u.created_at,
      r.name AS role_name
    FROM users u
    INNER JOIN roles r ON u.role_id = r.id
    WHERE u.id = $1 AND r.name = 'client';
  `;
  
  const result = await query(sql, [clientId]);
  return result.rows[0];
}

// ============================================
// CLIENT PROJECTS (Strictly filtered by client_id)
// ============================================

/**
 * Get all projects for a specific client ONLY
 */
async function getClientProjects(clientId) {
  const sql = `
    SELECT 
      p.id,
      p.name AS project_name,
      p.description,
      p.status,
      p.total_budget, 
      p.created_at,
      q.id AS quotation_reference, 
      l.client_name,
      d.name AS department_name,
      COUNT(DISTINCT t.id) AS total_tasks,
      COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') AS completed_tasks,
      ROUND(
        COALESCE(
          (COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') * 100.0) / 
          NULLIF(COUNT(DISTINCT t.id), 0)
        , 0)
      , 2) AS completion_percentage
    FROM projects p
    LEFT JOIN quotations q ON p.quotation_id = q.id
    LEFT JOIN leads l ON p.lead_id = l.id 
    LEFT JOIN departments d ON p.department_id = d.id
    LEFT JOIN tasks t ON p.id = t.project_id
    -- الربط باستخدام contact_email كما طلبت
    WHERE LOWER(l.contact_email) = (SELECT LOWER(email) FROM users WHERE id = $1)
    GROUP BY p.id, q.id, l.client_name, d.name
    ORDER BY p.created_at DESC;
  `;
  
  const result = await query(sql, [clientId]);
  return result.rows;
}

/**
 * Get single project by ID - STRICTLY filtered by client_id
 */
async function getClientProjectById(projectId, clientId) {
  const sql = `
    SELECT 
      p.*,
      q.id AS quotation_id,
      q.total_price AS quotation_total,
      q.status AS quotation_status,
      l.contact_email,
      l.client_name,
      d.name AS department_name,
      u.first_name || ' ' || u.last_name AS assigned_sales_rep_name,
      u.email AS assigned_sales_rep_email,
      u.phone AS assigned_sales_rep_phone
    FROM projects p
    LEFT JOIN quotations q ON p.quotation_id = q.id
    LEFT JOIN leads l ON COALESCE(p.lead_id, q.lead_id) = l.id
    LEFT JOIN departments d ON p.department_id = d.id
    LEFT JOIN users u ON p.assigned_sales_rep_id = u.id
    WHERE p.id = $1
      AND LOWER(l.contact_email) = (SELECT LOWER(email) FROM users WHERE id = $2);
  `;

  const result = await query(sql, [projectId, clientId]);
  return result.rows[0];
}

/**
 * Get project tasks - filtered by project and client
 */
async function getProjectTasks(projectId, clientId) {
  const sql = `
    SELECT 
      t.*,
      u.first_name || ' ' || u.last_name AS assigned_to_name
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    INNER JOIN projects p ON t.project_id = p.id
    WHERE t.project_id = $1 AND p.client_id = $2
    ORDER BY t.due_date DESC;
  `;
  
  const result = await query(sql, [projectId, clientId]);
  return result.rows;
}

// ============================================
// CLIENT INVOICES (Strictly filtered by client_id)
// ============================================

/**
 * Get all invoices for a specific client ONLY
 */
async function getClientInvoices(clientId) {
  const sql = `
    SELECT 
      i.*,
      p.name AS project_name,
      c.contract_number
    FROM invoices i
    LEFT JOIN projects p ON i.project_id = p.id
    LEFT JOIN contracts c ON i.contract_id = c.id
    WHERE i.client_id = $1
    ORDER BY i.issue_date DESC;
  `;
  
  const result = await query(sql, [clientId]);
  return result.rows;
}

/**
 * Get single invoice by ID - STRICTLY filtered by client_id
 */
async function getClientInvoiceById(invoiceId, clientId) {
  const sql = `
    SELECT 
      i.*,
      p.name AS project_name,
      c.contract_number,
      json_agg(
        json_build_object(
          'id', je.id,
          'entry_number', je.entry_number,
          'description', je.description,
          'entry_date', je.entry_date
        )
      ) FILTER (WHERE je.id IS NOT NULL) AS journal_entries
    FROM invoices i
    LEFT JOIN projects p ON i.project_id = p.id
    LEFT JOIN contracts c ON i.contract_id = c.id
    LEFT JOIN journal_entries je ON 
      je.reference_type = 'invoice' AND je.reference_id = i.id
    WHERE i.id = $1 AND i.client_id = $2
    GROUP BY i.id, p.name, c.contract_number;
  `;
  
  const result = await query(sql, [invoiceId, clientId]);
  return result.rows[0];
}

/**
 * Get invoice payments - filtered by invoice and client
 */
async function getInvoicePayments(invoiceId, clientId) {
  const sql = `
    SELECT 
      p.*,
      u.first_name || ' ' || u.last_name AS recorded_by_name
    FROM payments p
    LEFT JOIN users u ON p.recorded_by = u.id
    INNER JOIN invoices i ON p.invoice_id = i.id
    WHERE p.invoice_id = $1 AND i.client_id = $2
    ORDER BY p.payment_date DESC;
  `;
  
  const result = await query(sql, [invoiceId, clientId]);
  return result.rows;
}

// ============================================
// CLIENT MAINTENANCE (Strictly filtered by client_id)
// ============================================

/**
 * Get installed assets for a specific client ONLY
 */
async function getClientAssets(clientId) {
  const sql = `
    SELECT 
      ia.*,
      p.name AS project_name,
      u.first_name || ' ' || u.last_name AS assigned_engineer_name
    FROM installed_assets ia
    LEFT JOIN projects p ON ia.project_id = p.id
    LEFT JOIN users u ON ia.assigned_engineer_id = u.id
    WHERE ia.client_id = $1
    ORDER BY ia.installation_date DESC;
  `;
  
  const result = await query(sql, [clientId]);
  return result.rows;
}

/**
 * Get maintenance visits for client's assets
 */
async function getClientMaintenanceVisits(clientId) {
  const sql = `
    SELECT 
      mv.*,
      ia.asset_name,
      ia.serial_number,
      p.name AS project_name,
      ae.first_name || ' ' || ae.last_name AS assigned_engineer_name
    FROM maintenance_visits mv
    INNER JOIN installed_assets ia ON mv.asset_id = ia.id
    LEFT JOIN projects p ON ia.project_id = p.id
    LEFT JOIN users ae ON mv.assigned_engineer_id = ae.id
    WHERE ia.client_id = $1
    ORDER BY mv.visit_date DESC;
  `;
  
  const result = await query(sql, [clientId]);
  return result.rows;
}

/**
 * Get maintenance contracts for a specific client
 */
async function getClientMaintenanceContracts(clientId) {
  const sql = `
    SELECT 
      mc.*,
      p.name AS project_name,
      json_agg(ia.id) FILTER (WHERE ia.id IS NOT NULL) AS included_asset_ids
    FROM maintenance_contracts mc
    LEFT JOIN projects p ON mc.project_id = p.id
    LEFT JOIN installed_assets ia ON ia.id = ANY(
      ARRAY(SELECT json_array_elements_text(mc.included_assets::json))::int[]
    )
    WHERE mc.client_id = $1
    GROUP BY mc.id, p.name
    ORDER BY mc.end_date DESC;
  `;
  
  const result = await query(sql, [clientId]);
  return result.rows;
}

// ============================================
// CLIENT SUPPORT MESSAGES (Strictly filtered)
// ============================================

/**
 * Get support messages for a specific project - filtered by client_id
 */
async function getClientSupportMessages(projectId, clientId) {
  const sql = `
    SELECT 
      csm.*,
      u.first_name || ' ' || u.last_name AS sender_name,
      CASE 
        WHEN csm.is_from_client THEN 'client'
        ELSE 'sales_rep'
      END AS sender_type
    FROM client_support_messages csm
    INNER JOIN projects p ON csm.project_id = p.id
    LEFT JOIN users u ON 
      (csm.is_from_client AND u.id = csm.client_id) OR
      (NOT csm.is_from_client AND u.id = csm.sales_rep_id)
    WHERE csm.project_id = $1 AND p.client_id = $2
    ORDER BY csm.created_at ASC;
  `;
  
  const result = await query(sql, [projectId, clientId]);
  return result.rows;
}

/**
 * Create support message
 */
async function createClientSupportMessage(data) {
  const sql = `
    INSERT INTO client_support_messages (
      project_id, client_id, sales_rep_id, message, 
      is_from_client, parent_message_id
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  
  const values = [
    data.project_id,
    data.client_id,
    data.sales_rep_id,
    data.message,
    data.is_from_client !== undefined ? data.is_from_client : true,
    data.parent_message_id || null
  ];
  
  const result = await query(sql, values);
  return result.rows[0];
}

/**
 * Mark message as read
 */
async function markMessageAsRead(messageId, clientId) {
  const sql = `
    UPDATE client_support_messages
    SET is_read = true
    WHERE id = $1 AND client_id = $2
    RETURNING *;
  `;
  
  const result = await query(sql, [messageId, clientId]);
  return result.rows[0];
}

/**
 * Get unread message count for client
 */
async function getUnreadMessageCount(clientId) {
  const sql = `
    SELECT COUNT(*) AS unread_count
    FROM client_support_messages
    WHERE sales_rep_id = $1 
      AND is_from_client = false
      AND is_read = false;
  `;
  
  const result = await query(sql, [clientId]);
  return result.rows[0].unread_count;
}

// ============================================
// PROJECT RATINGS (Strictly filtered)
// ============================================

/**
 * Check if client can rate a project (30-day rule)
 */
async function canClientRateProject(projectId, clientId) {
  const sql = `
    SELECT 
      p.id,
      p.name,
      p.status,
      p.delivered_at,
      (CURRENT_DATE - p.delivered_at::date) AS days_since_delivery,
      EXISTS (
        SELECT 1 FROM project_ratings pr 
        WHERE pr.project_id = p.id AND pr.client_id = p.client_id
      ) AS already_rated
    FROM projects p
    WHERE p.id = $1 AND p.client_id = $2
      AND p.status = 'delivered'
      AND p.delivered_at IS NOT NULL;
  `;
  
  const result = await query(sql, [projectId, clientId]);
  
  if (result.rows.length === 0) {
    return { can_rate: false, reason: 'Project not found or not delivered' };
  }
  
  const row = result.rows[0];
  
  if (row.already_rated) {
    return { can_rate: false, reason: 'Already rated' };
  }
  
  if (row.days_since_delivery < 30) {
    return { 
      can_rate: false, 
      reason: 'Too early',
      days_remaining: 30 - row.days_since_delivery
    };
  }
  
  return { can_rate: true, project: row };
}

/**
 * Create project rating
 */
async function createProjectRating(data) {
  const sql = `
    INSERT INTO project_ratings (
      project_id, client_id, rating, comment, is_anonymous
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  
  const values = [
    data.project_id,
    data.client_id,
    data.rating,
    data.comment || null,
    data.is_anonymous || false
  ];
  
  const result = await query(sql, values);
  return result.rows[0];
}

/**
 * Get client's ratings for their projects
 */
async function getClientRatings(clientId) {
  const sql = `
    SELECT 
      pr.*,
      p.name AS project_name,
      p.delivered_at
    FROM project_ratings pr
    INNER JOIN projects p ON pr.project_id = p.id
    WHERE pr.client_id = $1
    ORDER BY pr.created_at DESC;
  `;
  
  const result = await query(sql, [clientId]);
  return result.rows;
}

// ============================================
// CLIENT QUOTATIONS
// ============================================

/**
 * Get all quotations for a specific client
 */
async function getMyQuotations(clientId) {
  const sql = `
    SELECT 
      q.*,
      l.client_name,
      l.contact_email AS client_email
    FROM quotations q
    INNER JOIN leads l ON q.lead_id = l.id
    WHERE (
      LOWER(l.contact_email) = (SELECT LOWER(email) FROM users WHERE id = $1)
      OR l.client_user_id = $1
    )
      AND q.status IN ('sent_to_client', 'client_approved', 'client_rejected')
    ORDER BY q.created_at DESC;
  `;
  
  const result = await query(sql, [clientId]);
  return result.rows;
}

/**
 * Get quotation by ID
 */
async function getQuotationById(quotationId) {
  const sql = `
    SELECT 
      q.*,
      l.contact_email AS client_email,
      l.client_name
    FROM quotations q
    INNER JOIN leads l ON q.lead_id = l.id
    WHERE q.id = $1;
  `;
  
  const result = await query(sql, [quotationId]);
  return result.rows[0];
}

/**
 * Get client email by user ID
 */
async function getClientEmail(clientId) {
  const sql = `SELECT email FROM users WHERE id = $1`;
  const result = await query(sql, [clientId]);
  return result.rows[0]?.email;
}

/**
 * Update quotation response (accept/reject)
 */
async function updateQuotationResponse(quotationId, status, rejectionReason) {
  const sql = `
    UPDATE quotations
    SET 
      client_response = $1,
      rejection_reason = $2,
      responded_at = NOW(),
      status = $1
    WHERE id = $3
    RETURNING *;
  `;
  
  const result = await query(sql, [status, rejectionReason || null, quotationId]);
  return result.rows[0];
}

/**
 * Update lead status based on quotation response
 */
async function updateLeadStatusByQuotation(quotationId, newStatus) {
  const sql = `
    UPDATE leads
    SET status = $1
    WHERE id = (
      SELECT lead_id FROM quotations WHERE id = $2
    )
    RETURNING id, status;
  `;
  
  const result = await query(sql, [newStatus, quotationId]);
  return result.rows[0];
}

module.exports = {
  // Profile
  getClientProfile,
  
  // Quotations
  getMyQuotations,
  getQuotationById,
  getClientEmail,
  updateQuotationResponse,
  updateLeadStatusByQuotation,
  
  // Projects
  getClientProjects,
  getClientProjectById,
  getProjectTasks,
  
  // Invoices
  getClientInvoices,
  getClientInvoiceById,
  getInvoicePayments,
  
  // Maintenance
  getClientAssets,
  getClientMaintenanceVisits,
  getClientMaintenanceContracts,
  
  // Support Messages
  getClientSupportMessages,
  createClientSupportMessage,
  markMessageAsRead,
  getUnreadMessageCount,
  
  // Ratings
  canClientRateProject,
  createProjectRating,
  getClientRatings,
};
