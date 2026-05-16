const { query } = require('../../db');

/**
 * Maintenance Visits Repository
 * Handles database operations for maintenance_visits table
 */

/**
 * Create a new maintenance visit
 */
async function createVisit(data) {
  const sql = `
    INSERT INTO maintenance_visits (
      asset_id, visit_type, visit_date, scheduled_by, assigned_engineer_id,
      status, description, materials_used, travel_cost, labor_cost,
      total_cost, billable, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;
  
  const values = [
    data.asset_id,
    data.visit_type || 'scheduled',
    data.visit_date,
    data.scheduled_by,
    data.assigned_engineer_id,
    data.status || 'scheduled',
    data.description,
    JSON.stringify(data.materials_used || []),
    data.travel_cost || 0,
    data.labor_cost || 0,
    data.total_cost || 0,
    data.billable || false,
    data.created_by
  ];
  
  const result = await query(sql, values);
  return result.rows[0];
}

/**
 * Find visit by ID
 */
async function findVisitById(id) {
  const sql = `
    SELECT 
      mv.*,
      ia.asset_name,
      ia.serial_number,
      ia.client_id,
      c.first_name || ' ' || c.last_name AS client_name,
      c.phone AS client_phone,
      ae.first_name || ' ' || ae.last_name AS assigned_engineer_name
    FROM maintenance_visits mv
    LEFT JOIN installed_assets ia ON mv.asset_id = ia.id
    LEFT JOIN users c ON ia.client_id = c.id
    LEFT JOIN users ae ON mv.assigned_engineer_id = ae.id
    WHERE mv.id = $1
  `;
  
  const result = await query(sql, [id]);
  return result.rows[0];
}

/**
 * List visits with filters
 */
async function findAllVisits(filters = {}) {
  let sql = `
    SELECT 
      mv.*,
      ia.asset_name,
      ia.serial_number,
      ia.client_id,
      p.name AS project_name,
      c.first_name || ' ' || c.last_name AS client_name,
      ae.first_name || ' ' || ae.last_name AS assigned_engineer_name
    FROM maintenance_visits mv
    LEFT JOIN installed_assets ia ON mv.asset_id = ia.id
    LEFT JOIN projects p ON ia.project_id = p.id
    LEFT JOIN users c ON ia.client_id = c.id
    LEFT JOIN users ae ON mv.assigned_engineer_id = ae.id
    WHERE 1=1
  `;
  
  const values = [];
  let paramCount = 1;
  
  if (filters.asset_id) {
    sql += ` AND mv.asset_id = $${paramCount++}`;
    values.push(filters.asset_id);
  }
  
  if (filters.status) {
    sql += ` AND mv.status = $${paramCount++}`;
    values.push(filters.status);
  }
  
  if (filters.visit_type) {
    sql += ` AND mv.visit_type = $${paramCount++}`;
    values.push(filters.visit_type);
  }
  
  if (filters.assigned_engineer_id) {
    sql += ` AND mv.assigned_engineer_id = $${paramCount++}`;
    values.push(filters.assigned_engineer_id);
  }
  
  if (filters.date_from) {
    sql += ` AND mv.visit_date >= $${paramCount++}`;
    values.push(filters.date_from);
  }
  
  if (filters.date_to) {
    sql += ` AND mv.visit_date <= $${paramCount++}`;
    values.push(filters.date_to);
  }
  
  sql += ` ORDER BY mv.visit_date DESC`;
  
  const result = await query(sql, values);
  return result.rows;
}

/**
 * Get visits by asset ID
 */
async function findVisitsByAssetId(asset_id) {
  const sql = `
    SELECT 
      mv.*,
      s.first_name || ' ' || s.last_name AS scheduled_by_name,
      ae.first_name || ' ' || s.last_name AS assigned_engineer_name
    FROM maintenance_visits mv
    LEFT JOIN users s ON mv.scheduled_by = s.id
    LEFT JOIN users ae ON mv.assigned_engineer_id = ae.id
    WHERE mv.asset_id = $1
    ORDER BY mv.visit_date DESC
  `;
  
  const result = await query(sql, [asset_id]);
  return result.rows;
}

/**
 * Update visit
 */
async function updateVisit(id, data) {
  const allowedFields = [
    'visit_type', 'visit_date', 'assigned_engineer_id', 'status',
    'description', 'work_performed', 'materials_used', 'travel_cost',
    'labor_cost', 'total_cost', 'billable', 'invoice_id', 'completion_notes'
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
  
  // Auto-set completed_at when status changes to completed
  if (data.status === 'completed') {
    fields.push('completed_at = now()');
  }
  
  values.push(id);
  
  const sql = `
    UPDATE maintenance_visits
    SET ${fields.join(', ')}, updated_at = now()
    WHERE id = $${paramCount}
    RETURNING *
  `;
  
  const result = await query(sql, values);
  return result.rows[0];
}

/**
 * Delete visit
 */
async function deleteVisit(id) {
  const sql = `DELETE FROM maintenance_visits WHERE id = $1 RETURNING *`;
  const result = await query(sql, [id]);
  return result.rows[0];
}

/**
 * Get upcoming visits
 */
async function getUpcomingVisits(days = 7) {
  const sql = `
    SELECT 
      mv.*,
      ia.asset_name,
      ia.serial_number,
      c.first_name || ' ' || c.last_name AS client_name,
      c.phone AS client_phone,
      ae.first_name || ' ' || ae.last_name AS assigned_engineer_name
    FROM maintenance_visits mv
    LEFT JOIN installed_assets ia ON mv.asset_id = ia.id
    LEFT JOIN users c ON ia.client_id = c.id
    LEFT JOIN users ae ON mv.assigned_engineer_id = ae.id
    WHERE mv.visit_date >= CURRENT_DATE
      AND mv.visit_date <= CURRENT_DATE + INTERVAL '${days} days'
      AND mv.status = 'scheduled'
    ORDER BY mv.visit_date ASC
  `;
  
  const result = await query(sql);
  return result.rows;
}

/**
 * Get overdue visits
 */
async function getOverdueVisits() {
  const sql = `
    SELECT 
      mv.*,
      ia.asset_name,
      ia.serial_number,
      c.first_name || ' ' || c.last_name AS client_name,
      c.phone AS client_phone,
      ae.first_name || ' ' || ae.last_name AS assigned_engineer_name,
      (CURRENT_DATE - mv.visit_date) AS days_overdue
    FROM maintenance_visits mv
    LEFT JOIN installed_assets ia ON mv.asset_id = ia.id
    LEFT JOIN users c ON ia.client_id = c.id
    LEFT JOIN users ae ON mv.assigned_engineer_id = ae.id
    WHERE mv.visit_date < CURRENT_DATE
      AND mv.status IN ('scheduled', 'in_progress')
    ORDER BY mv.visit_date ASC
  `;
  
  const result = await query(sql);
  return result.rows;
}

module.exports = {
  createVisit,
  findVisitById,
  findAllVisits,
  findVisitsByAssetId,
  updateVisit,
  deleteVisit,
  getUpcomingVisits,
  getOverdueVisits,
};
