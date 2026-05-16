const service = require('./inventory.service');

// ============================================================================
// Inventory Controller - Request Handler Layer
// ============================================================================

/**
 * POST /api/inventory
 * Create new inventory item
 */
async function createItem(req, res, next) {
  try {
    console.log('[Create Item] ===== REQUEST RECEIVED =====');
    console.log('[Create Item] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[Create Item] User:', req.user);
    
    // Ensure numeric fields are numbers
    const itemData = {
      ...req.body,
      unit_cost: parseFloat(req.body.unit_cost) || 0,
      reorder_level: parseFloat(req.body.reorder_level) || 0
    };
    
    console.log('[Create Item] Processed data:', JSON.stringify(itemData, null, 2));
    
    const item = await service.createItem(itemData, req.user);
    
    console.log('[Create Item] ✅ Item created successfully:', item.id);
    
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء الصنف بنجاح',
      data: item
    });
  } catch (error) {
    console.error('[Create Item] ❌ ERROR:', error.message);
    console.error('[Create Item] Stack:', error.stack);
    next(error);
  }
}

/**
 * GET /api/inventory
 * Get all items with optional filters
 */
async function getAllItems(req, res, next) {
  try {
    const { category, is_active } = req.query;
    const filters = {};
    
    if (category) filters.category = category;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const items = await service.getAllItems(filters);
    res.status(200).json({
      status: 'success',
      data: items
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/inventory/by-warehouse/:warehouseId
 * Get items with stock levels for a specific warehouse
 */
async function getItemsByWarehouse(req, res, next) {
  try {
    const { warehouseId } = req.params;
    const { category, is_active } = req.query;
    
    const filters = {};
    if (category) filters.category = category;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const items = await service.getItemsByWarehouse(parseInt(warehouseId), filters, req.user);
    res.status(200).json({
      status: 'success',
      data: items
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/inventory/low-stock
 * Get low stock report
 */
async function getLowStockReport(req, res, next) {
  try {
    const report = await service.getLowStockReport();
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/inventory/:id
 * Get item by ID
 */
async function getItemById(req, res, next) {
  try {
    const id = req.params.id;
    
    // Safety check: Ensure ID is a valid number to prevent 22P02 error
    if (isNaN(id) || parseInt(id) <= 0) {
      const error = new Error('معرف الصنف غير صالح');
      error.statusCode = 400;
      return next(error);
    }
    
    const item = await service.getItemById(parseInt(id));
    res.status(200).json({
      status: 'success',
      data: item
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/inventory/:id
 * Update item
 */
async function updateItem(req, res, next) {
  try {
    const item = await service.updateItem(req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'تم تحديث الصنف بنجاح',
      data: item
    });
  } catch (error) {
    next(error);
  }
}

/**
 * ✅ GET /api/inventory/categories
 * Get distinct inventory categories
 */
async function getCategories(req, res, next) {
  try {
    const categories = await service.getCategories();
    res.status(200).json({
      status: 'success',
      data: { categories }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * ✅ GET /api/inventory/dashboard
 * Get inventory items with warehouse stock
 */
async function getInventoryDashboard(req, res, next) {
  try {
    console.log('[Inventory Dashboard] ===== REQUEST =====');
    const { warehouse_id, category, is_active } = req.query;
    const filters = {};
    
    if (warehouse_id) filters.warehouse_id = parseInt(warehouse_id);
    if (category) filters.category = category;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    console.log('[Inventory Dashboard] Filters:', filters);

    const items = await service.getInventoryWithWarehouse(filters, req.user);
    
    console.log(`[Inventory Dashboard] ✅ Returning ${items.length} items`);
    if (items.length > 0) {
      console.log('[Inventory Dashboard] Sample item:', JSON.stringify(items[0], null, 2));
    }
    
    res.status(200).json({
      status: 'success',
      data: items
    });
  } catch (error) {
    console.error('[Inventory Dashboard] ❌ ERROR:', error.message);
    console.error('[Inventory Dashboard] Stack:', error.stack);
    next(error);
  }
}

/**
 * ✅ GET /api/inventory/summary
 * Get inventory summary statistics
 */
async function getInventorySummary(req, res, next) {
  try {
    const summary = await service.getInventorySummary();
    res.status(200).json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    next(error);
  }
}

/**
 * ✅ POST /api/inventory/stock-in
 * Add stock to warehouse (Goods Receipt)
 */
async function stockIn(req, res, next) {
  try {
    const { item_id, warehouse_id, quantity, movement_type = 'in', notes = '' } = req.body;
    const userId = req.user?.id;

    // Validate required fields
    if (!item_id || !warehouse_id || !quantity || quantity <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'الصنف والمستودع والكمية مطلوبة',
        message_en: 'Item, warehouse, and quantity are required'
      });
    }

    // Add stock
    const result = await service.adjustWarehouseStock(
      warehouse_id,
      item_id,
      quantity, // Positive for stock in
      movement_type,
      'manual_adjustment',
      null,
      notes || 'Stock receipt',
      userId
    );

    res.status(200).json({
      status: 'success',
      message: 'تم إضافة المخزون بنجاح',
      message_en: 'Stock added successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createItem,
  getAllItems,
  getLowStockReport,
  getItemById,
  updateItem,
  getCategories,
  getInventoryDashboard,
  getInventorySummary,
  stockIn,
  getItemsByWarehouse  
};
