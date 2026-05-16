const { pool, query } = require('../../db');

// ============================================================================
// Inventory Repository - Data Access Layer
// ============================================================================

function normalizeRole(role) {
  return typeof role === 'string' ? role.toLowerCase() : '';
}

function isWarehouseScopedRole(role) {
  const r = normalizeRole(role);
  return r === 'warehouse_manager' || r === 'inventory_manager';
}

/**
 * Create inventory item (supports transaction client)
 */
async function createItem(data, client = null) {
  const {
    item_code, item_name, item_name_ar, category,
    unit_of_measure, coa_account_code, cost_account_code,
    unit_cost, reorder_level, created_by, notes
  } = data;

  // ✅ FIX: use imported query directly instead of require() inside function
  const queryFn = client ? client.query.bind(client) : query;

  const result = await queryFn(
    `INSERT INTO inventory_items (
      item_code, item_name, item_name_ar, category,
      unit_of_measure, coa_account_code, cost_account_code,
      unit_cost, reorder_level, created_by, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      item_code, item_name, item_name_ar, category,
      unit_of_measure, coa_account_code, cost_account_code,
      unit_cost || 0, reorder_level || 0, created_by, notes
    ]
  );

  const newItem = result.rows[0];

  // Auto-create warehouse_stock record for default warehouse (ID: 1)
  await queryFn(
    `INSERT INTO warehouse_stock (warehouse_id, item_id, quantity_on_hand, reserved_quantity)
     VALUES (1, $1, 0, 0)
     ON CONFLICT (warehouse_id, item_id) DO NOTHING`,
    [newItem.id]
  );

  return newItem;
}

/**
 * Get item by ID
 */
async function getItemById(id) {
  const result = await query(
    `SELECT 
       i.*,
       u.first_name || ' ' || u.last_name AS created_by_name
     FROM inventory_items i
     LEFT JOIN users u ON u.id = i.created_by
     WHERE i.id = $1 LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Get all items with optional filters
 */
async function getAllItems(filters = {}) {
  const { category, is_active } = filters;

  let whereClause = 'WHERE 1=1';
  const values = [];
  let paramCount = 1;

  if (category) {
    whereClause += ` AND i.category = $${paramCount}`;
    values.push(category);
    paramCount++;
  }

  if (is_active !== undefined) {
    whereClause += ` AND i.is_active = $${paramCount}`;
    values.push(is_active);
    paramCount++;
  }

  const result = await query(
    `SELECT 
       i.*,
       u.first_name || ' ' || u.last_name AS created_by_name
     FROM inventory_items i
     LEFT JOIN users u ON u.id = i.created_by
     ${whereClause}
     ORDER BY i.item_code ASC`,
    values
  );

  return result.rows;
}

/**
 * Get items with stock levels for a specific warehouse
 */
async function getItemsByWarehouse(warehouseId, filters = {}, currentUser = null) {
  const { category, is_active } = filters;

  let whereClause = 'WHERE ws.warehouse_id = $1';
  const values = [warehouseId];
  let paramCount = 2;

  // Scoped access: warehouse_manager / inventory_manager can only query managed warehouses
  if (currentUser && isWarehouseScopedRole(currentUser.role || currentUser.role_name)) {
    whereClause += ` AND ws.warehouse_id IN (
      SELECT id FROM warehouses WHERE created_by = $${paramCount} OR supervisor_id = $${paramCount}
    )`;
    values.push(currentUser.id);
    paramCount++;
  }

  if (category) {
    whereClause += ` AND i.category = $${paramCount}`;
    values.push(category);
    paramCount++;
  }

  if (is_active !== undefined) {
    whereClause += ` AND i.is_active = $${paramCount}`;
    values.push(is_active);
    paramCount++;
  }

  const result = await query(
    `SELECT 
       i.id,
       i.item_code,
       i.item_name,
       i.item_name_ar,
       i.category,
       i.unit_of_measure,
       i.unit_cost,
       i.is_active,
       ws.quantity_on_hand,
       ws.reserved_quantity,
       ws.available_quantity,
       w.warehouse_code,
       w.warehouse_name,
       w.warehouse_name_ar
     FROM warehouse_stock ws
     JOIN inventory_items i ON i.id = ws.item_id
     JOIN warehouses w ON w.id = ws.warehouse_id
     ${whereClause}
     ORDER BY i.item_code ASC`,
    values
  );

  return result.rows;
}

/**
 * Update item (supports transaction client, allowed fields only)
 */
async function updateItem(id, data, client = null) {
  const allowedFields = [
    'item_name', 'item_name_ar', 'unit_of_measure',
    'unit_cost', 'reorder_level', 'is_active', 'notes'
  ];

  const keys = Object.keys(data).filter(key => allowedFields.includes(key));

  if (keys.length === 0) {
    return getItemById(id);
  }

  // ✅ FIX: use imported query directly instead of require() inside function
  const queryFn = client ? client.query.bind(client) : query;

  const setClauses = [];
  const values = [];

  keys.forEach((key, index) => {
    setClauses.push(`${key} = $${index + 1}`);
    values.push(data[key]);
  });

  const allValues = [...values, id];
  const sql = `UPDATE inventory_items 
               SET ${setClauses.join(', ')}, updated_at = NOW()
               WHERE id = $${keys.length + 1} 
               RETURNING *`;

  const result = await queryFn(sql, allValues);
  return result.rows[0] || null;
}

/**
 * Generate unique item code
 */
async function generateItemCode() {
  const result = await query(
    `SELECT 'ITM-' || LPAD((COUNT(*) + 1)::TEXT, 4, '0') AS item_code
     FROM inventory_items`
  );

  return result.rows[0].item_code;
}

/**
 * Adjust stock quantity (supports transaction client)
 */
async function adjustStock(itemId, quantity, client = null) {
  // ✅ FIX: use imported query directly instead of require() inside function
  const queryFn = client ? client.query.bind(client) : query;

  const result = await queryFn(
    `UPDATE inventory_items
     SET quantity_on_hand = quantity_on_hand + $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [quantity, itemId]
  );

  return result.rows[0];
}

/**
 * ✅ Adjust warehouse-specific stock (warehouse-aware)
 * Positive quantity = stock in, Negative quantity = stock out
 */
async function adjustWarehouseStock(warehouseId, itemId, quantity, movementType = 'in', referenceType = null, referenceId = null, notes = '', userId = 1, projectId = null, client = null) {
  const queryFn = client ? client.query.bind(client) : query;
  
  // Step 1: Update warehouse_stock
  const stockResult = await queryFn(
    `UPDATE warehouse_stock
     SET quantity_on_hand = quantity_on_hand + $1,
         updated_at = NOW()
     WHERE warehouse_id = $2 AND item_id = $3
     RETURNING *`,
    [quantity, warehouseId, itemId]
  );

  if (!stockResult.rows[0]) {
    throw new Error(`Warehouse stock record not found for warehouse ${warehouseId}, item ${itemId}`);
  }

  // Step 2: Create inventory_movements record
  const movementResult = await queryFn(
    `INSERT INTO inventory_movements (
      inventory_item_id, project_id, warehouse_id, movement_type, quantity,
      notes, performed_by, performed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *`,
    [itemId, projectId, warehouseId, movementType, Math.abs(quantity), notes, userId]
  );

  return {
    stock: stockResult.rows[0],
    movement: movementResult.rows[0]
  };
}

/**
 * ✅ Check available stock in warehouse
 */
async function getAvailableStock(warehouseId, itemId, client = null) {
  const queryFn = client ? client.query.bind(client) : query;
  
  const result = await queryFn(
    `SELECT quantity_on_hand, reserved_quantity, available_quantity
     FROM warehouse_stock
     WHERE warehouse_id = $1 AND item_id = $2`,
    [warehouseId, itemId]
  );

  return result.rows[0] || null;
}

/**
 * Get low stock items (quantity_on_hand <= reorder_level)
 */
async function getLowStockItems() {
  const result = await query(
    `SELECT 
       i.*,
       u.first_name || ' ' || u.last_name AS created_by_name
     FROM inventory_items i
     LEFT JOIN users u ON u.id = i.created_by
     WHERE i.quantity_on_hand <= i.reorder_level
       AND i.is_active = true
     ORDER BY (i.quantity_on_hand / NULLIF(i.reorder_level, 0)) ASC`
  );

  return result.rows;
}

/**
 * ✅ Get distinct inventory categories
 */
async function getCategories() {
  const result = await query(
    `SELECT DISTINCT category 
     FROM inventory_items 
     WHERE category IS NOT NULL AND category != ''
     ORDER BY category ASC`
  );

  return result.rows.map(row => row.category);
}

/**
 * ✅ Get inventory items with warehouse stock (LEFT JOIN to show ALL items)
 */
async function getInventoryWithWarehouse(filters = {}, currentUser = null) {
  const { warehouse_id, category, is_active } = filters;

  let whereClause = 'WHERE i.is_active = true';
  const values = [];
  let paramCount = 1;

  if (warehouse_id) {
    whereClause += ` AND ws.warehouse_id = $${paramCount}`;
    values.push(warehouse_id);
    paramCount++;
  }

  // Scoped access: only warehouses managed by the current manager
  if (currentUser && isWarehouseScopedRole(currentUser.role || currentUser.role_name)) {
    whereClause += ` AND COALESCE(ws.warehouse_id, i.default_warehouse_id, 1) IN (
      SELECT id FROM warehouses WHERE created_by = $${paramCount} OR supervisor_id = $${paramCount}
    )`;
    values.push(currentUser.id);
    paramCount++;
  }

  if (category) {
    whereClause += ` AND i.category = $${paramCount}`;
    values.push(category);
    paramCount++;
  }

  if (is_active !== undefined) {
    whereClause += ` AND i.is_active = $${paramCount}`;
    values.push(is_active);
    paramCount++;
  }

  const result = await query(
    `SELECT 
       i.id,
       i.item_code,
       i.item_name,
       i.item_name_ar,
       i.category,
       i.unit_of_measure,
       i.unit_cost,
       i.reorder_level,
       i.is_active,
       i.quantity_on_hand as master_quantity,
       i.coa_account_code,
       i.cost_account_code,
       w.id as warehouse_id,
       w.warehouse_code,
       w.warehouse_name,
       w.warehouse_name_ar,
       COALESCE(ws.quantity_on_hand, 0) as quantity_on_hand,
       COALESCE(ws.reserved_quantity, 0) as reserved_quantity,
       COALESCE(ws.available_quantity, 0) as available_quantity,
       ws.last_counted_at
     FROM inventory_items i
     LEFT JOIN warehouse_stock ws ON ws.item_id = i.id
     LEFT JOIN warehouses w ON w.id = COALESCE(ws.warehouse_id, i.default_warehouse_id, 1)
     ${whereClause}
     ORDER BY i.item_code ASC, w.warehouse_name ASC`,
    values
  );

  console.log(`[getInventoryWithWarehouse] Query returned ${result.rows.length} rows`);

  return result.rows;
}

/**
 * ✅ Get inventory summary statistics
 */
async function getInventorySummary() {
  const result = await query(
    `SELECT 
       COUNT(DISTINCT i.id) as total_items,
       COUNT(DISTINCT ws.warehouse_id) FILTER (WHERE ws.warehouse_id IS NOT NULL) as total_warehouses,
       COALESCE(SUM(ws.quantity_on_hand), 0) as total_stock,
       COALESCE(SUM(ws.quantity_on_hand * i.unit_cost), 0) as total_value,
       COUNT(CASE WHEN COALESCE(ws.available_quantity, 0) <= i.reorder_level THEN 1 END) as low_stock_items
     FROM inventory_items i
     LEFT JOIN warehouse_stock ws ON ws.item_id = i.id
     WHERE i.is_active = true`
  );

  return result.rows[0];
}

module.exports = {
  createItem,
  getItemById,
  getAllItems,
  updateItem,
  generateItemCode,
  adjustStock,
  adjustWarehouseStock,
  getAvailableStock,
  getLowStockItems,
  getCategories,
  getInventoryWithWarehouse,
  getInventorySummary,
  getItemsByWarehouse
};