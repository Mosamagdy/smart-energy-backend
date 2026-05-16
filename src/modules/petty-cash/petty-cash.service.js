const { pool } = require('../../db');
const repo = require('./petty-cash.repository');
const journalService = require('../journal-entries/journal-entries.service');
const coaRepo = require('../coa/coa.repository');
const { notifyRole } = require('../../utils/notify');

// ============================================================================
// Petty Cash Service - Fund Management & Transactions
// ============================================================================

/**
 * Create petty cash fund for engineer
 */
async function createPettyCashFund(data, currentUser) {
  const { fund_name, engineer_id, project_id, initial_amount, currency } = data;

  // Validate required fields
  if (!fund_name || !engineer_id || !initial_amount || initial_amount <= 0) {
    const err = new Error('جميع الحقول المطلوبة يجب تعبئتها');
    err.statusCode = 400;
    throw err;
  }

  // Authorization: Only finance_manager or above
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  if (!['super_admin', 'general_manager', 'finance_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية إنشاء صناديق عهد');
    err.statusCode = 403;
    throw err;
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create the fund
    const fund = await repo.createPettyCashFund({
      fund_name,
      engineer_id,
      project_id,
      initial_amount,
      currency,
      approved_by: currentUser.id
    });
    
    // CRITICAL: Generate journal entry for funding
    // Dr. Petty Cash (12303) | Cr. Bank (1230201)
    const pettyCashAccount = await coaRepo.getAccountByCode('12303');
    const bankAccount = await coaRepo.getAccountByCode('1230201'); // Banque Saudi Fransi
    
    if (!pettyCashAccount || !bankAccount) {
      const err = new Error('حسابات العهد النقدية غير موجودة في دليل الحسابات (12303, 1230201)');
      err.statusCode = 500;
      throw err;
    }
    
    const lines = [
      {
        account_id: pettyCashAccount.id,
        description: `تأسيس صندوق عهد - ${fund_name}`,
        debit_amount: initial_amount,
        credit_amount: 0
      },
      {
        account_id: bankAccount.id,
        description: `تحويل من البنك لصندوق العهد - ${fund_name}`,
        debit_amount: 0,
        credit_amount: initial_amount
      }
    ];
    
    await journalService.createJournalEntry({
      description: `قيد تأسيس صندوق عهد ${fund_name}`,
      reference_type: 'petty_cash_fund',
      reference_id: fund.id,
      project_id: project_id
    }, lines, currentUser);
    
    await client.query('COMMIT');
    
    // Notify finance manager
    await notifyRole('finance_manager', {
      title: 'تم إنشاء صندوق عهد جديد',
      message: `تم إنشاء صندوق عهد للمهندس "${fund_name}" بمبلغ ${initial_amount} ريال`,
      type: 'info',
      entity_type: 'petty_cash_fund',
      entity_id: fund.id
    });
    
    return fund;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Add funds to existing petty cash (recharge)
 */
async function addFunds(fundId, amount, currentUser) {
  if (amount <= 0) {
    const err = new Error('المبلغ يجب أن يكون موجبًا');
    err.statusCode = 400;
    throw err;
  }

  const fund = await repo.getPettyCashFund(fundId);
  
  if (!fund) {
    const err = new Error('صندوق العهد غير موجود');
    err.statusCode = 404;
    throw err;
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update balance
    const updatedFund = await repo.fundPettyCash(fundId, amount);
    
    // Record transaction
    await repo.recordTransaction({
      petty_cash_fund_id: fundId,
      transaction_type: 'fund',
      amount: amount,
      balance_after: updatedFund.current_balance,
      description: 'إضافة Funds إلى صندوق العهد',
      performed_by: currentUser.id
    });
    
    // Generate journal entry: Dr. Petty Cash (12303) | Cr. Bank (1230201)
    const pettyCashAccount = await coaRepo.getAccountByCode('12303');
    const bankAccount = await coaRepo.getAccountByCode('1230201');
    
    if (!pettyCashAccount || !bankAccount) {
      const err = new Error('حسابات العهد النقدية غير موجودة في دليل الحسابات (12303, 1230201)');
      err.statusCode = 500;
      throw err;
    }
    
    const lines = [
      {
        account_id: pettyCashAccount.id,
        description: `إضافة أموال لصندوق ${fund.fund_name}`,
        debit_amount: amount,
        credit_amount: 0
      },
      {
        account_id: bankAccount.id,
        description: `تحويل بنكي لصندوق ${fund.fund_name}`,
        debit_amount: 0,
        credit_amount: amount
      }
    ];
    
    await journalService.createJournalEntry({
      description: `قيد إضافة Funds لصندوق ${fund.fund_name}`,
      reference_type: 'petty_cash_fund',
      reference_id: fundId,
      project_id: fund.project_id
    }, lines, currentUser);
    
    await client.query('COMMIT');
    
    return updatedFund;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Record expense from petty cash fund
 * Dr. Expense Account (32xxx) | Cr. Petty Cash (12404)
 */
async function recordExpense(fundId, data, currentUser) {
  const { expense_amount, expense_account_id, description, notes, receipt_url } = data;

  if (!expense_amount || expense_amount <= 0) {
    const err = new Error('المبلغ يجب أن يكون موجبًا');
    err.statusCode = 400;
    throw err;
  }

  if (!expense_account_id) {
    const err = new Error('حساب المصروف مطلوب');
    err.statusCode = 400;
    throw err;
  }

  const fund = await repo.getPettyCashFund(fundId);
  
  if (!fund) {
    const err = new Error('صندوق العهد غير موجود');
    err.statusCode = 404;
    throw err;
  }

  if (fund.status !== 'active') {
    const err = new Error('صندوق العهد غير نشط');
    err.statusCode = 400;
    throw err;
  }

  // Check sufficient balance
  if (fund.current_balance < expense_amount) {
    const err = new Error(`الرصيد غير كافٍ. الرصيد المتاح: ${fund.current_balance} ريال`);
    err.statusCode = 400;
    throw err;
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get expense account details
    const expenseAccount = await coaRepo.getAccountById(expense_account_id);
    if (!expenseAccount) {
      const err = new Error('حساب المصروف غير موجود في دليل الحسابات');
      err.statusCode = 400;
      throw err;
    }

    // Decrease fund balance
    const updatedFund = await repo.decreasePettyCashBalance(fundId, expense_amount);
    
    // Record transaction
    const transaction = await repo.recordTransaction({
      petty_cash_fund_id: fundId,
      transaction_type: 'expense',
      amount: expense_amount,
      balance_after: updatedFund.current_balance,
      description: description || 'مصروف من صندوق العهد',
      receipt_url: receipt_url || null,
      performed_by: currentUser.id
    });
    
    // Generate journal entry: Dr. Expense | Cr. Petty Cash (12303)
    const pettyCashAccount = await coaRepo.getAccountByCode('12303');
    
    if (!pettyCashAccount) {
      const err = new Error('حساب العهد النقدية غير موجود في دليل الحسابات (12303)');
      err.statusCode = 500;
      throw err;
    }
    
    const lines = [
      {
        account_id: expenseAccount.id,
        description: `مصروف - ${description || fund.fund_name}`,
        debit_amount: expense_amount,
        credit_amount: 0
      },
      {
        account_id: pettyCashAccount.id,
        description: `صرف من صندوق ${fund.fund_name}`,
        debit_amount: 0,
        credit_amount: expense_amount
      }
    ];
    
    await journalService.createJournalEntry({
      description: `قيد مصروف من صندوق عهد ${fund.fund_name}`,
      reference_type: 'petty_cash_expense',
      reference_id: transaction.id,
      project_id: fund.project_id
    }, lines, currentUser);
    
    await client.query('COMMIT');
    
    return { transaction, fund: updatedFund };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get fund details with transactions
 */
async function getFundDetails(fundId) {
  const fund = await repo.getPettyCashFund(fundId);
  
  if (!fund) {
    const err = new Error('صندوق العهد غير موجود');
    err.statusCode = 404;
    throw err;
  }
  
  const transactions = await repo.getFundTransactions(fundId);
  fund.transactions = transactions;
  
  return fund;
}

/**
 * Get all funds for engineer
 */
async function getEngineerFunds(engineerId) {
  return repo.getEngineerFunds(engineerId);
}

/**
 * Get total balance for engineer
 */
async function getEngineerTotalBalance(engineerId) {
  return repo.calculateEngineerTotalBalance(engineerId);
}

/**
 * Reconcile petty cash fund
 */
async function reconcileFund(fundId, currentUser) {
  const fund = await repo.getPettyCashFund(fundId);
  
  if (!fund) {
    const err = new Error('صندوق العهد غير موجود');
    err.statusCode = 404;
    throw err;
  }

  const reconciliationDate = new Date();
  const reconciled = await repo.reconcileFund(fundId, reconciliationDate);

  await notifyRole('finance_manager', {
    title: 'تم تسوية صندوق عهد',
    message: `تم تسوية صندوق "${fund.fund_name}" - الرصيد الحالي: ${fund.current_balance} ريال`,
    type: 'info',
    entity_type: 'petty_cash_fund',
    entity_id: fundId
  });

  return reconciled;
}

/**
 * Close petty cash fund
 */
async function closeFund(fundId, currentUser) {
  const fund = await repo.getPettyCashFund(fundId);
  
  if (!fund) {
    const err = new Error('صندوق العهد غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Check if balance is zero
  if (fund.current_balance !== 0) {
    const err = new Error('يجب تصفية الرصيد قبل إغلاق الصندوق');
    err.statusCode = 400;
    throw err;
  }

  return repo.closeFund(fundId);
}

/**
 * Get all petty cash expenses with filters
 */
async function getAllPettyCashExpenses(filters) {
  return repo.getAllPettyCashExpenses(filters);
}

module.exports = {
  createPettyCashFund,
  addFunds,
  recordExpense,
  getFundDetails,
  getEngineerFunds,
  getEngineerTotalBalance,
  reconcileFund,
  closeFund,
  getAllPettyCashExpenses,
};
