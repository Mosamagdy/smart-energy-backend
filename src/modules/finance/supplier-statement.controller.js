const service = require('./supplier-statement.service');

/**
 * GET /api/finance/suppliers/:id/statement
 * Get supplier account statement with transaction history
 */
async function getSupplierStatement(req, res, next) {
  try {
    const supplierId = req.params.id;
    const { start_date, end_date } = req.query;

    console.log('[Supplier Statement Controller] Request received');
    console.log('[Supplier Statement Controller] Supplier ID:', supplierId);
    console.log('[Supplier Statement Controller] Date Range:', { start_date, end_date });

    const filters = {};
    if (start_date) filters.startDate = start_date;
    if (end_date) filters.endDate = end_date;

    const statement = await service.getSupplierStatement(supplierId, filters);

    res.status(200).json({
      status: 'success',
      data: statement
    });
  } catch (error) {
    console.error('[Supplier Statement Controller] Error:', error.message);
    next(error);
  }
}

/**
 * GET /api/finance/suppliers/statements/summary
 * Get all suppliers with balance summary
 */
async function getSuppliersSummary(req, res, next) {
  try {
    const suppliers = await service.getAllSuppliersWithSummary();

    res.status(200).json({
      status: 'success',
      data: suppliers
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSupplierStatement,
  getSuppliersSummary
};
