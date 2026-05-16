const { query } = require('../../db');

// ============================================================================
// Chart of Accounts Repository - Recursive Tree Operations
// ============================================================================

async function getAccountTree() {
  const sql = `
    WITH RECURSIVE account_hierarchy AS (
      -- Base case: top-level accounts (level 1)
      SELECT 
        id,
        account_code,
        account_name,
        account_name_ar,
        account_type,
        parent_id,
        level,
        normal_balance,
        description,
        is_active,
        is_vat_applicable,
        vat_rate,
        cost_center_type,
        linked_entity_id,
        financial_statement,
        report_category,
        depreciation_method,
        useful_life_years,
        salvage_value,
        -- ✅ التعديل هنا: توحيد نوع المصفوفة
        ARRAY[account_code]::varchar[] as code_path,
        ARRAY[account_name]::varchar[] as name_path,
        0 as depth
      FROM chart_of_accounts
      WHERE parent_id IS NULL AND is_active = TRUE
      
      UNION ALL
      
      -- Recursive step: child accounts
      SELECT 
        c.id,
        c.account_code,
        c.account_name,
        c.account_name_ar,
        c.account_type,
        c.parent_id,
        c.level,
        c.normal_balance,
        c.description,
        c.is_active,
        c.is_vat_applicable,
        c.vat_rate,
        c.cost_center_type,
        c.linked_entity_id,
        c.financial_statement,
        c.report_category,
        c.depreciation_method,
        c.useful_life_years,
        c.salvage_value,
        -- ✅ التعديل هنا: التأكد من توافق الأنواع عند الدمج
        (ah.code_path || c.account_code)::varchar[],
        (ah.name_path || c.account_name)::varchar[],
        ah.depth + 1
      FROM chart_of_accounts c
      INNER JOIN account_hierarchy ah ON c.parent_id = ah.id
      WHERE c.is_active = TRUE
    )
    SELECT * FROM account_hierarchy
    ORDER BY code_path
  `;
  
  const result = await query(sql);
  return result.rows;
}

/**
 * Get account by ID with full path calculation
 */
async function getAccountById(id) {
  const sql = `
    SELECT 
      id, account_code, account_name, account_name_ar, account_type, 
      parent_id, level, normal_balance, description, is_active,
      is_vat_applicable, vat_rate, cost_center_type, linked_entity_id,
      financial_statement, report_category, depreciation_method, 
      useful_life_years, salvage_value,
      created_at, updated_at
    FROM chart_of_accounts
    WHERE id = $1
  `;
  
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

/**
 * Build hierarchical tree structure from flat array
 */
function buildTreeStructure(flatAccounts) {
  const accountMap = new Map();
  const tree = [];
  
  flatAccounts.forEach(acc => {
    accountMap.set(acc.id, { ...acc, children: [] });
  });
  
  flatAccounts.forEach(acc => {
    const accountNode = accountMap.get(acc.id);
    if (acc.parent_id === null) {
      tree.push(accountNode);
    } else {
      const parentNode = accountMap.get(acc.parent_id);
      if (parentNode) {
        parentNode.children.push(accountNode);
      }
    }
  });
  
  return tree;
}

/**
 * Get account by code
 */
async function getAccountByCode(code) {
  const result = await query(
    `SELECT * FROM chart_of_accounts WHERE account_code = $1 AND is_active = TRUE`,
    [code]
  );
  
  return result.rows[0] || null;
}

/**
 * Create new account
 */
async function createAccount(data) {
  const {
    account_code, account_name, account_name_ar, account_type, parent_id,
    level, normal_balance, description, is_vat_applicable, vat_rate,
    cost_center_type, linked_entity_id, financial_statement, report_category,
    depreciation_method, useful_life_years, salvage_value
  } = data;
  
  const result = await query(
    `INSERT INTO chart_of_accounts (
      account_code, account_name, account_name_ar, account_type, parent_id,
      level, normal_balance, description, is_vat_applicable, vat_rate,
      cost_center_type, linked_entity_id, financial_statement, report_category,
      depreciation_method, useful_life_years, salvage_value
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *`,
    [account_code, account_name, account_name_ar, account_type, parent_id,
     level, normal_balance, description, is_vat_applicable || false, vat_rate || 15.00,
     cost_center_type, linked_entity_id, financial_statement, report_category,
     depreciation_method, useful_life_years, salvage_value || 0]
  );
  
  return result.rows[0];
}

/**
 * Update account
 */
async function updateAccount(id, data) {
  const allowedFields = [
    'account_name', 'account_name_ar', 'account_type', 'normal_balance', 
    'description', 'is_active', 'is_vat_applicable', 'vat_rate',
    'cost_center_type', 'linked_entity_id', 'financial_statement', 
    'report_category', 'depreciation_method', 'useful_life_years', 'salvage_value'
  ];
  const keys = Object.keys(data).filter(key => allowedFields.includes(key));
  
  if (keys.length === 0) {
    return getAccountById(id);
  }
  
  const setClauses = [];
  const values = [];
  
  keys.forEach((key, index) => {
    setClauses.push(`${key} = $${index + 1}`);
    values.push(data[key]);
  });
  
  const setClause = setClauses.join(', ');
  const allValues = [...values, id];
  
  const sql = `UPDATE chart_of_accounts SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
               WHERE id = $${keys.length + 1} RETURNING *`;
  
  const result = await query(sql, allValues);
  return result.rows[0] || null;
}

/**
 * Get children accounts
 */
async function getChildrenAccounts(parentId) {
  const result = await query(
    `SELECT * FROM chart_of_accounts 
     WHERE parent_id = $1 AND is_active = TRUE 
     ORDER BY account_code`,
    [parentId]
  );
  
  return result.rows;
}

/**
 * Get siblings accounts (same parent)
 */
async function getSiblingAccounts(accountId) {
  const sql = `
    SELECT c1.* 
    FROM chart_of_accounts c1
    INNER JOIN chart_of_accounts c2 ON c1.parent_id = c2.parent_id
    WHERE c2.id = $1 AND c1.id != $1 AND c1.is_active = TRUE
    ORDER BY c1.account_code
  `;
  
  const result = await query(sql, [accountId]);
  return result.rows;
}

/**
 * Search accounts by name or code
 */
async function searchAccounts(searchTerm) {
  const sql = `
    SELECT * FROM chart_of_accounts
    WHERE is_active = TRUE
      AND (
        account_name ILIKE $1 
        OR account_code ILIKE $1
        OR description ILIKE $1
      )
    ORDER BY account_code
    LIMIT 50
  `;
  
  const result = await query(sql, [`%${searchTerm}%`]);
  return result.rows;
}

/**
 * Get accounts by type
 */
async function getAccountsByType(accountType) {
  const sql = `
    SELECT * FROM chart_of_accounts
    WHERE account_type = $1 AND is_active = TRUE
    ORDER BY account_code
  `;
  
  const result = await query(sql, [accountType]);
  return result.rows;
}

/**
 * Deactivate account (soft delete)
 */
async function deactivateAccount(id) {
  const result = await query(
    `UPDATE chart_of_accounts SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1 RETURNING *`,
    [id]
  );
  
  return result.rows[0] || null;
}

module.exports = {
  getAccountTree,
  buildTreeStructure,
  getAccountById,
  getAccountByCode,
  createAccount,
  updateAccount,
  getChildrenAccounts,
  getSiblingAccounts,
  searchAccounts,
  getAccountsByType,
  deactivateAccount,
};
