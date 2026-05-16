/**
 * Payment Voucher Repository
 * Phase 3: سند الصرف (Payment Vouchers)
 * Database operations for payment vouchers
 */

const { pool, query } = require('../../db');

/**
 * Generate next voucher number: PV-2026-0001
 */
async function generateVoucherNumber() {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(voucher_number FROM 'PV-${year}-(\\d+)') AS INTEGER)), 0) + 1 as next_num
     FROM payment_vouchers
     WHERE voucher_number LIKE 'PV-${year}-%'`
  );
  const nextNum = result.rows[0].next_num;
  return `PV-${year}-${String(nextNum).padStart(4, '0')}`;
}

/**
 * Create payment voucher
 */
async function createVoucher(voucherData, client) {
  const dbClient = client || pool;
  
  const query = `
    INSERT INTO payment_vouchers (
      voucher_number, invoice_id, supplier_id, project_id,
      payment_date, payment_method, payment_amount, currency,
      payment_account_type, bank_account_number, check_number, bank_name,
      status, journal_entry_id, notes, created_by, approved_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
    )
    RETURNING *
  `;
  
  const values = [
    voucherData.voucher_number,
    voucherData.invoice_id,
    voucherData.supplier_id,
    voucherData.project_id || null,
    voucherData.payment_date || new Date().toISOString().split('T')[0],
    voucherData.payment_method,
    voucherData.payment_amount,
    voucherData.currency || 'SAR',
    voucherData.payment_account_type,
    voucherData.bank_account_number || null,
    voucherData.check_number || null,
    voucherData.bank_name || null,
    voucherData.status || 'completed',
    voucherData.journal_entry_id || null,
    voucherData.notes || null,
    voucherData.created_by,
    voucherData.approved_by || null
  ];
  
  const result = await dbClient.query(query, values);
  return result.rows[0];
}

/**
 * Get voucher by ID with invoice and supplier details
 */
async function getVoucherById(id) {
  const query = `
    SELECT 
      pv.*,
      pi.invoice_number,
      pi.total_amount as invoice_total,
      pi.paid_amount as invoice_paid,
      pi.remaining_amount as invoice_remaining,
      pi.status as invoice_status,
      s.name as supplier_name,
      s.email as supplier_email,
      p.name as project_name,
      je.entry_number as journal_entry_number
    FROM payment_vouchers pv
    LEFT JOIN purchase_invoices pi ON pv.invoice_id = pi.id
    LEFT JOIN suppliers s ON pv.supplier_id = s.id
    LEFT JOIN projects p ON pv.project_id = p.id
    LEFT JOIN journal_entries je ON pv.journal_entry_id = je.id
    WHERE pv.id = $1
  `;
  
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

/**
 * Get all vouchers with filters
 */
async function getVouchers(filters = {}) {
  let query = `
    SELECT 
      pv.*,
      pi.invoice_number,
      s.name as supplier_name,
      p.name as project_name,
      je.entry_number as journal_entry_number
    FROM payment_vouchers pv
    LEFT JOIN purchase_invoices pi ON pv.invoice_id = pi.id
    LEFT JOIN suppliers s ON pv.supplier_id = s.id
    LEFT JOIN projects p ON pv.project_id = p.id
    LEFT JOIN journal_entries je ON pv.journal_entry_id = je.id
    WHERE 1=1
  `;
  
  const params = [];
  let paramIndex = 1;
  
  if (filters.status && filters.status !== 'all') {
    query += ` AND pv.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }
  
  if (filters.supplier_id) {
    query += ` AND pv.supplier_id = $${paramIndex}`;
    params.push(filters.supplier_id);
    paramIndex++;
  }
  
  if (filters.date_from) {
    query += ` AND pv.payment_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }
  
  if (filters.date_to) {
    query += ` AND pv.payment_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }
  
  query += ` ORDER BY pv.created_at DESC`;
  
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get payment history for an invoice
 */
async function getInvoicePaymentHistory(invoiceId) {
  const query = `
    SELECT 
      pv.*,
      je.entry_number as journal_entry_number
    FROM payment_vouchers pv
    LEFT JOIN journal_entries je ON pv.journal_entry_id = je.id
    WHERE pv.invoice_id = $1 AND pv.status = 'completed'
    ORDER BY pv.created_at ASC
  `;
  
  const result = await pool.query(query, [invoiceId]);
  return result.rows;
}

/**
 * Update voucher status
 */
async function updateVoucherStatus(id, status) {
  const query = `
    UPDATE payment_vouchers
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;
  
  const result = await pool.query(query, [status, id]);
  return result.rows[0];
}

/**
 * Delete voucher (soft delete by setting status to cancelled)
 */
async function cancelVoucher(id) {
  return updateVoucherStatus(id, 'cancelled');
}

module.exports = {
  generateVoucherNumber,
  createVoucher,
  getVoucherById,
  getVouchers,
  getInvoicePaymentHistory,
  updateVoucherStatus,
  cancelVoucher
};
