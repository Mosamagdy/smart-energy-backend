const repo = require('./warehouse.repository');

// ============================================================================
// Warehouse Service - Business Logic Layer
// ============================================================================

function normalizeRole(role) {
  return typeof role === 'string' ? role.toLowerCase() : '';
}

function isWarehouseScopedRole(role) {
  const r = normalizeRole(role);
  return r === 'warehouse_manager' || r === 'inventory_manager';
}

async function assertWarehouseAccess(warehouseId, currentUser) {
  if (!currentUser) return;
  const role = normalizeRole(currentUser.role || currentUser.role_name);
  if (!isWarehouseScopedRole(role)) return;

  const ok = await repo.isWarehouseManagedByUser(warehouseId, currentUser.id);
  if (!ok) {
    const err = new Error('ليس لديك صلاحية الوصول لهذا المستودع');
    err.statusCode = 403;
    throw err;
  }
}

/**
 * Create warehouse
 */
async function createWarehouse(data, currentUser) {
  const { warehouse_name, location } = data;

  // Validate required fields
  if (!warehouse_name || !location) {
    const err = new Error('جميع الحقول المطلوبة يجب تعبئتها: warehouse_name, location');
    err.statusCode = 400;
    throw err;
  }

  // Generate warehouse code
  const warehouseCode = await repo.generateWarehouseCode();

  const warehouse = await repo.createWarehouse({
    ...data,
    warehouse_code: warehouseCode,
    created_by: currentUser.id
  });

  return warehouse;
}

/**
 * Get all warehouses with filters
 */
async function getAllWarehouses(filters = {}, currentUser = null) {
  return repo.getAllWarehouses(filters, currentUser);
}

/**
 * Get warehouse by ID
 */
async function getWarehouseById(id, currentUser = null) {
  await assertWarehouseAccess(id, currentUser);
  const warehouse = await repo.getWarehouseById(id);
  
  if (!warehouse) {
    const err = new Error('المستودع غير موجود');
    err.statusCode = 404;
    throw err;
  }

  return warehouse;
}

/**
 * Update warehouse
 */
async function updateWarehouse(id, data, currentUser) {
  await assertWarehouseAccess(parseInt(id, 10), currentUser);
  const warehouse = await repo.updateWarehouse(id, data);
  
  if (!warehouse) {
    const err = new Error('المستودع غير موجود');
    err.statusCode = 404;
    throw err;
  }

  return warehouse;
}

/**
 * Delete warehouse (soft delete)
 */
async function deleteWarehouse(id) {
  const warehouse = await repo.deleteWarehouse(id);
  
  if (!warehouse) {
    const err = new Error('المستودع غير موجود');
    err.statusCode = 404;
    throw err;
  }

  return warehouse;
}

/**
 * Get warehouse stock levels
 */
async function getWarehouseStock(warehouseId, currentUser = null) {
  await assertWarehouseAccess(warehouseId, currentUser);
  // Verify warehouse exists
  await getWarehouseById(warehouseId, currentUser);
  
  return repo.getWarehouseStock(warehouseId);
}

/**
 * Get all warehouses with stock summary
 */
async function getWarehousesWithStockSummary() {
  const warehouses = await repo.getAllWarehouses({ is_active: true });
  
  const summary = await Promise.all(warehouses.map(async (warehouse) => {
    const stock = await repo.getWarehouseStock(warehouse.id);
    
    const totalValue = stock.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity_on_hand) * parseFloat(item.unit_cost || 0));
    }, 0);
    
    const lowStockItems = stock.filter(item => 
      parseFloat(item.quantity_on_hand) <= parseFloat(item.reorder_level || 0)
    ).length;
    
    return {
      ...warehouse,
      total_items: stock.length,
      total_value: totalValue.toFixed(2),
      low_stock_count: lowStockItems
    };
  }));
  
  return summary;
}

module.exports = {
  createWarehouse,
  getAllWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  getWarehouseStock,
  getWarehousesWithStockSummary
};
