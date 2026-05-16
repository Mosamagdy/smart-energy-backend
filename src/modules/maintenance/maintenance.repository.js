const { query } = require('../../db');

/**
 * Installed Assets Repository
 * Handles all database operations for installed_assets table
 */

/**
 * Create a new installed asset
 */
async function createAsset(data) {
  const sql = `
    INSERT INTO installed_assets (
      asset_name, client_id, project_id, category, serial_number,
      installation_date, location_address, latitude, longitude,
      assigned_engineer_id, warranty_expiry, manufacturer, model_number,
      power_rating, status, notes, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
  `;
  
  const values = [
    data.asset_name,
    data.client_id,
    data.project_id,
    data.category,
    data.serial_number,
    data.installation_date || new Date().toISOString().split('T')[0],
    data.location_address,
    data.latitude,
    data.longitude,
    data.assigned_engineer_id,
    data.warranty_expiry,
    data.manufacturer,
    data.model_number,
    data.power_rating,
    data.status || 'operational',
    data.notes,
    data.created_by
  ];
  
  const result = await query(sql, values);
  return result.rows[0];
}

/**
 * Find asset by ID
 */
async function findAssetById(id) {
  const sql = `
    SELECT 
      ia.*,
      p.name AS project_name,
      c.first_name || ' ' || c.last_name AS client_name,
      c.email AS client_email,
      c.phone AS client_phone,
      ae.first_name || ' ' || ae.last_name AS assigned_engineer_name
    FROM installed_assets ia
    LEFT JOIN projects p ON ia.project_id = p.id
    LEFT JOIN users c ON ia.client_id = c.id
    LEFT JOIN users ae ON ia.assigned_engineer_id = ae.id
    WHERE ia.id = $1
  `;
  
  const result = await query(sql, [id]);
  return result.rows[0];
}

/**
 * Find asset by serial number
 */
async function findAssetBySerialNumber(serial_number) {
  const sql = `SELECT * FROM installed_assets WHERE serial_number = $1`;
  const result = await query(sql, [serial_number]);
  return result.rows[0];
}

/**
 * List all assets with filters
 */
async function findAllAssets(filters = {}) {
  let sql = `
    SELECT 
      ia.*,
      p.name AS project_name,
      c.first_name || ' ' || c.last_name AS client_name,
      c.email AS client_email,
      ae.first_name || ' ' || ae.last_name AS assigned_engineer_name
    FROM installed_assets ia
    LEFT JOIN projects p ON ia.project_id = p.id
    LEFT JOIN users c ON ia.client_id = c.id
    LEFT JOIN users ae ON ia.assigned_engineer_id = ae.id
    WHERE 1=1
  `;
  
  const values = [];
  let paramCount = 1;
  
  if (filters.project_id) {
    sql += ` AND ia.project_id = $${paramCount++}`;
    values.push(filters.project_id);
  }
  
  if (filters.client_id) {
    sql += ` AND ia.client_id = $${paramCount++}`;
    values.push(filters.client_id);
  }
  
  if (filters.category) {
    sql += ` AND ia.category = $${paramCount++}`;
    values.push(filters.category);
  }
  
  if (filters.status) {
    sql += ` AND ia.status = $${paramCount++}`;
    values.push(filters.status);
  }
  
  if (filters.search) {
    sql += ` AND (ia.asset_name ILIKE $${paramCount++} OR ia.serial_number ILIKE $${paramCount})`;
    values.push(`%${filters.search}%`, `%${filters.search}%`);
    paramCount++;
  }
  
  sql += ` ORDER BY ia.created_at DESC`;
  
  const result = await query(sql, values);
  return result.rows;
}

/**
 * Get assets by project ID
 */
async function findAssetsByProjectId(project_id) {
  const sql = `
    SELECT 
      ia.*,
      p.name AS project_name,
      c.first_name || ' ' || c.last_name AS client_name,
      c.email AS client_email,
      c.phone AS client_phone,
      ae.first_name || ' ' || ae.last_name AS assigned_engineer_name
    FROM installed_assets ia
    LEFT JOIN projects p ON ia.project_id = p.id
    LEFT JOIN users c ON ia.client_id = c.id
    LEFT JOIN users ae ON ia.assigned_engineer_id = ae.id
    WHERE ia.project_id = $1
    ORDER BY ia.category, ia.asset_name
  `;
  
  const result = await query(sql, [project_id]);
  return result.rows;
}

/**
 * Update asset
 */
async function updateAsset(id, data) {
  const allowedFields = [
    'asset_name', 'category', 'location_address', 'latitude', 'longitude',
    'assigned_engineer_id', 'warranty_expiry', 'status', 'manufacturer',
    'model_number', 'power_rating', 'notes'
  ];
  
  const fields = [];
  const values = [];
  let paramCount = 1;
  
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${paramCount++}`);
      values.push(data[field]);
    }
  }
  
  if (fields.length === 0) {
    throw new Error('لا توجد حقول للتحديث');
  }
  
  values.push(id);
  
  const sql = `
    UPDATE installed_assets
    SET ${fields.join(', ')}, updated_at = now()
    WHERE id = $${paramCount}
    RETURNING *
  `;
  
  const result = await query(sql, values);
  return result.rows[0];
}

/**
 * Delete asset
 */
async function deleteAsset(id) {
  const sql = `DELETE FROM installed_assets WHERE id = $1 RETURNING *`;
  const result = await query(sql, [id]);
  return result.rows[0];
}

/**
 * Get warranty expiry alerts (assets expiring within 30 days)
 */
async function getWarrantyExpiringSoon(days = 30) {
  const sql = `
    SELECT * FROM vw_warranty_expiring_soon
    WHERE days_until_expiry <= $1
    ORDER BY days_until_expiry ASC
  `;
  
  const result = await query(sql, [days]);
  return result.rows;
}

/**
 * Get assets requiring maintenance based on status
 */
async function findAssetsNeedingMaintenance() {
  const sql = `
    SELECT 
      ia.*,
      p.name AS project_name,
      c.first_name || ' ' || c.last_name AS client_name,
      c.phone AS client_phone
    FROM installed_assets ia
    LEFT JOIN projects p ON ia.project_id = p.id
    LEFT JOIN users c ON ia.client_id = c.id
    WHERE ia.status = 'needs_maintenance'
    ORDER BY ia.updated_at DESC
  `;
  
  const result = await query(sql);
  return result.rows;
}

/**
 * Get dashboard statistics for maintenance department
 */
async function getDashboardStats() {
  const sql = `
    SELECT 
      COUNT(*) FILTER (WHERE status = 'operational') AS operational_count,
      COUNT(*) FILTER (WHERE status = 'needs_maintenance') AS needs_maintenance_count,
      COUNT(*) FILTER (WHERE status = 'decommissioned') AS decommissioned_count,
      COUNT(*) AS total_assets,
      COUNT(*) FILTER (
        WHERE warranty_expiry IS NOT NULL 
        AND warranty_expiry >= CURRENT_DATE 
        AND warranty_expiry <= CURRENT_DATE + INTERVAL '30 days'
      ) AS warranty_expiring_soon_count
    FROM installed_assets
  `;
  
  const result = await query(sql);
  return result.rows[0];
}

module.exports = {
  createAsset,
  findAssetById,
  findAssetBySerialNumber,
  findAllAssets,
  findAssetsByProjectId,
  updateAsset,
  deleteAsset,
  getWarrantyExpiringSoon,
  findAssetsNeedingMaintenance,
  getDashboardStats,
};
