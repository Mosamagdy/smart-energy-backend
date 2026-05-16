const repo = require('./supplier-statement.repository');

/**
 * Get supplier statement with date range filter
 */
async function getSupplierStatement(supplierId, filters = {}) {
  console.log('[Supplier Statement] === FETCHING STATEMENT ===');
  console.log('[Supplier Statement] Supplier ID:', supplierId);
  console.log('[Supplier Statement] Filters:', filters);

  try {
    const statement = await repo.getSupplierStatement(supplierId, filters);
    
    console.log('[Supplier Statement] === STATEMENT GENERATED ===');
    console.log('[Supplier Statement] Supplier:', statement.supplier.name);
    console.log('[Supplier Statement] Total Invoices:', statement.summary.total_invoices_amount);
    console.log('[Supplier Statement] Total Paid:', statement.summary.total_paid_amount);
    console.log('[Supplier Statement] Balance Due:', statement.summary.balance_due);
    console.log('[Supplier Statement] Transactions Count:', statement.transactions.length);
    
    return statement;
  } catch (error) {
    console.error('[Supplier Statement] ❌ Failed to generate statement:', error.message);
    throw error;
  }
}

/**
 * Get all suppliers with summary
 */
async function getAllSuppliersWithSummary() {
  return repo.getAllSuppliersWithSummary();
}

module.exports = {
  getSupplierStatement,
  getAllSuppliersWithSummary
};
