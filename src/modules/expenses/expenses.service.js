const { query } = require('../../db');
const repo = require('./expenses.repository');
const journalService = require('../journal-entries/journal-entries.service');
const coaRepo = require('../coa/coa.repository');
const pettyCashRepo = require('../petty-cash/petty-cash.repository');
const { notifyRole } = require('../../utils/notify');

// ============================================================================
// Expenses Service - Site Spending with Auto-Accounting
// ============================================================================

/**
 * Create expense with automatic journal entry generation
 */
async function createExpense(data, currentUser) {
  const {
    project_id, account_id, amount, payment_method,
    petty_cash_fund_id, description, notes, receipt_url
  } = data;

  // Validate required fields
  if (!project_id || !account_id || !amount || amount <= 0) {
    const err = new Error('جميع الحقول المطلوبة يجب تعبئتها');
    err.statusCode = 400;
    throw err;
  }

  // CRITICAL: Validate petty cash balance if paying from petty cash
  if (payment_method === 'petty_cash' && petty_cash_fund_id) {
    const availableBalance = await repo.getEngineerPettyCashBalance(petty_cash_fund_id);
    
    if (availableBalance < amount) {
      const err = new Error(`الرصيد غير كافٍ في صندوق العهد. المتاح: ${availableBalance} ريال`);
      err.statusCode = 400;
      throw err;
    }
  }

  const client = await query.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Generate expense number
    const expenseNumber = await generateExpenseNumber();
    
    // Create expense
    const expense = await repo.createExpense({
      expense_number: expenseNumber,
      project_id,
      account_id,
      amount,
      payment_method,
      petty_cash_fund_id,
      description,
      receipt_url,
      notes,
      created_by: currentUser.id
    });
    
    // Get COA account details
    const expenseAccount = await coaRepo.getAccountById(account_id);
    
    // CRITICAL: Auto-generate journal entry based on payment method
    let lines = [];
    
    if (payment_method === 'petty_cash') {
      // Dr. Project Expense Account | Cr. Petty Cash (1320)
      const pettyCashAccount = await coaRepo.getAccountByCode('1320');
      
      lines = [
        {
          account_id: expenseAccount.id,
          description: `مصروف مشروع - ${expenseNumber}`,
          debit_amount: amount,
          credit_amount: 0
        },
        {
          account_id: pettyCashAccount.id,
          description: `صرف من صندوق العهد - ${expenseNumber}`,
          debit_amount: 0,
          credit_amount: amount
        }
      ];
      
      // Decrease petty cash balance
      await repo.decreasePettyCashBalance(petty_cash_fund_id, amount);
      
      // Record petty cash transaction
      await repo.recordPettyCashTransaction({
        petty_cash_fund_id,
        transaction_type: 'expense',
        amount: amount,
        balance_after: await pettyCashRepo.calculateEngineerTotalBalance(currentUser.id).then(b => b.total_balance),
        expense_id: expense.id,
        description: `مصروف: ${description || expenseNumber}`,
        performed_by: currentUser.id
      });
      
    } else if (payment_method === 'cash') {
      // Dr. Expense Account | Cr. Cash on Hand (1310)
      const cashAccount = await coaRepo.getAccountByCode('1310');
      
      lines = [
        {
          account_id: expenseAccount.id,
          description: `مصروف نقدي - ${expenseNumber}`,
          debit_amount: amount,
          credit_amount: 0
        },
        {
          account_id: cashAccount.id,
          description: `صرف نقدية - ${expenseNumber}`,
          debit_amount: 0,
          credit_amount: amount
        }
      ];
      
    } else if (payment_method === 'bank_transfer' || payment_method === 'check') {
      // Dr. Expense Account | Cr. Bank Account (1330)
      const bankAccount = await coaRepo.getAccountByCode('1330');
      
      lines = [
        {
          account_id: expenseAccount.id,
          description: `تحويل بنكي - ${expenseNumber}`,
          debit_amount: amount,
          credit_amount: 0
        },
        {
          account_id: bankAccount.id,
          description: `دفع بنكي - ${expenseNumber}`,
          debit_amount: 0,
          credit_amount: amount
        }
      ];
    }
    
    // Create journal entry
    await journalService.createJournalEntry({
      description: `قيد مصروف ${expenseNumber}`,
      reference_type: 'expense',
      reference_id: expense.id,
      project_id: project_id
    }, lines, currentUser);
    
    await client.query('COMMIT');
    
    // Notifications
    await notifyRole('finance_manager', {
      title: 'تم تسجيل مصروف جديد',
      message: `تم تسجيل مصروف "${expenseNumber}" لمشروع "${project_id}" بقيمة ${amount} ريال`,
      type: 'info',
      entity_type: 'expense',
      entity_id: expense.id
    });
    
    return expense;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Approve expense
 */
async function approveExpense(id, currentUser) {
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  
  if (!['super_admin', 'general_manager', 'finance_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية الموافقة على المصروفات');
    err.statusCode = 403;
    throw err;
  }

  const updated = await repo.updateExpenseStatus(id, 'approved');
  
  await notifyRole('finance_manager', {
    title: 'تمت الموافقة على مصروف',
    message: `تمت الموافقة على المصروف رقم ${id}`,
    type: 'success',
    entity_type: 'expense',
    entity_id: id
  });
  
  return updated;
}

/**
 * Reject expense
 */
async function rejectExpense(id, reason, currentUser) {
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  
  if (!['super_admin', 'general_manager', 'finance_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية رفض المصروفات');
    err.statusCode = 403;
    throw err;
  }

  const updated = await repo.updateExpenseStatus(id, 'rejected');
  
  await notifyRole('finance_manager', {
    title: 'تم رفض مصروف',
    message: `تم رفض المصروف رقم ${id}: ${reason}`,
    type: 'warning',
    entity_type: 'expense',
    entity_id: id
  });
  
  return updated;
}

/**
 * Get expense by ID
 */
async function getExpenseById(id) {
  return repo.getExpenseById(id);
}

/**
 * Get all expenses for project
 */
async function getProjectExpenses(projectId) {
  return repo.getProjectExpenses(projectId);
}

/**
 * Get total project expenses
 */
async function getTotalProjectExpenses(projectId) {
  return repo.getTotalProjectExpenses(projectId);
}

/**
 * Generate unique expense number
 */
async function generateExpenseNumber() {
  const result = await query(
    `SELECT 'EXP-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
            LPAD((COUNT(*) + 1)::TEXT, 4, '0') as expense_number
     FROM expenses
     WHERE expense_date = CURRENT_DATE`
  );
  
  return result.rows[0].expense_number;
}

module.exports = {
  createExpense,
  approveExpense,
  rejectExpense,
  getExpenseById,
  getProjectExpenses,
  getTotalProjectExpenses,
};
