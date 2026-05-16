const service = require('./coa.service');

// ============================================================================
// Chart of Accounts Controller - HTTP Request Handlers
// ============================================================================

/**
 * GET /api/coa/tree
 * Get full account tree structure
 */
async function getAccountTree(req, res, next) {
  try {
    const tree = await service.getAccountTree();
    
    res.status(200).json({
      status: 'success',
      data: { tree, count: tree.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/coa/:id
 * Get single account details with path from root
 */
async function getAccountById(req, res, next) {
  try {
    const account = await service.getAccountById(req.params.id);
    
    res.status(200).json({
      status: 'success',
      data: { account }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/coa/code/:code
 * Get account by code
 */
async function getAccountByCode(req, res, next) {
  try {
    const account = await service.getAccountByCode(req.params.code);
    
    res.status(200).json({
      status: 'success',
      data: { account }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/coa
 * Create new account
 */
async function createAccount(req, res, next) {
  try {
    const account = await service.createAccount(req.body, req.user);
    
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء الحساب بنجاح',
      data: { account }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/coa/:id
 * Update account information
 */
async function updateAccount(req, res, next) {
  try {
    const account = await service.updateAccount(req.params.id, req.body, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تم تحديث الحساب',
      data: { account }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/coa/search/:term
 * Search accounts
 */
async function searchAccounts(req, res, next) {
  try {
    const searchTerm = req.params.term;
    const accounts = await service.searchAccounts(searchTerm);
    
    res.status(200).json({
      status: 'success',
      data: { accounts, count: accounts.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/coa/type/:type
 * Get accounts by type
 */
async function getAccountsByType(req, res, next) {
  try {
    const accounts = await service.getAccountsByType(req.params.type);
    
    res.status(200).json({
      status: 'success',
      data: { accounts, count: accounts.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/coa/:id/deactivate
 * Deactivate account
 */
async function deactivateAccount(req, res, next) {
  try {
    const account = await service.deactivateAccount(req.params.id, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تم تعطيل الحساب بنجاح',
      data: { account }
    });
  } catch (err) {
    next(err);
  }
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
