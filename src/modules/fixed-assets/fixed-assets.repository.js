const { pool, query } = require('../../db');

// ============================================================================
// Fixed Assets Repository - Data Access Layer
// ============================================================================

/**
 * Create fixed asset record (supports transaction client)
 */
async function createAsset(data, client = null) {
  const {
    asset_number, asset_name, asset_name_ar, category,
    coa_account_code, accum_depr_account, depr_expense_account,
    purchase_date, purchase_cost, salvage_value, useful_life_years,
    depreciation_method, project_id, created_by, notes
  } = data;

  const dbClient = client || require('../../db');
  const queryFn = client ? client.query.bind(client) : dbClient.query;

  const result = await queryFn(
    `INSERT INTO fixed_assets (
      asset_number, asset_name, asset_name_ar, category,
      coa_account_code, accum_depr_account, depr_expense_account,
      purchase_date, purchase_cost, salvage_value, useful_life_years,
      depreciation_method, project_id, created_by, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      asset_number, asset_name, asset_name_ar, category,
      coa_account_code, accum_depr_account, depr_expense_account,
      purchase_date, purchase_cost, salvage_value || 0, useful_life_years,
      depreciation_method || 'straight_line', project_id, created_by, notes
    ]
  );

  return result.rows[0];
}

/**
 * Get asset by ID with creator name
 */
async function getAssetById(id) {
  const result = await query(
    `SELECT 
       fa.*,
       u.first_name || ' ' || u.last_name AS created_by_name,
       p.name AS project_name
     FROM fixed_assets fa
     LEFT JOIN users u ON u.id = fa.created_by
     LEFT JOIN projects p ON p.id = fa.project_id
     WHERE fa.id = $1 LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Get all assets with optional filters
 */
async function getAllAssets(filters = {}) {
  const { status, category } = filters;
  
  let whereClause = 'WHERE 1=1';
  const values = [];
  let paramCount = 1;

  if (status) {
    whereClause += ` AND fa.status = $${paramCount}`;
    values.push(status);
    paramCount++;
  }

  if (category) {
    whereClause += ` AND fa.category = $${paramCount}`;
    values.push(category);
    paramCount++;
  }

  const result = await query(
    `SELECT 
       fa.*,
       u.first_name || ' ' || u.last_name AS created_by_name,
       p.name AS project_name
     FROM fixed_assets fa
     LEFT JOIN users u ON u.id = fa.created_by
     LEFT JOIN projects p ON p.id = fa.project_id
     ${whereClause}
     ORDER BY fa.purchase_date DESC`,
    values
  );

  return result.rows;
}

/**
 * Update asset (supports transaction client, allowed fields only)
 */
async function updateAsset(id, data, client = null) {
  const allowedFields = [
    'asset_name', 'asset_name_ar', 'salvage_value', 'useful_life_years',
    'depreciation_method', 'notes', 'project_id'
  ];
  
  const keys = Object.keys(data).filter(key => allowedFields.includes(key));

  if (keys.length === 0) {
    return getAssetById(id);
  }

  const dbClient = client || require('../../db');
  const queryFn = client ? client.query.bind(client) : dbClient.query;

  const setClauses = [];
  const values = [];

  keys.forEach((key, index) => {
    setClauses.push(`${key} = $${index + 1}`);
    values.push(data[key]);
  });

  const setClause = setClauses.join(', ');
  const allValues = [...values, id];

  const sql = `UPDATE fixed_assets SET ${setClause}, updated_at = NOW() 
               WHERE id = $${keys.length + 1} RETURNING *`;

  const result = await queryFn(sql, allValues);
  return result.rows[0] || null;
}

/**
 * Delete asset (only if status = 'active')
 */
async function deleteAsset(id) {
  const result = await query(
    `DELETE FROM fixed_assets 
     WHERE id = $1 AND status = 'active'
     RETURNING *`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Generate unique asset number
 */
async function generateAssetNumber() {
  const result = await query(
    `SELECT 'FA-' || LPAD((COUNT(*) + 1)::TEXT, 4, '0') as asset_number
     FROM fixed_assets`
  );
  
  return result.rows[0].asset_number;
}

/**
 * Get assets by category
 */
async function getAssetsByCategory(category) {
  const result = await query(
    `SELECT * FROM fixed_assets
     WHERE category = $1
     ORDER BY purchase_date DESC`,
    [category]
  );

  return result.rows;
}

/**
 * Get fully depreciated assets
 */
async function getFullyDepreciatedAssets() {
  const result = await query(
    `SELECT * FROM fixed_assets
     WHERE status = 'fully_depreciated'
     ORDER BY disposal_date DESC NULLS FIRST`
  );

  return result.rows;
}

/**
 * Record depreciation on asset (supports transaction client)
 */
async function recordDepreciation(id, amount, client = null) {
  const dbClient = client || require('../../db');
  const queryFn = client ? client.query.bind(client) : dbClient.query;

  const result = await queryFn(
    `UPDATE fixed_assets 
     SET accumulated_depr = accumulated_depr + $1,
         status = CASE 
           WHEN (purchase_cost - (accumulated_depr + $1)) <= salvage_value THEN 'fully_depreciated'
           ELSE status
         END,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [amount, id]
  );

  return result.rows[0];
}

/**
 * Dispose asset (supports transaction client)
 */
async function disposeAsset(id, disposalData, client = null) {
  const { disposal_date, disposal_amount, disposal_gain_loss } = disposalData;
  
  const dbClient = client || require('../../db');
  const queryFn = client ? client.query.bind(client) : dbClient.query;

  const result = await queryFn(
    `UPDATE fixed_assets 
     SET status = 'disposed',
         disposal_date = $1,
         disposal_amount = $2,
         disposal_gain_loss = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [disposal_date, disposal_amount, disposal_gain_loss, id]
  );

  return result.rows[0];
}

/**
 * Get active assets needing depreciation
 */
async function getActiveAssetsForDepreciation() {
  const result = await query(
    `SELECT * FROM fixed_assets
     WHERE status = 'active'
       AND net_book_value > salvage_value
     ORDER BY purchase_date ASC`
  );

  return result.rows;
}

module.exports = {
  createAsset,
  getAssetById,
  getAllAssets,
  updateAsset,
  deleteAsset,
  generateAssetNumber,
  getAssetsByCategory,
  getFullyDepreciatedAssets,
  recordDepreciation,
  disposeAsset,
  getActiveAssetsForDepreciation
};
