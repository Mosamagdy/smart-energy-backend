const { pool } = require('../../db');
const repo = require('./inventory.repository');

// ============================================================================
// Inventory Service - Business Logic Layer
// ============================================================================

const VALID_CATEGORIES = ['solar_panel', 'inverter', 'cable', 'accessory', 'other'];

function normalizeRole(role) {
  return typeof role === 'string' ? role.toLowerCase() : '';
}

function isWarehouseScopedRole(role) {
  const r = normalizeRole(role);
  return r === 'warehouse_manager' || r === 'inventory_manager';
}

/**
 * Create inventory item
 */
async function createItem(data, currentUser) {
  const { item_name, item_name_ar, category, unit_of_measure, unit_cost, reorder_level, notes } = data;

  console.log('[Create Item Service] Received data:', JSON.stringify(data, null, 2));

  // Validate required fields (relaxed - only essential fields)
  if (!item_name || !category) {
    const err = new Error('اسم الصنف والفئة مطلوبان');
    err.statusCode = 400;
    throw err;
  }

  // Map 'piece' to 'pcs' (database constraint requires 'pcs', not 'piece')
  let normalizedUom = unit_of_measure || 'pcs';
  if (normalizedUom.toLowerCase() === 'piece' || normalizedUom.toLowerCase() === 'pieces') {
    normalizedUom = 'pcs';
  }
  
  // Validate UOM against database constraint
  const VALID_UOMS = ['pcs', 'm', 'kg', 'set', 'box', 'roll'];
  if (!VALID_UOMS.includes(normalizedUom)) {
    console.warn(`[Create Item Service] Invalid UOM '${normalizedUom}', defaulting to 'pcs'`);
    normalizedUom = 'pcs';
  }

  // Validate and normalize category
  const VALID_CATEGORIES = ['solar_panel', 'inverter', 'cable', 'accessory', 'other'];
  let normalizedCategory = category.toLowerCase();
  if (!VALID_CATEGORIES.includes(normalizedCategory)) {
    console.warn(`[Create Item Service] Invalid category '${normalizedCategory}', defaulting to 'other'`);
    normalizedCategory = 'other';
  }

  // Generate item code
  const itemCode = await repo.generateItemCode();
  console.log('[Create Item Service] Generated item code:', itemCode);

  // Set default account codes for Smart Energy chart of accounts
  const coa_account_code = data.coa_account_code || '123'; // Inventory account per company COA
  const cost_account_code = data.cost_account_code || '331'; // COGS account per company COA
  
  console.log('[Create Item Service] Using account codes:', { coa_account_code, cost_account_code });
  console.log('[Create Item Service] Normalized UOM:', normalizedUom, '| Category:', normalizedCategory);

  const item = await repo.createItem({
    item_code: itemCode,
    item_name,
    item_name_ar: item_name_ar || item_name,
    category: normalizedCategory,
    unit_of_measure: normalizedUom,
    unit_cost: unit_cost || 0,
    reorder_level: reorder_level || 0,
    coa_account_code,
    cost_account_code,
    created_by: currentUser?.id || 1,
    notes: notes || ''
  });

  console.log('[Create Item Service] ✅ Item created:', item.id);

  return item;
}

/**
 * Get all items with filters
 */
async function getAllItems(filters = {}) {
  return repo.getAllItems(filters);
}

/**
 * Get items with stock levels for a specific warehouse
 */
async function getItemsByWarehouse(warehouseId, filters = {}, currentUser = null) {
  return repo.getItemsByWarehouse(warehouseId, filters, currentUser);
}

/**
 * Get item by ID
 */
async function getItemById(id) {
  const item = await repo.getItemById(id);
  
  if (!item) {
    const err = new Error('الصنف غير موجود');
    err.statusCode = 404;
    throw err;
  }

  return item;
}

/**
 * Update item
 */
async function updateItem(id, data, currentUser) {
  const item = await repo.updateItem(id, data);
  
  if (!item) {
    const err = new Error('الصنف غير موجود');
    err.statusCode = 404;
    throw err;
  }

  return item;
}

/**
 * Get low stock report
 */
async function getLowStockReport() {
  const items = await repo.getLowStockItems();

  const reportItems = items.map(item => {
    const quantity = parseFloat(item.quantity_on_hand);
    const reorderLevel = parseFloat(item.reorder_level);
    const shortage = reorderLevel - quantity;
    const percentage = reorderLevel > 0 ? ((quantity / reorderLevel) * 100).toFixed(1) : 0;

    return {
      id: item.id,
      item_code: item.item_code,
      item_name: item.item_name,
      item_name_ar: item.item_name_ar,
      category: item.category,
      quantity_on_hand: quantity,
      reorder_level: reorderLevel,
      shortage: parseFloat(shortage.toFixed(2)),
      stock_percentage: parseFloat(percentage),
      unit_of_measure: item.unit_of_measure
    };
  });

  return {
    items: reportItems,
    count: reportItems.length,
    generated_at: new Date().toISOString()
  };
}

/**
 * ✅ Get distinct inventory categories
 */
async function getCategories() {
  return repo.getCategories();
}

/**
 * ✅ Get inventory items with warehouse stock
 */
async function getInventoryWithWarehouse(filters = {}, currentUser = null) {
  return repo.getInventoryWithWarehouse(filters, currentUser);
}

/**
 * ✅ Get inventory summary statistics
 */
async function getInventorySummary() {
  return repo.getInventorySummary();
}

/**
 * ✅ Adjust warehouse-specific stock
 */
async function adjustWarehouseStock(warehouseId, itemId, quantity, movementType, referenceType, referenceId, notes, userId = 1, projectId = null) {
  return repo.adjustWarehouseStock(warehouseId, itemId, quantity, movementType, referenceType, referenceId, notes, userId, projectId);
}

/**
 * ✅ Check available stock in warehouse
 */
async function getAvailableStock(warehouseId, itemId) {
  return repo.getAvailableStock(warehouseId, itemId);
}

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  getLowStockReport,
  getCategories,
  getInventoryWithWarehouse,
  getInventorySummary,
  adjustWarehouseStock,
  getAvailableStock,
  getItemsByWarehouse,
  VALID_CATEGORIES
};