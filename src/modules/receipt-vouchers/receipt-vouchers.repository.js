const { query } = require('../../db');

// ============================================================================
// Receipt Vouchers Repository
// ============================================================================

/**
 * Create receipt voucher
 */
async function createReceiptVoucher(data) {
  const result = await query(
    `INSERT INTO receipt_vouchers (
      voucher_no, client_id, receipt_date, amount, payment_method,
      payment_account_id, reference_no, description, status, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      data.voucher_no,
      data.client_id,
      data.receipt_date || new Date().toISOString().split('T')[0],
      data.amount,
      data.payment_method,
      data.payment_account_id,
      data.reference_no || null,
      data.description || null,
      data.status || 'draft',
      data.created_by
    ]
  );
  
  return result.rows[0];
}

/**
 * Generate voucher number
 */
async function generateVoucherNumber() {
  const result = await query(`
    SELECT COUNT(*) as count FROM receipt_vouchers
  `);
  
  const count = parseInt(result.rows[0].count) + 1;
  return `RV-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
}

/**
 * Get voucher by ID with details
 */
async function getVoucherById(id) {
  const result = await query(
    `SELECT 
       rv.*,
       u.first_name || ' ' || u.last_name AS client_name,
       u.email AS client_email,
       pa.account_code AS payment_account_code,
       pa.account_name_ar AS payment_account_name,
       creator.first_name || ' ' || creator.last_name AS created_by_name
     FROM receipt_vouchers rv
     LEFT JOIN users u ON u.id = rv.client_id
     LEFT JOIN chart_of_accounts pa ON pa.id = rv.payment_account_id
     LEFT JOIN users creator ON creator.id = rv.created_by
     WHERE rv.id = $1
     LIMIT 1`,
    [id]
  );
  
  return result.rows[0] || null;
}

/**
 * Get all vouchers with filters
 */
async function getVouchers({ status, client_id, startDate, endDate }) {
  let sql = `
    SELECT 
      rv.id,
      rv.voucher_no,
      rv.receipt_date,
      rv.amount,
      rv.payment_method,
      rv.status,
      rv.reference_no,
      u.first_name || ' ' || u.last_name AS client_name,
      pa.account_code AS payment_account_code,
      pa.account_name_ar AS payment_account_name,
      rv.created_at
    FROM receipt_vouchers rv
    LEFT JOIN users u ON u.id = rv.client_id
    LEFT JOIN chart_of_accounts pa ON pa.id = rv.payment_account_id
    WHERE 1=1
  `;
  
  const params = [];
  let paramIndex = 1;
  
  // Fixed: Only filter by status if it's NOT 'all'
  if (status && status !== 'all') {
    sql += ` AND rv.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }
  
  if (client_id) {
    sql += ` AND rv.client_id = $${paramIndex}`;
    params.push(client_id);
    paramIndex++;
  }
  
  if (startDate) {
    sql += ` AND rv.receipt_date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }
  
  if (endDate) {
    sql += ` AND rv.receipt_date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }
  
  sql += ' ORDER BY rv.created_at DESC';
  
  console.log(`[Repository] getVouchers SQL:`, sql);
  console.log(`[Repository] getVouchers Params:`, params);
  
  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get client outstanding invoices
 */
async function getClientOutstandingInvoices(clientId) {
  console.log(`[Repository] Getting outstanding invoices for client_user_id: ${clientId}`);
  
  const result = await query(
    `SELECT 
       si.id,
       si.invoice_number,
       si.issue_date,
       si.due_date,
       si.total_amount,
       si.paid_amount,
       (si.total_amount - COALESCE(si.paid_amount, 0)) AS outstanding_balance,
       si.payment_status,
       si.status as invoice_status
     FROM sales_invoices si
     INNER JOIN leads l ON si.lead_id = l.id
     WHERE l.client_user_id = $1 
       AND (si.payment_status = 'unpaid' OR si.payment_status = 'partial')
       AND si.status IN ('draft', 'sent', 'final')
     ORDER BY si.due_date ASC`,
    [clientId]
  );
  
  console.log(`[Repository] Query returned ${result.rows.length} invoices`);
  return result.rows;
}

/**
 * Link invoices to voucher
 */
async function linkInvoicesToVoucher(voucherId, invoices) {
  const values = invoices.map((inv, idx) => {
    const baseIdx = idx * 3;
    return `($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3})`;
  }).join(',');
  
  const params = invoices.flatMap(inv => [
    voucherId,
    inv.sales_invoice_id,
    inv.amount_applied
  ]);
  
  await query(
    `INSERT INTO receipt_voucher_invoices (receipt_voucher_id, sales_invoice_id, amount_applied)
     VALUES ${values}`,
    params
  );
}

/**
 * Update invoice paid amounts
 */
async function updateInvoicePaidAmounts(invoiceUpdates) {
  for (const update of invoiceUpdates) {
    await query(
      `UPDATE sales_invoices 
       SET paid_amount = $1,
           payment_status = CASE 
             WHEN $1 >= total_amount THEN 'paid'
             WHEN $1 > 0 THEN 'partial'
             ELSE 'unpaid'
           END
       WHERE id = $2`,
      [update.paid_amount, update.invoice_id]
    );
  }
}

/**
 * Post voucher (create journal entry)
 */
async function postVoucher(voucherId, postedBy) {
  const result = await query(
    `UPDATE receipt_vouchers 
     SET status = 'posted',
         posted_by = $1,
         posted_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [postedBy, voucherId]
  );
  
  return result.rows[0];
}

/**
 * Cancel voucher - handles both posted and draft vouchers
 */
async function cancelVoucher(voucherId) {
  // For posted vouchers, we should reverse the journal entry first (handled in service)
  // Here we just update the status
  const result = await query(
    `UPDATE receipt_vouchers 
     SET status = 'cancelled',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status != 'cancelled'
     RETURNING *`,
    [voucherId]
  );
  
  return result.rows[0];
}

/**
 * Get linked invoices for a voucher
 */
async function getLinkedInvoices(voucherId) {
  console.log(`[Repository] Getting linked invoices for voucher ID: ${voucherId}`);
  
  const result = await query(
    `SELECT 
       rvi.id,
       rvi.amount_applied,
       si.invoice_number,
       si.issue_date,
       si.total_amount,
       si.payment_status
     FROM receipt_voucher_invoices rvi
     INNER JOIN sales_invoices si ON si.id = rvi.sales_invoice_id
     WHERE rvi.receipt_voucher_id = $1
     ORDER BY si.invoice_number`,
    [voucherId]
  );
  
  console.log(`[Repository] Found ${result.rows.length} linked invoices`);
  return result.rows;
}

module.exports = {
  createReceiptVoucher,
  generateVoucherNumber,
  getVoucherById,
  getVouchers,
  getClientOutstandingInvoices,
  linkInvoicesToVoucher,
  updateInvoicePaidAmounts,
  postVoucher,
  cancelVoucher,
  getLinkedInvoices,
};
