const service = require('./expense-voucher.service');
const { authMiddleware } = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role');

/**
 * Create expense voucher
 * POST /api/finance/expenses
 */
async function createVoucher(req, res) {
  try {
    const { expense_date, expense_amount, expense_account_id, payment_account_id, payment_method, description, reference_number, notes } = req.body;
    
    // DETAILED VALIDATION WITH EXACT ERROR MESSAGES
    if (!expense_amount) {
      console.error('❌ VALIDATION FAILED: expense_amount is missing/undefined');
      console.error('   Received:', expense_amount, 'Type:', typeof expense_amount);
      return res.status(400).json({ 
        error: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر',
        field: 'expense_amount',
        received: expense_amount,
        type: typeof expense_amount
      });
    }
    
    if (expense_amount <= 0) {
      console.error('❌ VALIDATION FAILED: expense_amount <= 0');
      console.error('   Received:', expense_amount);
      return res.status(400).json({ 
        error: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر',
        field: 'expense_amount',
        received: expense_amount
      });
    }
    
    if (!expense_account_id) {
      console.error('❌ VALIDATION FAILED: expense_account_id is missing');
      console.error('   Received:', expense_account_id, 'Type:', typeof expense_account_id);
      return res.status(400).json({ 
        error: 'حساب المصروف مطلوب',
        field: 'expense_account_id',
        received: expense_account_id,
        type: typeof expense_account_id
      });
    }
    
    if (!payment_account_id) {
      console.error('❌ VALIDATION FAILED: payment_account_id is missing');
      console.error('   Received:', payment_account_id, 'Type:', typeof payment_account_id);
      return res.status(400).json({ 
        error: 'حساب الدفع مطلوب',
        field: 'payment_account_id',
        received: payment_account_id,
        type: typeof payment_account_id
      });
    }
    
    if (!description) {
      console.error('❌ VALIDATION FAILED: description is missing');
      console.error('   Received:', description, 'Type:', typeof description);
      return res.status(400).json({ 
        error: 'الوصف مطلوب',
        field: 'description',
        received: description,
        type: typeof description
      });
    }
    
    
    const result = await service.createExpenseVoucher(req.body, req.user.id);
    
    res.status(201).json({
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('❌ Error creating expense voucher:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error statusCode:', error.statusCode);
    
    // Return detailed error for debugging
    res.status(error.statusCode || 500).json({ 
      error: error.message,
      statusCode: error.statusCode || 500,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Get all expense vouchers
 * GET /api/finance/expenses
 */
async function getAllVouchers(req, res) {
  try {
    const vouchers = await service.getAllVouchers(req.query);
    
    res.json({
      data: vouchers,
      count: vouchers.length
    });
  } catch (error) {
    console.error('Error fetching expense vouchers:', error);
    res.status(500).json({ error: 'فشل في جلب سندات المصروفات' });
  }
}

/**
 * Get expense voucher by ID
 * GET /api/finance/expenses/:id
 */
async function getVoucherById(req, res) {
  try {
    const voucher = await service.getVoucherById(req.params.id);
    
    if (!voucher) {
      return res.status(404).json({ error: 'سند المصروف غير موجود' });
    }
    
    res.json({
      data: voucher
    });
  } catch (error) {
    console.error('Error fetching expense voucher:', error);
    res.status(500).json({ error: 'فشل في جلب سند المصروف' });
  }
}

/**
 * Get expense accounts (32xxx branch)
 * GET /api/finance/expenses/accounts/expense
 */
async function getExpenseAccounts(req, res) {
  try {
    const accounts = await service.getExpenseAccounts();
    
    res.json({
      data: accounts
    });
  } catch (error) {
    console.error('Error fetching expense accounts:', error);
    res.status(500).json({ error: 'فشل في جلب حسابات المصروفات' });
  }
}

/**
 * Get payment accounts (12301, 122)
 * GET /api/finance/expenses/accounts/payment
 */
async function getPaymentAccounts(req, res) {
  try {
    const accounts = await service.getPaymentAccounts();
    
    res.json({
      data: accounts
    });
  } catch (error) {
    console.error('Error fetching payment accounts:', error);
    res.status(500).json({ error: 'فشل في جلب حسابات الدفع' });
  }
}

const router = require('express').Router();

// All routes require authentication
router.use(authMiddleware);

// All routes require authentication and finance role
router.post('/expenses', roleMiddleware(['super_admin', 'general_manager', 'finance_manager']), createVoucher);
router.get('/expenses', roleMiddleware(['super_admin', 'general_manager', 'finance_manager']), getAllVouchers);
router.get('/expenses/:id', roleMiddleware(['super_admin', 'general_manager', 'finance_manager']), getVoucherById);
router.get('/expenses/accounts/expense', roleMiddleware(['super_admin', 'general_manager', 'finance_manager']), getExpenseAccounts);
router.get('/expenses/accounts/payment', roleMiddleware(['super_admin', 'general_manager', 'finance_manager']), getPaymentAccounts);

module.exports = router;
