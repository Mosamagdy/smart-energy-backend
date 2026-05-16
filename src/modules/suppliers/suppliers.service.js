const { pool } = require('../../db');
const repo = require('./suppliers.repository');

// ============================================================================
// Suppliers Service - Business Logic Layer
// ============================================================================

/**
 * Create supplier
 */
async function createSupplier(data, currentUser) {
  const { name, supplier_type } = data;

  // Validate required fields
  if (!name || !supplier_type) {
    const err = new Error('اسم المورد ونوع المورد مطلوبان');
    err.statusCode = 400;
    throw err;
  }

  // Validate supplier type
  if (!['local', 'foreign'].includes(supplier_type)) {
    const err = new Error('نوع المورد يجب أن يكون: local أو foreign');
    err.statusCode = 400;
    throw err;
  }

  // Auto-assign COA account based on type
  const coa_account_code = supplier_type === 'local' ? '21301' : '21302';

  // Generate supplier code
  const supplierCode = await repo.generateSupplierCode();

  const supplier = await repo.createSupplier({
    ...data,
    supplier_code: supplierCode,
    coa_account_code,
    created_by: currentUser.id
  });

  return supplier;
}

/**
 * Get all suppliers with filters
 */
async function getAllSuppliers(filters = {}) {
  return repo.getAllSuppliers(filters);
}

/**
 * Get supplier by ID
 */
async function getSupplierById(id) {
  const supplier = await repo.getSupplierById(id);
  
  if (!supplier) {
    const err = new Error('المورد غير موجود');
    err.statusCode = 404;
    throw err;
  }

  return supplier;
}

/**
 * Update supplier
 */
async function updateSupplier(id, data, currentUser) {
  const supplier = await repo.updateSupplier(id, data);
  
  if (!supplier) {
    const err = new Error('المورد غير موجود');
    err.statusCode = 404;
    throw err;
  }

  return supplier;
}

/**
 * Get supplier statement (all invoices + payments)
 */
async function getSupplierStatement(supplierId) {
  // Verify supplier exists
  const supplier = await repo.getSupplierById(supplierId);
  
  if (!supplier) {
    const err = new Error('المورد غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Get balance
  const balance = await repo.getSupplierBalance(supplierId);

  // Get statement
  const statement = await repo.getSupplierStatement(supplierId);

  return {
    supplier,
    balance: {
      outstanding_balance: parseFloat(balance.outstanding_balance.toFixed(2)),
      unpaid_invoices_count: parseInt(balance.unpaid_invoices_count)
    },
    statement
  };
}

module.exports = {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  getSupplierStatement
};
