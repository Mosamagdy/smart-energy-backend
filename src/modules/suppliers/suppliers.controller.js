const service = require('./suppliers.service');

// ============================================================================
// Suppliers Controller - Request Handler Layer
// ============================================================================

/**
 * POST /api/suppliers
 * Create new supplier
 */
async function createSupplier(req, res, next) {
  try {
    const supplier = await service.createSupplier(req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء المورد بنجاح',
      data: supplier
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/suppliers
 * Get all suppliers with optional filters
 */
async function getAllSuppliers(req, res, next) {
  try {
    const { supplier_type, is_active } = req.query;
    const filters = {};
    
    if (supplier_type) filters.supplier_type = supplier_type;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const suppliers = await service.getAllSuppliers(filters);
    res.status(200).json({
      status: 'success',
      data: suppliers
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/suppliers/:id
 * Get supplier by ID
 */
async function getSupplierById(req, res, next) {
  try {
    const supplier = await service.getSupplierById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: supplier
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/suppliers/:id
 * Update supplier
 */
async function updateSupplier(req, res, next) {
  try {
    const supplier = await service.updateSupplier(req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'تم تحديث المورد بنجاح',
      data: supplier
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/suppliers/:id/statement
 * Get supplier statement (invoices + payments)
 */
async function getSupplierStatement(req, res, next) {
  try {
    const statement = await service.getSupplierStatement(req.params.id);
    res.status(200).json({
      status: 'success',
      data: statement
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  getSupplierStatement
};
