const { pool, query } = require('../../db');
const repo = require('./journal-entries.repository');
const coaRepo = require('../coa/coa.repository');

// ============================================================================
// Journal Entries Service - Double-Entry Accounting Core
// ============================================================================

/**
 * Create balanced journal entry with transaction support
 * @param {Object} data - Entry metadata
 * @param {Array} lines - Journal entry lines
 * @param {Object} currentUser - Current user
 * @param {Object} existingClient - Optional: existing transaction client
 */
async function createJournalEntry(data, lines, currentUser, existingClient = null) {
  const client = existingClient || await pool.connect();
  const shouldManageTransaction = !existingClient;

  try {
    if (shouldManageTransaction) {
      await client.query('BEGIN');
    }

    // CRITICAL: Validate entry balances (Debits MUST equal Credits)
    const balance = await repo.validateEntryBalance(lines);

    if (!balance.isBalanced) {
      if (shouldManageTransaction) await client.query('ROLLBACK');
      const err = new Error(`القيد غير متوازن — المجاميع المدينة (${balance.totalDebits}) لا تساوي المجاميع الدائنة (${balance.totalCredits})`);
      err.statusCode = 400;
      throw err;
    }

    // Validate minimum 2 lines
    if (lines.length < 2) {
      if (shouldManageTransaction) await client.query('ROLLBACK');
      const err = new Error('يجب أن يحتوي القيد على سطرین محاسبيين على الأقل');
      err.statusCode = 400;
      throw err;
    }

    // Validate all accounts exist and are active
    for (const line of lines) {
      const account = await coaRepo.getAccountById(line.account_id);

      if (!account || !account.is_active) {
        if (shouldManageTransaction) await client.query('ROLLBACK');
        const err = new Error(`حساب دليل الحسابات ${line.account_id} غير موجود أو غير نشط`);
        err.statusCode = 400;
        throw err;
      }

      const debitAmount  = parseFloat(line.debit_amount  || 0);
      const creditAmount = parseFloat(line.credit_amount || 0);

      if (debitAmount < 0 || creditAmount < 0) {
        if (shouldManageTransaction) await client.query('ROLLBACK');
        const err = new Error('المبالغ يجب أن تكون أرقامًا موجبة');
        err.statusCode = 400;
        throw err;
      }

      if (debitAmount > 0 && creditAmount > 0) {
        if (shouldManageTransaction) await client.query('ROLLBACK');
        const err = new Error('السطر المحاسبي لا يمكن أن يحتوي على مدين ودائن معًا');
        err.statusCode = 400;
        throw err;
      }
    }

    // ✅ FIX: generateEntryNumber يرجع INTEGER مش string
    const entryNumber = data.entry_number || await generateEntryNumber();

    const entry = await repo.createJournalEntryWithLines({
      entry_number:   entryNumber,
      entry_date:     data.entry_date || new Date(),
      description:    data.description,
      reference_type: data.reference_type,
      reference_id:   data.reference_id,
      project_id:     data.project_id,
      contract_id:    data.contract_id,
      posted_by:      currentUser.id
    }, lines, client);

    if (shouldManageTransaction) {
      await client.query('COMMIT');
    }

    return entry;

  } catch (error) {
    if (shouldManageTransaction) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (!existingClient) {
      client.release();
    }
  }
}

/**
 * ✅ FIX: بترجع INTEGER مش string
 * الـ DB column نوعه INTEGER — مكنش يقبل "JE-20260406-0001"
 */
async function generateEntryNumber() {
  const result = await query(
    `SELECT COALESCE(MAX(entry_number), 0) + 1 AS next_number
     FROM journal_entries`
  );

  return result.rows[0].next_number; // ✅ INTEGER
}

/**
 * Get journal entry by ID
 */
async function getJournalEntryById(id) {
  return repo.getJournalEntryById(id);
}

/**
 * Get entries by reference (invoice, payment, expense, etc.)
 */
async function getEntriesByReference(referenceType, referenceId) {
  return repo.getEntriesByReference(referenceType, referenceId);
}

/**
 * Get all entries for a project
 */
async function getProjectEntries(projectId) {
  return repo.getProjectEntries(projectId);
}

/**
 * Get trial balance for date range
 */
async function getTrialBalance(startDate, endDate) {
  return repo.getTrialBalance(startDate, endDate);
}

/**
 * Create standard accrual entry for invoice
 * Dr. Accounts Receivable
 * Cr. Revenue + VAT Payable
 */
async function createInvoiceAccrualEntry(invoice, currentUser) {
  const lines = [];

  const arAccount = await coaRepo.getAccountByCode('1110');
  lines.push({
    account_id:    arAccount.id,
    description:   `ذمم مدينة - فاتورة ${invoice.invoice_number}`,
    debit_amount:  invoice.total_amount,
    credit_amount: 0
  });

  const revenueAccount = await coaRepo.getAccountByCode('4120');
  lines.push({
    account_id:    revenueAccount.id,
    description:   `إيرادات مؤجلة - فاتورة ${invoice.invoice_number}`,
    debit_amount:  0,
    credit_amount: invoice.subtotal
  });

  if (invoice.tax_amount > 0) {
    const vatAccount = await coaRepo.getAccountByCode('2110');
    lines.push({
      account_id:    vatAccount.id,
      description:   `ضريبة قيمة مضافة - فاتورة ${invoice.invoice_number}`,
      debit_amount:  0,
      credit_amount: invoice.tax_amount
    });
  }

  return await createJournalEntry({
    description:    `قيد الفاتورة ${invoice.invoice_number}`,
    reference_type: 'invoice',
    reference_id:   invoice.id,
    project_id:     invoice.project_id,
    contract_id:    invoice.contract_id
  }, lines, currentUser);
}

/**
 * Create payment receipt entry
 * Dr. Cash/Bank
 * Cr. Accounts Receivable
 */
async function createPaymentReceiptEntry(payment, invoice, currentUser) {
  const lines = [];

  const bankAccount = await coaRepo.getAccountByCode('1330');
  lines.push({
    account_id:    bankAccount.id,
    description:   `تحصيل بنكي - دفعة ${payment.payment_number}`,
    debit_amount:  payment.amount,
    credit_amount: 0
  });

  const arAccount = await coaRepo.getAccountByCode('1110');
  lines.push({
    account_id:    arAccount.id,
    description:   `سداد ذمم مدينة - دفعة ${payment.payment_number}`,
    debit_amount:  0,
    credit_amount: payment.amount
  });

  return await createJournalEntry({
    description:    `قيد تحصيل دفعة ${payment.payment_number}`,
    reference_type: 'payment',
    reference_id:   payment.id,
    project_id:     invoice.project_id,
    contract_id:    invoice.contract_id
  }, lines, currentUser);
}

/**
 * Create expense entry
 * Dr. Expense Account
 * Cr. Cash / Petty Cash / Accounts Payable
 */
async function createExpenseEntry(expense, currentUser) {
  const lines = [];

  const expenseAccount = await coaRepo.getAccountById(expense.account_id);
  lines.push({
    account_id:    expenseAccount.id,
    description:   `مصروف مشروع - ${expense.expense_number}`,
    debit_amount:  expense.total_amount,
    credit_amount: 0
  });

  let creditAccountId;
  if (expense.payment_method === 'petty_cash') {
    creditAccountId = (await coaRepo.getAccountByCode('1320')).id;
  } else if (expense.payment_method === 'cash') {
    creditAccountId = (await coaRepo.getAccountByCode('1310')).id;
  } else {
    creditAccountId = (await coaRepo.getAccountByCode('2110')).id;
  }

  lines.push({
    account_id:    creditAccountId,
    description:   `سداد مصروف - ${expense.expense_number}`,
    debit_amount:  0,
    credit_amount: expense.total_amount
  });

  return await createJournalEntry({
    description:    `قيد مصروف ${expense.expense_number}`,
    reference_type: 'expense',
    reference_id:   expense.id,
    project_id:     expense.project_id
  }, lines, currentUser);
}

module.exports = {
  createJournalEntry,
  getJournalEntryById,
  getEntriesByReference,
  getProjectEntries,
  getTrialBalance,
  createInvoiceAccrualEntry,
  createPaymentReceiptEntry,
  createExpenseEntry,
};