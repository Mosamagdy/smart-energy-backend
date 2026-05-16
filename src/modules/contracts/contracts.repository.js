const { query } = require('../../db');

// ============================================================================
// Contracts Repository - Data Access Layer
// ============================================================================

/**
 * Create a new contract
 */
async function createContract(data) {
  const {
    contract_number, project_id, client_id, contract_type,
    start_date, end_date, total_value, currency, payment_terms,
    description, attachment_url, created_by
  } = data;

  const result = await query(
    `INSERT INTO contracts (
      contract_number, project_id, client_id, contract_type,
      start_date, end_date, total_value, currency, payment_terms,
      description, attachment_url, status, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [contract_number, project_id, client_id, contract_type || 'service',
     start_date, end_date, total_value, currency || 'SAR', payment_terms,
     description, attachment_url, 'active', created_by]
  );

  return result.rows[0];
}

/**
 * Get contract by ID with project and client details
 */
async function getContractById(id) {
  const result = await query(
    `SELECT 
       c.*,
       p.name AS project_name,
       p.status AS project_status,
       u.first_name || ' ' || u.last_name AS client_name,
       u.email AS client_email,
       u.phone AS client_phone,
       creator.first_name || ' ' || creator.last_name AS created_by_name
     FROM contracts c
     LEFT JOIN projects p ON p.id = c.project_id
     LEFT JOIN users u ON u.id = c.client_id
     LEFT JOIN users creator ON creator.id = c.created_by
     WHERE c.id = $1 LIMIT 1`,
    [id]
  );
  
  return result.rows[0] || null;
}

/**
 * Get all contracts with filters
 */
async function getAllContracts(filters = {}) {
  let sql = `
    SELECT 
      c.*,
      p.name AS project_name,
      u.first_name || ' ' || u.last_name AS client_name,
      creator.first_name || ' ' || creator.last_name AS created_by_name
    FROM contracts c
    LEFT JOIN projects p ON p.id = c.project_id
    LEFT JOIN users u ON u.id = c.client_id
    LEFT JOIN users creator ON creator.id = c.created_by
    WHERE 1=1
  `;
  
  const params = [];
  let paramIndex = 1;
  
  if (filters.project_id) {
    params.push(filters.project_id);
    sql += ` AND c.project_id = $${paramIndex++}`;
  }
  
  if (filters.client_id) {
    params.push(filters.client_id);
    sql += ` AND c.client_id = $${paramIndex++}`;
  }
  
  if (filters.status) {
    params.push(filters.status);
    sql += ` AND c.status = $${paramIndex++}`;
  }
  
  if (filters.contract_type) {
    params.push(filters.contract_type);
    sql += ` AND c.contract_type = $${paramIndex++}`;
  }
  
  // Filter by date range
  if (filters.start_date_from) {
    params.push(filters.start_date_from);
    sql += ` AND c.start_date >= $${paramIndex++}`;
  }
  
  if (filters.start_date_to) {
    params.push(filters.start_date_to);
    sql += ` AND c.start_date <= $${paramIndex++}`;
  }
  
  sql += ` ORDER BY c.created_at DESC`;
  
  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get contracts for specific project
 */
async function getProjectContracts(projectId) {
  const result = await query(
    `SELECT 
       c.*,
       u.first_name || ' ' || u.last_name AS client_name
     FROM contracts c
     LEFT JOIN users u ON u.id = c.client_id
     WHERE c.project_id = $1
     ORDER BY c.created_at DESC`,
    [projectId]
  );
  
  return result.rows;
}

/**
 * Update contract information
 */
async function updateContract(id, data) {
  const allowedFields = [
    'contract_type', 'start_date', 'end_date', 'total_value',
    'currency', 'payment_terms', 'description', 'attachment_url',
    'status', 'signed_by_client', 'signed_by_company'
  ];
  
  const keys = Object.keys(data).filter(key => allowedFields.includes(key));
  
  if (keys.length === 0) {
    return getContractById(id);
  }
  
  const setClauses = [];
  const values = [];
  
  keys.forEach((key, index) => {
    setClauses.push(`${key} = $${index + 1}`);
    values.push(data[key]);
  });
  
  const setClause = setClauses.join(', ');
  const allValues = [...values, id];
  
  const sql = `UPDATE contracts SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
               WHERE id = $${keys.length + 1} RETURNING *`;
  
  const result = await query(sql, allValues);
  return result.rows[0] || null;
}

/**
 * Sign contract (both parties)
 */
async function signContract(id, signedBy) {
  const result = await query(
    `UPDATE contracts SET 
        signed_by_${signedBy} = TRUE,
        signed_at = CASE 
          WHEN signed_by_${signedBy} = FALSE AND signed_by_${signedBy === 'client' ? 'company' : 'client'} = TRUE 
          THEN CURRENT_TIMESTAMP 
          ELSE signed_at 
        END,
        status = CASE 
          WHEN signed_by_${signedBy} = FALSE AND signed_by_${signedBy === 'client' ? 'company' : 'client'} = TRUE 
          THEN 'active' 
          ELSE status 
        END,
        updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING *`,
    [id]
  );
  
  return result.rows[0] || null;
}

/**
 * Check if contract exists for project
 */
async function contractExistsForProject(projectId) {
  const result = await query(
    `SELECT EXISTS(SELECT 1 FROM contracts WHERE project_id = $1) as exists`,
    [projectId]
  );
  
  return result.rows[0].exists;
}

/**
 * Get expiring contracts (within next 30 days)
 */
async function getExpiringContracts(daysThreshold = 30) {
  const result = await query(
    `SELECT 
       c.*,
       p.name AS project_name,
       u.first_name || ' ' || u.last_name AS client_name
     FROM contracts c
     LEFT JOIN projects p ON p.id = c.project_id
     LEFT JOIN users u ON u.id = c.client_id
     WHERE c.status = 'active'
       AND c.end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '${daysThreshold} days')
     ORDER BY c.end_date ASC`,
    []
  );
  
  return result.rows;
}

/**
 * Delete contract
 */
async function deleteContract(id) {
  const result = await query(
    `DELETE FROM contracts WHERE id = $1 RETURNING *`,
    [id]
  );
  
  return result.rows[0] || null;
}

module.exports = {
  createContract,
  getContractById,
  getAllContracts,
  getProjectContracts,
  updateContract,
  signContract,
  contractExistsForProject,
  getExpiringContracts,
  deleteContract,
};
