const { pool, query } = require('../../db');

// ============================================================================
// Warehouse Repository - Data Access Layer
// ============================================================================

function normalizeRole(role) {
  return typeof role === 'string' ? role.toLowerCase() : '';
}

function isWarehouseScopedRole(role) {
  const r = normalizeRole(role);
  return r === 'warehouse_manager' || r === 'inventory_manager';
}

/**
 * Create warehouse
 */
async function createWarehouse(data, client = null) {
  const {
    warehouse_code, warehouse_name, warehouse_name_ar,
    location, location_ar, address, supervisor_id,
    capacity_cubic_m, created_by, notes
  } = data;

  const queryFn = client ? client.query.bind(client) : query;

  const result = await queryFn(
    `INSERT INTO warehouses (
      warehouse_code, warehouse_name, warehouse_name_ar,
      location, location_ar, address, supervisor_id,
      capacity_cubic_m, created_by, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      warehouse_code, warehouse_name, warehouse_name_ar,
      location, location_ar, address, supervisor_id || null,
      capacity_cubic_m || null, created_by, notes
    ]
  );

  return result.rows[0];
}

/**
 * Get warehouse by ID
 */
async function getWarehouseById(id) {
  const result = await query(
    `SELECT 
       w.*,
       u.first_name || ' ' || u.last_name AS supervisor_name,
       uc.first_name || ' ' || uc.last_name AS created_by_name
     FROM warehouses w
     LEFT JOIN users u ON u.id = w.supervisor_id
     LEFT JOIN users uc ON uc.id = w.created_by
     WHERE w.id = $1 LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Get all warehouses with optional filters
 */
async function getAllWarehouses(filters = {}, currentUser = null) {
  const { is_active } = filters;

  let whereClause = 'WHERE 1=1';
  const values = [];
  let paramCount = 1;

  if (is_active !== undefined) {
    whereClause += ` AND w.is_active = $${paramCount}`;
    values.push(is_active);
    paramCount++;
  }

  // Scoped access: warehouse_manager / inventory_manager see only their warehouses
  if (currentUser && isWarehouseScopedRole(currentUser.role || currentUser.role_name)) {
    whereClause += ` AND (w.created_by = $${paramCount} OR w.supervisor_id = $${paramCount})`;
    values.push(currentUser.id);
    paramCount++;
  }

  const result = await query(
    `SELECT 
       w.*,
       u.first_name || ' ' || u.last_name AS supervisor_name,
       uc.first_name || ' ' || uc.last_name AS created_by_name,
       COUNT(ws.id) AS total_items
     FROM warehouses w
     LEFT JOIN users u ON u.id = w.supervisor_id
     LEFT JOIN users uc ON uc.id = w.created_by
     LEFT JOIN warehouse_stock ws ON ws.warehouse_id = w.id
     ${whereClause}
     GROUP BY w.id, u.first_name, u.last_name, uc.first_name, uc.last_name
     ORDER BY w.warehouse_code ASC`,
    values
  );

  return result.rows;
}

/**
 * Update warehouse (allowed fields only)
 */
async function updateWarehouse(id, data, client = null) {
  const allowedFields = [
    'warehouse_name', 'warehouse_name_ar', 'location', 'location_ar',
    'address', 'supervisor_id', 'capacity_cubic_m', 'is_active', 'notes'
  ];

  const keys = Object.keys(data).filter(key => allowedFields.includes(key));

  if (keys.length === 0) {
    return getWarehouseById(id);
  }

  const queryFn = client ? client.query.bind(client) : query;

  const setClauses = [];
  const values = [];

  keys.forEach((key, index) => {
    setClauses.push(`${key} = $${index + 1}`);
    values.push(data[key]);
  });

  const allValues = [...values, id];
  const sql = `UPDATE warehouses 
               SET ${setClauses.join(', ')}, updated_at = NOW()
               WHERE id = $${keys.length + 1} 
               RETURNING *`;

  const result = await queryFn(sql, allValues);
  return result.rows[0] || null;
}

/**
 * Check if a warehouse is managed by a given user
 * - Managed means: created_by=user OR supervisor_id=user
 */
async function isWarehouseManagedByUser(warehouseId, userId) {
  const result = await query(
    `SELECT 1
     FROM warehouses
     WHERE id = $1 AND (created_by = $2 OR supervisor_id = $2)
     LIMIT 1`,
    [warehouseId, userId]
  );
  return result.rows.length > 0;
}

/**
 * Delete warehouse (soft delete by setting is_active = false)
 */
async function deleteWarehouse(id) {
  const result = await query(
    `UPDATE warehouses 
     SET is_active = false, updated_at = NOW()
     WHERE id = $1 
     RETURNING *`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Generate unique warehouse code
 */
async function generateWarehouseCode() {
  const result = await query(
    `SELECT 'WH-' || LPAD((COUNT(*) + 1)::TEXT, 3, '0') AS warehouse_code
     FROM warehouses`
  );

  return result.rows[0].warehouse_code;
}

/**
 * Get warehouse stock levels
 */
async function getWarehouseStock(warehouseId) {
  const result = await query(
    `SELECT 
       ws.*,
       i.item_code,
       i.item_name,
       i.item_name_ar,
       i.category,
       i.unit_of_measure,
       i.unit_cost
     FROM warehouse_stock ws
     JOIN inventory_items i ON i.id = ws.item_id
     WHERE ws.warehouse_id = $1
     ORDER BY i.item_code ASC`,
    [warehouseId]
  );

  return result.rows;
}

/**
 * Adjust warehouse stock
 */
async function adjustWarehouseStock(warehouseId, itemId, quantity, client = null) {
  const queryFn = client ? client.query.bind(client) : query;

  const result = await queryFn(
    `UPDATE warehouse_stock
     SET quantity_on_hand = quantity_on_hand + $1,
         updated_at = NOW()
     WHERE warehouse_id = $2 AND item_id = $3
     RETURNING *`,
    [quantity, warehouseId, itemId]
  );

  return result.rows[0];
}

/**
 * Create or get warehouse stock record
 */
async function getOrCreateWarehouseStock(warehouseId, itemId, client = null) {
  const queryFn = client ? client.query.bind(client) : query;

  // Try to get existing record
  const existing = await queryFn(
    `SELECT * FROM warehouse_stock WHERE warehouse_id = $1 AND item_id = $2`,
    [warehouseId, itemId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // Create new record with 0 quantity
  const result = await queryFn(
    `INSERT INTO warehouse_stock (warehouse_id, item_id, quantity_on_hand)
     VALUES ($1, $2, 0)
     RETURNING *`,
    [warehouseId, itemId]
  );

  return result.rows[0];
}

module.exports = {
  createWarehouse,
  getWarehouseById,
  getAllWarehouses,
  updateWarehouse,
  deleteWarehouse,
  generateWarehouseCode,
  getWarehouseStock,
  adjustWarehouseStock,
  getOrCreateWarehouseStock,
  isWarehouseManagedByUser
};
