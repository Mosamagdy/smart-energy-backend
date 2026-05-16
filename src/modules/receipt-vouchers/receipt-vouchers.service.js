const repo = require('../../modules/receipt-vouchers/receipt-vouchers.repository');
const coaRepo = require('../../modules/coa/coa.repository');
const journalService = require('../../modules/journal-entries/journal-entries.service');


// ============================================================================
// Receipt Vouchers Service
// ============================================================================

/**
 * Create receipt voucher with journal entry
 */
async function createReceiptVoucher(data, currentUser) {
  console.log('[Service] Creating receipt voucher with data:', JSON.stringify(data, null, 2));
  
  // Get the first invoice to find the client's receivable account
  const { query } = require('../../db');
  let receivableAccountId = null;
  
  if (data.invoices && data.invoices.length > 0) {
    const firstInvoice = await getInvoiceById(data.invoices[0].sales_invoice_id);
    if (firstInvoice && firstInvoice.lead_id) {
      const leadResult = await query(
        'SELECT receivable_account_id FROM leads WHERE id = $1',
        [firstInvoice.lead_id]
      );
      if (leadResult.rows.length > 0) {
        receivableAccountId = leadResult.rows[0].receivable_account_id;
      }
    }
  }
  
  if (!receivableAccountId) {
    const err = new Error('حساب العميل المدينة غير موجود في دليل الحسابات');
    err.statusCode = 400;
    throw err;
  }

  // Generate voucher number
  const voucherNo = await repo.generateVoucherNumber();

  // ✅ FIX: Always create as 'draft' first to avoid logic conflict
  const originalStatus = data.status;
  
  const voucher = await repo.createReceiptVoucher({
    ...data,
    voucher_no: voucherNo,
    created_by: currentUser.id,
    status: 'draft'  // Always create as draft first
  });

  // Link invoices if provided
  if (data.invoices && data.invoices.length > 0) {
    await repo.linkInvoicesToVoucher(voucher.id, data.invoices);
    
    // Update invoice paid amounts
    const invoiceUpdates = [];
    for (const inv of data.invoices) {
      const invoice = await getInvoiceById(inv.sales_invoice_id);
      const newPaidAmount = parseFloat(invoice.paid_amount || 0) + parseFloat(inv.amount_applied);
      invoiceUpdates.push({
        invoice_id: inv.sales_invoice_id,
        paid_amount: newPaidAmount
      });
    }
    await repo.updateInvoicePaidAmounts(invoiceUpdates);
  }

  // ✅ FIX: If original status was 'posted', create journal entry and update status
  if (originalStatus === 'posted') {
    console.log('[Service] Original status was posted, creating journal entry...');
    await postVoucherWithJournal(voucher.id, currentUser, receivableAccountId);
  }

  return repo.getVoucherById(voucher.id);
}

/**
 * Post voucher with journal entry creation
 */
async function postVoucherWithJournal(voucherId, currentUser, receivableAccountId) {
  const voucher = await repo.getVoucherById(voucherId);
  
  if (!voucher) {
    const err = new Error('سند القبض غير موجود');
    err.statusCode = 404;
    throw err;
  }

  if (voucher.status === 'posted') {
    const err = new Error('سند القبض مرحل بالفعل');
    err.statusCode = 400;
    throw err;
  }

  // If receivableAccountId not provided, get it from invoice
  if (!receivableAccountId) {
    const { query } = require('../../db');
    const invoiceResult = await query(
      `SELECT si.lead_id FROM receipt_voucher_invoices rvi
       JOIN sales_invoices si ON si.id = rvi.sales_invoice_id
       WHERE rvi.receipt_voucher_id = $1
       LIMIT 1`,
      [voucherId]
    );
    
    if (invoiceResult.rows.length > 0 && invoiceResult.rows[0].lead_id) {
      const leadResult = await query(
        'SELECT receivable_account_id FROM leads WHERE id = $1',
        [invoiceResult.rows[0].lead_id]
      );
      if (leadResult.rows.length > 0) {
        receivableAccountId = leadResult.rows[0].receivable_account_id;
      }
    }
  }

  if (!receivableAccountId) {
    const err = new Error('حساب العميل المدينة غير موجود');
    err.statusCode = 400;
    throw err;
  }
  
  // Get payment account details (Cash 12301 or Bank 12201/12202)
  const paymentAccount = await coaRepo.getAccountById(voucher.payment_account_id);

  if (!paymentAccount) {
    const err = new Error('حساب الدفع غير موجود');
    err.statusCode = 400;
    throw err;
  }

  // Create journal entry:
  // DEBIT: Cash/Bank Account (Asset increases)
  // CREDIT: Client AR Account (Asset decreases - client owes less)
  const lines = [
    {
      account_id: paymentAccount.id,
      description: `قبض من ${voucher.client_name} - ${voucher.voucher_no}`,
      debit_amount: voucher.amount,
      credit_amount: 0
    },
    {
      account_id: receivableAccountId,
      description: `تحصيل من العميل ${voucher.client_name}`,
      debit_amount: 0,
      credit_amount: voucher.amount
    }
  ];

  await journalService.createJournalEntry({
    description: `سند قبض ${voucher.voucher_no} - ${voucher.client_name}`,
    reference_type: 'receipt_voucher',
    reference_id: voucher.id,
    entry_date: voucher.receipt_date,
    is_posted: true  // ✅ Ensure journal entry is marked as posted
  }, lines, currentUser);

  console.log('[Service] ✅ Journal entry created for voucher:', voucher.voucher_no);

  // Mark voucher as posted
  return repo.postVoucher(voucherId, currentUser.id);
}

/**
 * Get invoice by ID
 */
async function getInvoiceById(invoiceId) {
  const { query } = require('../../db');
  const result = await query(
    'SELECT * FROM sales_invoices WHERE id = $1',
    [invoiceId]
  );
  return result.rows[0] || null;
}

/**
 * Get linked invoices for a voucher
 */
async function getLinkedInvoices(voucherId) {
  console.log(`[Service] Getting linked invoices for voucher ID: ${voucherId}`);
  return repo.getLinkedInvoices(voucherId);
}

/**
 * Get all vouchers
 */
async function getAllVouchers(filters) {
  return repo.getVouchers(filters);
}

/**
 * Get voucher by ID
 */
async function getVoucherById(id) {
  return repo.getVoucherById(id);
}

/**
 * Get client outstanding invoices
 */
async function getClientOutstandingInvoices(clientId) {
  console.log(`[Service] Getting outstanding invoices for clientId: ${clientId}`);
  const invoices = await repo.getClientOutstandingInvoices(clientId);
  console.log(`[Service] Found ${invoices.length} invoices`);
  return invoices;
}

/**
 * Cancel voucher (reverse journal entry)
 */
async function cancelVoucher(voucherId, currentUser) {
  console.log(`[Service] Cancelling voucher ID: ${voucherId}`);
  
  const voucher = await repo.getVoucherById(voucherId);
  
  if (!voucher) {
    const err = new Error('سند القبض غير موجود');
    err.statusCode = 404;
    throw err;
  }

  if (voucher.status === 'cancelled') {
    const err = new Error('سند القبض ملغي بالفعل');
    err.statusCode = 400;
    throw err;
  }

  // Only reverse journal entry if voucher was posted
  if (voucher.status === 'posted') {
    // TODO: Reverse the journal entry
    // For now, we just mark as cancelled
    console.log('[Service] Warning: Posted voucher cancelled without reversing journal entry');
  }

  // Update voucher status to cancelled
  return repo.cancelVoucher(voucherId);
}

module.exports = {
  createReceiptVoucher,
  postVoucherWithJournal,
  getAllVouchers,
  getVoucherById,
  getClientOutstandingInvoices,
  cancelVoucher,
  getLinkedInvoices,
};
