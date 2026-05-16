const { pool, query } = require('../../db');

// ============================================================================
// Suppliers Repository - Data Access Layer
// ============================================================================

/**
 * Create supplier record (supports transaction client)
 */
async function createSupplier(data, client = null) {
  const {
    supplier_code, name, name_ar, supplier_type,
    vat_number, cr_number, contact_person, phone, email,
    address, payment_terms, coa_account_code, created_by, notes
  } = data;

  const dbClient = client || require('../../db');
  const queryFn = client ? client.query.bind(client) : dbClient.query;

  const result = await queryFn(
    `INSERT INTO suppliers (
      supplier_code, name, name_ar, supplier_type,
      vat_number, cr_number, contact_person, phone, email,
      address, payment_terms, coa_account_code, created_by, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      supplier_code, name, name_ar, supplier_type,
      vat_number, cr_number, contact_person, phone, email,
      address, payment_terms, coa_account_code, created_by, notes
    ]
  );

  return result.rows[0];
}

/**
 * Get supplier by ID
 */
async function getSupplierById(id) {
  const result = await query(
    `SELECT 
       s.*,
       u.first_name || ' ' || u.last_name AS created_by_name
     FROM suppliers s
     LEFT JOIN users u ON u.id = s.created_by
     WHERE s.id = $1 LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Get all suppliers with optional filters
 */
async function getAllSuppliers(filters = {}) {
  const { supplier_type, is_active } = filters;
  
  let whereClause = 'WHERE 1=1';
  const values = [];
  let paramCount = 1;

  if (supplier_type) {
    whereClause += ` AND s.supplier_type = $${paramCount}`;
    values.push(supplier_type);
    paramCount++;
  }

  if (is_active !== undefined) {
    whereClause += ` AND s.is_active = $${paramCount}`;
    values.push(is_active);
    paramCount++;
  }

  const result = await query(
    `SELECT 
       s.*,
       u.first_name || ' ' || u.last_name AS created_by_name
     FROM suppliers s
     LEFT JOIN users u ON u.id = s.created_by
     ${whereClause}
     ORDER BY s.name ASC`,
    values
  );

  return result.rows;
}

/**
 * Update supplier (supports transaction client, allowed fields only)
 */
async function updateSupplier(id, data, client = null) {
  const allowedFields = [
    'name', 'name_ar', 'supplier_type', 'vat_number', 'cr_number',
    'contact_person', 'phone', 'email', 'address', 'payment_terms',
    'coa_account_code', 'is_active', 'notes'
  ];
  
  const keys = Object.keys(data).filter(key => allowedFields.includes(key));

  if (keys.length === 0) {
    return getSupplierById(id);
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

  const sql = `UPDATE suppliers SET ${setClause}, updated_at = NOW() 
               WHERE id = $${keys.length + 1} RETURNING *`;

  const result = await queryFn(sql, allValues);
  return result.rows[0] || null;
}

/**
 * Generate unique supplier code
 */
async function generateSupplierCode() {
  const result = await query(
    `SELECT 'SUP-' || LPAD((COUNT(*) + 1)::TEXT, 4, '0') as supplier_code
     FROM suppliers`
  );
  
  return result.rows[0].supplier_code;
}

/**
 * Get supplier balance (sum of unpaid purchase invoices)
 */
async function getSupplierBalance(supplierId) {
  const result = await query(
    `SELECT 
       COALESCE(SUM(pi.total_amount - pi.paid_amount), 0) AS outstanding_balance,
       COUNT(pi.id) AS unpaid_invoices_count
     FROM purchase_invoices pi
     WHERE pi.supplier_id = $1
       AND pi.status IN ('draft', 'partial')`,
    [supplierId]
  );

  return result.rows[0];
}

/**
 * Get supplier statement (all purchase invoices + payments)
 */
async function getSupplierStatement(supplierId) {
  const result = await query(
    `SELECT 
       pi.invoice_number,
       pi.invoice_date,
       pi.due_date,
       pi.subtotal,
       pi.tax_rate,
       pi.tax_amount,
       pi.total_amount,
       pi.paid_amount,
       (pi.total_amount - pi.paid_amount) AS outstanding,
       pi.status,
       po.po_number,
       grn.grn_number
     FROM purchase_invoices pi
     LEFT JOIN purchase_orders po ON po.id = pi.po_id
     LEFT JOIN goods_receipts grn ON grn.id = pi.grn_id
     WHERE pi.supplier_id = $1
     ORDER BY pi.invoice_date DESC`,
    [supplierId]
  );

  return result.rows;
}

module.exports = {
  createSupplier,
  getSupplierById,
  getAllSuppliers,
  updateSupplier,
  generateSupplierCode,
  getSupplierBalance,
  getSupplierStatement
};
