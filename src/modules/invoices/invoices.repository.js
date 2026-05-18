const { query } = require('../../db');

// ============================================================================
// Invoices Repository - Contract-Driven Billing
// ============================================================================

/**
 * Create invoice (supports transaction client)
 */
async function createInvoice(data, client = null) {
  const {
    invoice_number, contract_id, project_id, client_id,
    invoice_type, subtotal, tax_rate, tax_amount, total_amount,
    payment_terms, notes, attachment_url, created_by
  } = data;

  const dbClient = client || require('../../db');
  const queryFn = client ? client.query.bind(client) : dbClient.query;

  const result = await queryFn(
    `INSERT INTO invoices (
      invoice_number, contract_id, project_id, client_id,
      invoice_type, subtotal, tax_rate, tax_amount, total_amount,
      payment_terms, notes, attachment_url, status, due_date, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft', $13, $14)
    RETURNING *`,
    [
      invoice_number, contract_id, project_id, client_id,
      invoice_type || 'progress', subtotal, tax_rate || 15.00, tax_amount || 0, total_amount,
      payment_terms, notes, attachment_url,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      created_by
    ]
  );

  return result.rows[0];
}

/**
 * Get invoice by ID with details
 */
async function getInvoiceById(id) {
  const result = await query(
    `SELECT 
       i.*,
       c.contract_number,
       p.name AS project_name,
       u.first_name || ' ' || u.last_name AS client_name,
       u.email AS client_email,
       creator.first_name || ' ' || creator.last_name AS created_by_name
     FROM invoices i
     LEFT JOIN contracts c ON c.id = i.contract_id
     LEFT JOIN projects p ON p.id = i.project_id
     LEFT JOIN users u ON u.id = i.client_id
     LEFT JOIN users creator ON creator.id = i.created_by
     WHERE i.id = $1 LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Get all invoices for project
 */
async function getProjectInvoices(projectId) {
  const result = await query(
    `SELECT 
       i.*,
       c.contract_number
     FROM invoices i
     LEFT JOIN contracts c ON c.id = i.contract_id
     WHERE i.project_id = $1
     ORDER BY i.issue_date DESC`,
    [projectId]
  );

  return result.rows;
}

/**
 * Get invoices by contract
 */
async function getContractInvoices(contractId) {
  const result = await query(
    `SELECT * FROM invoices
     WHERE contract_id = $1
     ORDER BY issue_date DESC`,
    [contractId]
  );

  return result.rows;
}

/**
 * Update invoice (supports transaction client)
 */
async function updateInvoice(id, data, client = null) {
  const allowedFields = [
    'status', 
    'notes', 
    'attachment_url', 
    'amount_paid', 
    'qr_code_data', 
    'journal_entry_id', 
    'pdf_path', 
    'pdf_generated_at',
    // Tax invoice fields
    'is_tax_invoice',
    'tax_invoice_no',
    'zatca_uuid',
    'zatca_status',
    'warehouse_id' 
  ];
  const keys = Object.keys(data).filter(key => allowedFields.includes(key));

  if (keys.length === 0) {
    return getInvoiceById(id);
  }

  const dbClient = client || require('../../db');
  const queryFn = client ? client.query.bind(client) : dbClient.query;

  const setClauses = [];
  const values = [];

  keys.forEach((key, index) => {
    setClauses.push(`${key} = $${index + 1}`);
    values.push(data[key]);
  });

  const setClause = setClauses.join(', ');
  const allValues = [...values, id];

  const sql = `UPDATE invoices SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
               WHERE id = $${keys.length + 1} RETURNING *`;

  const result = await queryFn(sql, allValues);
  return result.rows[0] || null;
}

/**
 * Add payment to invoice (supports transaction client)
 * ✅ FIX: الـ CASE كان يقرأ amount_paid القديمة قبل الإضافة
 * فكان status يفضل 'draft' بدل 'partial' في أول دفعة
 */
async function addInvoicePayment(invoiceId, amount, client = null) {
  const dbClient = client || require('../../db');
  const queryFn = client ? client.query.bind(client) : dbClient.query;

  const result = await queryFn(
    `UPDATE invoices 
     SET amount_paid = amount_paid + $1,
         status = CASE 
           WHEN amount_paid + $1 >= total_amount THEN 'paid'
           WHEN amount_paid + $1 > 0             THEN 'partial'
           ELSE status
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [amount, invoiceId]
  );

  return result.rows[0];
}

/**
 * Check if contract exists and is active for project
 */
async function validateContractForProject(projectId, contractId) {
  const result = await query(
    `SELECT EXISTS(
      SELECT 1 FROM contracts 
      WHERE id = $1 
        AND project_id = $2 
        AND status = 'active'
    ) as valid`,
    [contractId, projectId]
  );

  return result.rows[0].valid;
}

/**
 * Get total receivables for project
 */
async function getProjectReceivables(projectId) {
  const result = await query(
    `SELECT 
       COALESCE(SUM(total_amount), 0) as total_invoiced,
       COALESCE(SUM(amount_paid), 0) as total_paid,
       COALESCE(SUM(total_amount - amount_paid), 0) as outstanding_balance
     FROM invoices
     WHERE project_id = $1`,
    [projectId]
  );

  return result.rows[0];
}

/**
 * Delete invoice
 */
async function deleteInvoice(id) {
  const result = await query(
    `DELETE FROM invoices WHERE id = $1 RETURNING *`,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  createInvoice,
  getInvoiceById,
  getProjectInvoices,
  getContractInvoices,
  updateInvoice,
  addInvoicePayment,
  validateContractForProject,
  getProjectReceivables,
  deleteInvoice,
};