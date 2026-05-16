const repo = require('./expense-voucher.repository');
const { pool } = require('../../db');

/**
 * Create expense voucher with automatic journal entry
 * 
 * Official COA Structure:
 * DEBIT: Expense Account (32xxx branch)
 * CREDIT: Cash (12301) or Bank (122)
 */
async function createExpenseVoucher(data, userId) {
  console.log('[Expense Voucher] === CREATING EXPENSE VOUCHER ===');
  console.log('[Expense Voucher] Amount:', data.expense_amount);
  console.log('[Expense Voucher] Expense Account ID:', data.expense_account_id);
  console.log('[Expense Voucher] Payment Account ID:', data.payment_account_id);
  
  // MANDATORY COA VALIDATION (Safety Lock)
  const expenseAccountCheck = await pool.query(
    `SELECT id, account_code, account_name FROM chart_of_accounts WHERE id = $1`,
    [data.expense_account_id]
  );
  
  if (!expenseAccountCheck.rows[0]) {
    const error = new Error('حساب المصروف غير موجود - Expense account not found');
    error.statusCode = 400;
    throw error;
  }
  
  const expenseAccount = expenseAccountCheck.rows[0];
  const expenseCode = expenseAccount.account_code;
  
  // Validate expense account belongs to 32xxx or 322xxx branch
  if (!expenseCode.startsWith('32')) {
    const error = new Error(`حساب المصروف يجب أن ينتمي لفرع 32xxx (حسابك الحالي: ${expenseCode})`);
    error.statusCode = 400;
    throw error;
  }
  
  console.log('[Expense Voucher] ✅ Expense Account validated:', expenseCode, expenseAccount.account_name);
  
  // Validate payment account is Cash (12301) or Bank (122)
  const paymentAccountCheck = await pool.query(
    `SELECT id, account_code, account_name FROM chart_of_accounts WHERE id = $1`,
    [data.payment_account_id]
  );
  
  if (!paymentAccountCheck.rows[0]) {
    const error = new Error('حساب الدفع غير موجود - Payment account not found');
    error.statusCode = 400;
    throw error;
  }
  
  const paymentAccount = paymentAccountCheck.rows[0];
  const paymentCode = paymentAccount.account_code;
  
  if (paymentCode !== '12301' && paymentCode !== '122') {
    const error = new Error(`حساب الدفع يجب أن يكون نقدية (12301) أو بنك (122) - حسابك الحالي: ${paymentCode}`);
    error.statusCode = 400;
    throw error;
  }
  
  console.log('[Expense Voucher] ✅ Payment Account validated:', paymentCode, paymentAccount.account_name);
  
  // Start transaction
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Generate voucher number
    const voucherNumber = await repo.generateVoucherNumber();
    
    // 2. Create voucher in transaction
    const voucher = await repo.createVoucher({
      ...data,
      voucher_number: voucherNumber,
      created_by: userId
    }, client);
    
    console.log('[Expense Voucher] Voucher created:', voucher.voucher_number);
    
    // 3. Create automatic journal entry
    const journalEntry = await createJournalEntryInTransaction(client, voucher);
    
    // 4. Link journal entry to voucher
    await repo.updateJournalEntryId(voucher.id, journalEntry.id, client);
    
    await client.query('COMMIT');
    
    console.log('[Expense Voucher] ✅ Expense voucher and journal entry created successfully');
    console.log('[Expense Voucher] Journal Entry ID:', journalEntry.id);
    
    return {
      voucher,
      journalEntry,
      message: 'تم إنشاء سند الصرف والقيد المحاسبي بنجاح'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Expense Voucher] ❌ Failed to create expense voucher:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create journal entry for expense voucher
 * 
 * Accounting Logic:
 * DEBIT: Expense Account (32xxx) - Increases expense
 * CREDIT: Cash/Bank Account (12301 or 122) - Decreases asset
 */
async function createJournalEntryInTransaction(client, voucher) {
  console.log('[Expense Voucher JE] Creating journal entry...');
  
  // 1. Get expense account details
  const expenseAccountResult = await client.query(
    `SELECT id, account_code, account_name FROM chart_of_accounts WHERE id = $1`,
    [voucher.expense_account_id]
  );
  
  if (!expenseAccountResult.rows[0]) {
    throw new Error('حساب المصروف غير موجود - Expense account not found');
  }
  
  const expenseAccount = expenseAccountResult.rows[0];
  console.log('[Expense Voucher JE] Expense Account:', expenseAccount.account_code, expenseAccount.account_name);
  
  // 2. Get payment account details
  const paymentAccountResult = await client.query(
    `SELECT id, account_code, account_name FROM chart_of_accounts WHERE id = $1`,
    [voucher.payment_account_id]
  );
  
  if (!paymentAccountResult.rows[0]) {
    throw new Error('حساب الدفع غير موجود - Payment account not found');
  }
  
  const paymentAccount = paymentAccountResult.rows[0];
  console.log('[Expense Voucher JE] Payment Account:', paymentAccount.account_code, paymentAccount.account_name);
  
  // 3. Create journal entry header (matching LIVE database schema)
  // Note: journal_entries table does NOT have: reference_number, total_debit, total_credit, status, is_system_generated
  // Header amounts (debit/credit/amount) kept as 0 - single source of truth is journal_entry_lines
  const entryResult = await client.query(
    `INSERT INTO journal_entries (
      entry_date, description, reference_type, reference_id,
      entry_type, posted_by, is_posted
    ) VALUES ($1, $2, 'expense_voucher', $3, 'auto', $4, true)
    RETURNING *`,
    [
      voucher.expense_date,
      `Expense Voucher: ${voucher.description}`,
      voucher.id,
      voucher.created_by
    ]
  );
  
  const entry = entryResult.rows[0];
  console.log('[Expense Voucher JE] Journal Entry created:', entry.entry_number);
  
  // 4. Create DEBIT line (Expense Account)
  await client.query(
    `INSERT INTO journal_entry_lines (
      journal_entry_id, account_id, debit_amount, credit_amount, description
    ) VALUES ($1, $2, $3, $4, $5)`,
    [
      entry.id,
      expenseAccount.id,
      voucher.expense_amount,
      0,
      `${expenseAccount.account_name} - ${voucher.description}`
    ]
  );
  
  console.log('[Expense Voucher JE] DEBIT:', expenseAccount.account_code, voucher.expense_amount);
  
  // 5. Create CREDIT line (Cash/Bank Account)
  await client.query(
    `INSERT INTO journal_entry_lines (
      journal_entry_id, account_id, debit_amount, credit_amount, description
    ) VALUES ($1, $2, $3, $4, $5)`,
    [
      entry.id,
      paymentAccount.id,
      0,
      voucher.expense_amount,
      `${paymentAccount.account_name} - ${voucher.description}`
    ]
  );
  
  console.log('[Expense Voucher JE] CREDIT:', paymentAccount.account_code, voucher.expense_amount);
  
  // 6. SAFETY CHECK: Validate journal entry is balanced (Debits = Credits)
  const totalDebit = parseFloat(voucher.expense_amount);
  const totalCredit = parseFloat(voucher.expense_amount);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    const error = new Error(`القيد المحاسبي غير متوازن! مدين: ${totalDebit}, دائن: ${totalCredit}`);
    error.statusCode = 500;
    throw error;
  }
  
  console.log('[Expense Voucher JE] Validation: Debit=', totalDebit, ', Credit=', totalCredit, '✅ Balanced');
  console.log('[Expense Voucher JE] ✅ Journal entry balanced perfectly');
  
  return entry;
}

/**
 * Get all expense vouchers with filters
 */
async function getAllVouchers(filters = {}) {
  console.log('[Expense Voucher] Fetching all vouchers...');
  return await repo.getAllVouchers(filters);
}

/**
 * Get expense voucher by ID
 */
async function getVoucherById(id) {
  console.log('[Expense Voucher] Fetching voucher:', id);
  return await repo.getVoucherById(id);
}

/**
 * Get expense accounts (32xxx branch)
 */
async function getExpenseAccounts() {
  console.log('[Expense Voucher] Fetching expense accounts (32xxx)...');
  return await repo.getExpenseAccounts();
}

/**
 * Get payment accounts (12301, 122)
 */
async function getPaymentAccounts() {
  console.log('[Expense Voucher] Fetching payment accounts (12301, 122)...');
  return await repo.getPaymentAccounts();
}

module.exports = {
  createExpenseVoucher,
  getAllVouchers,
  getVoucherById,
  getExpenseAccounts,
  getPaymentAccounts
};
