const service = require('./warehouse.service');

// ============================================================================
// Warehouse Controller - Request Handler Layer
// ============================================================================

/**
 * POST /api/warehouses
 * Create new warehouse
 */
async function createWarehouse(req, res, next) {
  try {
    const warehouse = await service.createWarehouse(req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء المستودع بنجاح',
      data: warehouse
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/warehouses
 * Get all warehouses with optional filters
 */
async function getAllWarehouses(req, res, next) {
  try {
    const { is_active } = req.query;
    const filters = {};
    
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const warehouses = await service.getAllWarehouses(filters, req.user);
    res.status(200).json({
      status: 'success',
      data: warehouses
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/warehouses/summary
 * Get warehouses with stock summary
 */
async function getWarehousesSummary(req, res, next) {
  try {
    const summary = await service.getWarehousesWithStockSummary();
    res.status(200).json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/warehouses/:id
 * Get warehouse by ID
 */
async function getWarehouseById(req, res, next) {
  try {
    const id = req.params.id;
    
    // Safety check: Ensure ID is a valid number
    if (isNaN(id) || parseInt(id) <= 0) {
      const error = new Error('معرف المستودع غير صالح');
      error.statusCode = 400;
      return next(error);
    }
    
    const warehouse = await service.getWarehouseById(parseInt(id), req.user);
    res.status(200).json({
      status: 'success',
      data: warehouse
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/warehouses/:id
 * Update warehouse
 */
async function updateWarehouse(req, res, next) {
  try {
    const warehouse = await service.updateWarehouse(req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'تم تحديث المستودع بنجاح',
      data: warehouse
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/warehouses/:id
 * Delete warehouse (soft delete)
 */
async function deleteWarehouse(req, res, next) {
  try {
    const warehouse = await service.deleteWarehouse(req.params.id);
    res.status(200).json({
      status: 'success',
      message: 'تم حذف المستودع بنجاح',
      data: warehouse
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/warehouses/:id/stock
 * Get warehouse stock levels
 */
async function getWarehouseStock(req, res, next) {
  try {
    const id = req.params.id;
    
    if (isNaN(id) || parseInt(id) <= 0) {
      const error = new Error('معرف المستودع غير صالح');
      error.statusCode = 400;
      return next(error);
    }
    
    const stock = await service.getWarehouseStock(parseInt(id), req.user);
    res.status(200).json({
      status: 'success',
      data: stock
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createWarehouse,
  getAllWarehouses,
  getWarehousesSummary,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  getWarehouseStock
};
