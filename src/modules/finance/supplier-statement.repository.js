const { pool, query } = require('../../db');

/**
 * Get supplier statement with full transaction history
 */
async function getSupplierStatement(supplierId, filters = {}) {
  const { startDate, endDate } = filters;

  // 1. Get supplier info
  const supplierResult = await query(
    `SELECT id, name, email, phone, vat_number
     FROM suppliers 
     WHERE id = $1`,
    [supplierId]
  );

  if (!supplierResult.rows[0]) {
    throw new Error('المورد غير موجود - Supplier not found');
  }

  const supplier = supplierResult.rows[0];

  // 2. Calculate total invoices
  let invoicesWhereClause = 'WHERE pi.supplier_id = $1';
  const invoicesParams = [supplierId];
  let paramCount = 2;

  if (startDate) {
    invoicesWhereClause += ` AND pi.invoice_date >= $${paramCount}`;
    invoicesParams.push(startDate);
    paramCount++;
  }

  if (endDate) {
    invoicesWhereClause += ` AND pi.invoice_date <= $${paramCount}`;
    invoicesParams.push(endDate);
    paramCount++;
  }

  const invoicesTotalResult = await query(
    `SELECT 
       COUNT(*) as invoice_count,
       COALESCE(SUM(pi.total_amount), 0) as total_invoices_amount,
       COALESCE(SUM(pi.paid_amount), 0) as total_paid_from_invoices
     FROM purchase_invoices pi
     ${invoicesWhereClause}`,
    invoicesParams
  );

  const invoicesTotal = invoicesTotalResult.rows[0];

  // 3. Calculate total payments from payment vouchers
  let vouchersWhereClause = 'WHERE pv.supplier_id = $1';
  const vouchersParams = [supplierId];
  paramCount = 2;

  if (startDate) {
    vouchersWhereClause += ` AND pv.payment_date >= $${paramCount}`;
    vouchersParams.push(startDate);
    paramCount++;
  }

  if (endDate) {
    vouchersWhereClause += ` AND pv.payment_date <= $${paramCount}`;
    vouchersParams.push(endDate);
    paramCount++;
  }

  const paymentsTotalResult = await query(
    `SELECT 
       COUNT(*) as payment_count,
       COALESCE(SUM(pv.payment_amount), 0) as total_payments
     FROM payment_vouchers pv
     ${vouchersWhereClause}`,
    vouchersParams
  );

  const paymentsTotal = paymentsTotalResult.rows[0];

  // 4. Calculate balance
  const totalInvoices = parseFloat(invoicesTotal.total_invoices_amount);
  const totalPaid = parseFloat(paymentsTotal.total_payments);
  const balanceDue = totalInvoices - totalPaid;

  // 5. Get transaction timeline (invoices + payments combined)
  let dateFilter = '';
  const timelineParams = [supplierId];
  paramCount = 2;

  if (startDate) {
    dateFilter += ` AND tx.transaction_date >= $${paramCount}`;
    timelineParams.push(startDate);
    paramCount++;
  }

  if (endDate) {
    dateFilter += ` AND tx.transaction_date <= $${paramCount}`;
    timelineParams.push(endDate);
    paramCount++;
  }

  const timelineResult = await query(
    `SELECT * FROM (
      -- Invoices (Debit - increases balance)
      SELECT 
        pi.invoice_date as transaction_date,
        'invoice' as transaction_type,
        pi.invoice_number as reference_number,
        pi.total_amount as debit_amount,
        0 as credit_amount,
        pi.notes as description,
        pi.id as transaction_id
      FROM purchase_invoices pi
      WHERE pi.supplier_id = $1
      ${dateFilter}

      UNION ALL

      -- Payment Vouchers (Credit - decreases balance)
      SELECT 
        pv.payment_date as transaction_date,
        'payment' as transaction_type,
        pv.voucher_number as reference_number,
        0 as debit_amount,
        pv.payment_amount as credit_amount,
        pv.notes as description,
        pv.id as transaction_id
      FROM payment_vouchers pv
      WHERE pv.supplier_id = $1
      ${dateFilter}
    ) tx
    ORDER BY tx.transaction_date ASC, tx.transaction_type ASC`,
    timelineParams
  );

  // 6. Calculate running balance
  let runningBalance = 0;
  const transactions = timelineResult.rows.map(tx => {
    const debit = parseFloat(tx.debit_amount);
    const credit = parseFloat(tx.credit_amount);
    runningBalance += debit - credit;

    return {
      transaction_date: tx.transaction_date,
      transaction_type: tx.transaction_type,
      reference_number: tx.reference_number,
      debit_amount: debit,
      credit_amount: credit,
      running_balance: runningBalance,
      description: tx.description,
      transaction_id: tx.transaction_id
    };
  });

  return {
    supplier: {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      vat_number: supplier.vat_number
    },
    summary: {
      total_invoices: parseInt(invoicesTotal.invoice_count),
      total_invoices_amount: totalInvoices,
      total_payments: parseInt(paymentsTotal.payment_count),
      total_paid_amount: totalPaid,
      balance_due: balanceDue,
      currency: 'SAR'
    },
    transactions: transactions,
    date_range: {
      start: startDate || null,
      end: endDate || null
    }
  };
}

/**
 * Get all suppliers with statement summary
 */
async function getAllSuppliersWithSummary() {
  const result = await query(
    `SELECT 
       s.id,
       s.name,
       s.email,
       s.phone,
       COUNT(DISTINCT pi.id) as invoice_count,
       COALESCE(SUM(pi.total_amount), 0) as total_invoices,
       COALESCE(SUM(pv.payment_amount), 0) as total_paid,
       COALESCE(SUM(pi.total_amount), 0) - COALESCE(SUM(pv.payment_amount), 0) as balance_due
     FROM suppliers s
     LEFT JOIN purchase_invoices pi ON pi.supplier_id = s.id
     LEFT JOIN payment_vouchers pv ON pv.supplier_id = s.id
     GROUP BY s.id, s.name, s.email, s.phone
     ORDER BY balance_due DESC`
  );

  return result.rows;
}

module.exports = {
  getSupplierStatement,
  getAllSuppliersWithSummary
};
