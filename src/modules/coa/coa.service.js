const repo = require('./coa.repository');

// ============================================================================
// Chart of Accounts Service - Recursive Tree Operations
// ============================================================================

/**
 * Get full account tree structure
 */
async function getAccountTree() {
  const flatAccounts = await repo.getAccountTree();
  return repo.buildTreeStructure(flatAccounts);
}

/**
 * Get account by ID with validation
 */
async function getAccountById(id) {
  const account = await repo.getAccountById(id);
  
  if (!account) {
    const err = new Error('حساب دليل الحسابات غير موجود');
    err.statusCode = 404;
    throw err;
  }
  
  return account;
}

/**
 * Get account by code
 */
async function getAccountByCode(code) {
  const account = await repo.getAccountByCode(code);
  
  if (!account) {
    const err = new Error('رمز حساب دليل الحسابات غير صحيح');
    err.statusCode = 404;
    throw err;
  }
  
  return account;
}

/**
 * Create new account with validation
 */
async function createAccount(data, currentUser) {
  const {
    account_code, account_name, account_name_ar, account_type, parent_id,
    level, normal_balance, description, is_vat_applicable, vat_rate,
    cost_center_type, linked_entity_id, financial_statement, report_category,
    depreciation_method, useful_life_years, salvage_value
  } = data;

  // Validate required fields
  if (!account_code || !account_name || !account_type) {
    const err = new Error('جميع الحقول المطلوبة يجب تعبئتها');
    err.statusCode = 400;
    throw err;
  }

  // Validate Arabic name for bilingual support
  if (!account_name_ar) {
    const err = new Error('الاسم العربي للحساب مطلوب');
    err.statusCode = 400;
    throw err;
  }

  // Validate account type
  const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
  if (!validTypes.includes(account_type)) {
    const err = new Error('نوع الحساب غير صحيح');
    err.statusCode = 400;
    throw err;
  }

  // Check if code already exists
  const existing = await repo.getAccountByCode(account_code);
  if (existing) {
    const err = new Error('رمز الحساب يجب أن يكون فريدًا');
    err.statusCode = 400;
    throw err;
  }

  // If parent provided, verify it exists and is active
  if (parent_id) {
    const parent = await repo.getAccountById(parent_id);
    if (!parent || !parent.is_active) {
      const err = new Error('الحساب الأب غير موجود أو غير نشط');
      err.statusCode = 400;
      throw err;
    }
    
    // Verify level is parent level + 1
    if (level !== parent.level + 1) {
      const err = new Error('مستوى الحساب يجب أن يكون مستوى الأب + 1');
      err.statusCode = 400;
      throw err;
    }
  }

  // Validate normal balance based on account type
  const validBalances = {
    asset: 'debit',
    liability: 'credit',
    equity: 'credit',
    revenue: 'credit',
    expense: 'debit'
  };
  
  if (!normal_balance) {
    // Auto-set default normal balance
    data.normal_balance = validBalances[account_type];
  } else if (normal_balance !== validBalances[account_type]) {
    const err = new Error(`الرصيد الطبيعي لنوع الحساب ${account_type} يجب أن يكون ${validBalances[account_type]}`);
    err.statusCode = 400;
    throw err;
  }

  // Validate VAT configuration
  if (is_vat_applicable && (!vat_rate || vat_rate <= 0)) {
    data.vat_rate = 15.00; // Default to 15% Saudi VAT
  }

  // Validate cost center linking
  if (cost_center_type && !linked_entity_id) {
    // Warning but not error - entity can be linked later
    console.warn(`Account ${account_code} has cost_center_type '${cost_center_type}' but no linked_entity_id`);
  }

  // Create the account
  const account = await repo.createAccount({
    account_code,
    account_name,
    account_name_ar,
    account_type,
    parent_id,
    level: level || 1,
    normal_balance: data.normal_balance,
    description,
    is_vat_applicable: is_vat_applicable || false,
    vat_rate: data.vat_rate || 15.00,
    cost_center_type,
    linked_entity_id,
    financial_statement,
    report_category,
    depreciation_method,
    useful_life_years,
    salvage_value: salvage_value || 0
  });

  return account;
}

/**
 * Update account information
 */
async function updateAccount(id, data, currentUser) {
  const account = await getAccountById(id);

  // Cannot change account code
  if (data.account_code) {
    const err = new Error('لا يمكن تغيير رمز الحساب بعد الإنشاء');
    err.statusCode = 400;
    throw err;
  }

  // Cannot deactivate if has children
  if (data.is_active === false) {
    const children = await repo.getChildrenAccounts(id);
    if (children.length > 0) {
      const err = new Error('لا يمكن تعطيل الحساب لأنه يحتوي على حسابات فرعية');
      err.statusCode = 400;
      throw err;
    }
  }

  const updated = await repo.updateAccount(id, data);
  return updated;
}

/**
 * Search accounts
 */
async function searchAccounts(searchTerm) {
  if (!searchTerm || searchTerm.length < 2) {
    const err = new Error('يجب إدخال كلمة بحث صحيحة (حرفين على الأقل)');
    err.statusCode = 400;
    throw err;
  }
  
  return repo.searchAccounts(searchTerm);
}

/**
 * Get accounts by type
 */
async function getAccountsByType(accountType) {
  const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
  
  if (!validTypes.includes(accountType)) {
    const err = new Error('نوع الحساب غير صحيح');
    err.statusCode = 400;
    throw err;
  }
  
  return repo.getAccountsByType(accountType);
}

/**
 * Deactivate account
 */
async function deactivateAccount(id, currentUser) {
  const account = await getAccountById(id);
  
  // Check if has children
  const children = await repo.getChildrenAccounts(id);
  if (children.length > 0) {
    const err = new Error('لا يمكن تعطيل الحساب لأنه يحتوي على حسابات فرعية');
    err.statusCode = 400;
    throw err;
  }
  
  // Check if used in journal entries
  const sql = `SELECT EXISTS(SELECT 1 FROM journal_entry_lines WHERE account_id = $1 LIMIT 1) as used`;
  const { query } = require('../../db');
  const result = await query(sql, [id]);
  
  if (result.rows[0].used) {
    const err = new Error('لا يمكن تعطيل الحساب لأنه مستخدم في قيود محاسبية');
    err.statusCode = 400;
    throw err;
  }
  
  return repo.deactivateAccount(id);
}

module.exports = {
  getAccountTree,
  getAccountById,
  getAccountByCode,
  createAccount,
  updateAccount,
  searchAccounts,
  getAccountsByType,
  deactivateAccount,
};
