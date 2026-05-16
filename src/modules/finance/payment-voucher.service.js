/**
 * Payment Voucher Service
 * Phase 3: سند الصرف (Payment Vouchers)
 * Business logic for payment processing
 */

const repo = require('./payment-voucher.repository');
const { pool, query } = require('../../db');
const { createJournalEntry } = require('../journal-entries/journal-entries.service');

/**
 * Create payment voucher with automatic journal entry
 */
async function createPaymentVoucher(voucherData, currentUser) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('[Payment Voucher] === STARTING VOUCHER CREATION ===');
    console.log('[Payment Voucher] Invoice ID:', voucherData.invoice_id);
    console.log('[Payment Voucher] Payment Amount:', voucherData.payment_amount);
    console.log('[Payment Voucher] Payment Method:', voucherData.payment_method);
    
    // 1. Validate invoice exists and get details
    const invoiceResult = await client.query(
      `SELECT * FROM purchase_invoices WHERE id = $1`,
      [voucherData.invoice_id]
    );
    
    if (!invoiceResult.rows[0]) {
      throw new Error('الفاتورة غير موجودة - Invoice not found');
    }
    
    const invoice = invoiceResult.rows[0];
    console.log('[Payment Voucher] Invoice:', invoice.invoice_number);
    console.log('[Payment Voucher] Total:', invoice.total_amount, 'Paid:', invoice.paid_amount, 'Remaining:', invoice.remaining_amount);
    
    // 2. Validate payment amount
    const paymentAmount = parseFloat(voucherData.payment_amount);
    const remainingAmount = parseFloat(invoice.remaining_amount);
    
    if (paymentAmount <= 0) {
      throw new Error('مبلغ الدفع يجب أن يكون أكبر من صفر - Payment amount must be greater than 0');
    }
    
    if (paymentAmount > remainingAmount + 0.01) { // +0.01 for floating point tolerance
      throw new Error(`مبلغ الدفع لا يمكن أن يتجاوز الرصيد المتبقي (${remainingAmount} ريال) - Payment amount cannot exceed remaining balance`);
    }
    
    // 3. Generate voucher number
    const voucherNumber = await repo.generateVoucherNumber();
    console.log('[Payment Voucher] Generated voucher number:', voucherNumber);
    
    // 4. Create journal entry
    console.log('[Payment Voucher] Creating journal entry...');
    const journalEntry = await createJournalEntryInTransaction(
      client,
      invoice,
      paymentAmount,
      voucherData.payment_account_type,
      voucherData.bank_account_number,
      voucherNumber
    );
    
    console.log('[Payment Voucher] Journal entry created:', journalEntry.entry_number);
    
    // 5. Create payment voucher
    const voucher = await repo.createVoucher({
      voucher_number: voucherNumber,
      invoice_id: invoice.id,
      supplier_id: invoice.supplier_id,
      project_id: invoice.project_id,
      payment_date: voucherData.payment_date,
      payment_method: voucherData.payment_method,
      payment_amount: paymentAmount,
      currency: voucherData.currency || 'SAR',
      payment_account_type: voucherData.payment_account_type,
      bank_account_number: voucherData.bank_account_number,
      check_number: voucherData.check_number,
      bank_name: voucherData.bank_name,
      status: 'completed',
      journal_entry_id: journalEntry.id,
      notes: voucherData.notes,
      created_by: currentUser.id,
      approved_by: currentUser.id // Auto-approved on creation
    }, client);
    
    console.log('[Payment Voucher] Voucher created:', voucher.id);
    
    // 6. Update invoice paid_amount and status
    const newPaidAmount = parseFloat(invoice.paid_amount) + paymentAmount;
    let newStatus = 'partial';
    
    if (Math.abs(newPaidAmount - parseFloat(invoice.total_amount)) < 0.01) {
      newStatus = 'paid';
    }
    
    await client.query(
      `UPDATE purchase_invoices 
       SET paid_amount = $1, status = $2, updated_at = NOW()
       WHERE id = $3`,
      [newPaidAmount, newStatus, invoice.id]
    );
    
    console.log('[Payment Voucher] Invoice updated - Paid:', newPaidAmount, 'Status:', newStatus);
    
    await client.query('COMMIT');
    
    console.log('[Payment Voucher] ✅ Voucher creation completed successfully');
    
    // 7. Get complete voucher with details
    const completeVoucher = await repo.getVoucherById(voucher.id);
    
    return {
      voucher: completeVoucher,
      journal_entry: journalEntry,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: invoice.total_amount,
        paid_amount: newPaidAmount,
        remaining_amount: parseFloat(invoice.total_amount) - newPaidAmount,
        status: newStatus
      }
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Payment Voucher] ❌ Voucher creation failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create journal entry within transaction
 * DEBIT: Accounts Payable (Supplier)
 * CREDIT: Cash or Bank Account
 */
async function createJournalEntryInTransaction(client, invoice, amount, accountType, bankAccount, voucherNumber) {
  // 1. Find Accounts Payable account (supplier account)
  const payableAccount = await client.query(
    `SELECT id FROM chart_of_accounts WHERE account_code = '211' AND is_active = true LIMIT 1`
  );
  
  if (!payableAccount.rows[0]) {
    throw new Error('حساب ذمم الموردين غير موجود - Accounts Payable account not found (Code: 211)');
  }
  
  // 2. Find Cash or Bank account based on payment type
  let cashBankAccount;
  if (accountType === 'cash') {
    cashBankAccount = await client.query(
      `SELECT id FROM chart_of_accounts WHERE account_code = '12301' AND is_active = true LIMIT 1`
    );
  } else {
    cashBankAccount = await client.query(
      `SELECT id FROM chart_of_accounts WHERE account_code = '122' AND is_active = true LIMIT 1`
    );
  }
  
  if (!cashBankAccount.rows[0]) {
    const accountCode = accountType === 'cash' ? '12301' : '122';
    throw new Error(`حساب ${accountType === 'cash' ? 'النقدية' : 'البنك'} غير موجود - ${accountType === 'cash' ? 'Cash' : 'Bank'} account not found (Code: ${accountCode})`);
  }
  
  // 3. Create journal entry header
  const entryResult = await client.query(
    `INSERT INTO journal_entries (
      entry_date, description, reference_type, reference_id,
      created_by, is_posted, entry_type, transaction_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      new Date().toISOString().split('T')[0],
      `Payment voucher ${voucherNumber} for invoice ${invoice.invoice_number}`,
      'payment_voucher',
      null, // reference_id - will be null since voucher not created yet
      null, // created_by - will be set
      true, // is_posted
      'auto', // entry_type
      new Date().toISOString().split('T')[0] // transaction_date
    ]
  );
  
  const journalEntry = entryResult.rows[0];
  
  // 4. Create journal entry lines
  const lines = [
    {
      account_id: payableAccount.rows[0].id,
      debit_amount: amount,
      credit_amount: 0,
      description: `Accounts Payable - Payment ${voucherNumber}`
    },
    {
      account_id: cashBankAccount.rows[0].id,
      debit_amount: 0,
      credit_amount: amount,
      description: `${accountType === 'cash' ? 'Cash' : 'Bank'} - Payment ${voucherNumber}`
    }
  ];
  
  for (const line of lines) {
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, debit_amount, credit_amount, description
      ) VALUES ($1, $2, $3, $4, $5)`,
      [journalEntry.id, line.account_id, line.debit_amount, line.credit_amount, line.description]
    );
  }
  
  console.log('[Payment Voucher] Journal Entry Lines:');
  console.log(`  - DEBIT Accounts Payable: ${amount}`);
  console.log(`  - CREDIT ${accountType === 'cash' ? 'Cash' : 'Bank'}: ${amount}`);
  console.log(`  - Balanced: true`);
  
  return journalEntry;
}

/**
 * Get voucher by ID
 */
async function getVoucherById(id) {
  const voucher = await repo.getVoucherById(id);
  
  if (!voucher) {
    throw new Error('سند الصرف غير موجود - Payment voucher not found');
  }
  
  return voucher;
}

/**
 * Get all vouchers with filters
 */
async function getVouchers(filters) {
  return repo.getVouchers(filters);
}

/**
 * Get invoice payment history
 */
async function getInvoicePaymentHistory(invoiceId) {
  // 1. Get invoice details
  const invoiceResult = await pool.query(
    `SELECT id, invoice_number, total_amount, paid_amount, remaining_amount, status
     FROM purchase_invoices WHERE id = $1`,
    [invoiceId]
  );
  
  if (!invoiceResult.rows[0]) {
    throw new Error('الفاتورة غير موجودة - Invoice not found');
  }
  
  // 2. Get payment history
  const payments = await repo.getInvoicePaymentHistory(invoiceId);
  
  return {
    invoice: invoiceResult.rows[0],
    payments
  };
}

/**
 * Cancel voucher
 */
async function cancelVoucher(id, currentUser) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Get voucher
    const voucher = await repo.getVoucherById(id);
    if (!voucher) {
      throw new Error('سند الصرف غير موجود - Payment voucher not found');
    }
    
    if (voucher.status === 'cancelled') {
      throw new Error('سند الصرف ملغي بالفعل - Voucher already cancelled');
    }
    
    // 2. Cancel voucher
    await repo.cancelVoucher(id);
    
    // 3. Reverse journal entry (set status to cancelled)
    if (voucher.journal_entry_id) {
      await client.query(
        `UPDATE journal_entries SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [voucher.journal_entry_id]
      );
    }
    
    // 4. Update invoice paid_amount
    const invoiceResult = await client.query(
      `SELECT * FROM purchase_invoices WHERE id = $1`,
      [voucher.invoice_id]
    );
    
    const invoice = invoiceResult.rows[0];
    const newPaidAmount = parseFloat(invoice.paid_amount) - parseFloat(voucher.payment_amount);
    let newStatus = 'draft';
    
    if (newPaidAmount > 0) {
      newStatus = 'partial';
    }
    
    await client.query(
      `UPDATE purchase_invoices 
       SET paid_amount = $1, status = $2, updated_at = NOW()
       WHERE id = $3`,
      [newPaidAmount, newStatus, invoice.id]
    );
    
    await client.query('COMMIT');
    
    return { message: 'سند الصرف تم إلغاؤه بنجاح - Payment voucher cancelled successfully' };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createPaymentVoucher,
  getVoucherById,
  getVouchers,
  getInvoicePaymentHistory,
  cancelVoucher
};
