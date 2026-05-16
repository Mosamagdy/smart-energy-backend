const { query } = require('../../db');

// ============================================================================
// Projects Repository - Data Access Layer
// ============================================================================

// ============================================================================
// Projects Repository - Data Access Layer
// ============================================================================

/**
 * Create a new project
 */
async function createProject(data) {
  const {
    name, description, budget, start_date, end_date,
    quotation_id, client_id, lead_id, department_id,
    status = 'planning'
  } = data;

  const result = await query(
    `INSERT INTO projects (
      name, description, budget, start_date, end_date,
      quotation_id, client_id, lead_id, department_id, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [name, description, budget, start_date, end_date, quotation_id, client_id, lead_id, department_id, status]
  );

  return result.rows[0];
}

/**
 * Get all projects with filters
 */
async function getAllProjects(filters = {}) {
  const {
    department_id,
    status,
    client_id,
    project_manager_id,
    user_role,
    user_department_id
  } = filters;
  
  let sql = `
    SELECT 
      p.*,
      d.name AS department_name,
      d.name AS technical_dept_name,
      u.first_name || ' ' || u.last_name AS project_manager_name,
      c.first_name || ' ' || c.last_name AS client_name,
      l.client_name AS lead_client_name,
      q.total_price AS quotation_value
    FROM projects p
    LEFT JOIN departments d ON d.id = p.department_id
    LEFT JOIN users u ON u.id = p.project_manager_id
    LEFT JOIN users c ON c.id = p.client_id
    LEFT JOIN leads l ON l.id = p.lead_id
    LEFT JOIN quotations q ON q.id = p.quotation_id
    WHERE 1=1
  `;
  
  const params = [];
  let paramIndex = 1;

  // Department isolation pattern (same behavior as leads module):
  // dept_head in technical department => only own technical department projects
  // dept_head in administrative department => all projects
  if (user_role === 'dept_head' && user_department_id) {
    const deptResult = await query(
      `SELECT dept_type FROM departments WHERE id = $1`,
      [user_department_id]
    );

    if (deptResult.rows.length > 0 && deptResult.rows[0].dept_type === 'technical') {
      params.push(user_department_id);
      sql += ` AND p.department_id = $${paramIndex++}`;
    }
  }
  
  if (department_id) {
    params.push(department_id);
    sql += ` AND p.department_id = $${paramIndex++}`;
  }
  
  // SIMPLE FILTER: If status filter is 'won' or contains 'won', filter by lead status instead
  if (status && status.includes('won')) {
    sql += ` AND EXISTS (SELECT 1 FROM leads l2 WHERE l2.id = p.lead_id AND l2.status = 'won')`;
  } else if (status) {
    // For other statuses, filter project status normally
    const statusArray = status.split(',').map(s => s.trim());
    if (statusArray.length === 1) {
      params.push(status);
      sql += ` AND p.status = $${paramIndex++}`;
    } else {
      const placeholders = statusArray.map((_, i) => `$${paramIndex + i}`).join(', ');
      params.push(...statusArray);
      sql += ` AND p.status IN (${placeholders})`;
      paramIndex += statusArray.length;
    }
  }
  
  if (client_id) {
    params.push(client_id);
    sql += ` AND p.client_id = $${paramIndex++}`;
  }
  
  if (project_manager_id) {
    params.push(project_manager_id);
    sql += ` AND p.project_manager_id = $${paramIndex++}`;
  }
  
  sql += ` ORDER BY p.created_at DESC`;
  
  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get single project by ID with full details
 */
async function getProjectById(id) {
  const projectId = Number(id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    const err = new Error('معرف المشروع يجب أن يكون رقمًا صحيحًا');
    err.statusCode = 400;
    throw err;
  }

  const result = await query(
    `SELECT 
      p.*, 
      d.name AS department_name,
      d.name AS technical_dept_name,
      u.first_name || ' ' || u.last_name AS project_manager_name,
      -- سحب بيانات العميل من جدول الـ leads مباشرة لأننا شلنا client_id من المشاريع
      l.client_name,
      l.contact_email AS client_email,
      l.contact_phone AS contact_phone,
      q.total_price AS quotation_value,
      l.client_name AS lead_original_name
    FROM projects p
    LEFT JOIN departments d ON d.id = p.department_id
    LEFT JOIN users u ON u.id = p.project_manager_id
    LEFT JOIN leads l ON l.id = p.lead_id -- الربط الأساسي بالـ lead_id
    LEFT JOIN quotations q ON q.id = p.quotation_id
    WHERE p.id = $1 
    LIMIT 1`,
    [projectId]
  );
  
  return result.rows[0] || null;
}

/**
 * Update project information
 */
async function updateProject(id, data) {
  const allowedFields = ['name', 'description', 'budget', 'start_date', 'end_date', 'status'];
  const keys = Object.keys(data).filter(key => allowedFields.includes(key));
  
  if (keys.length === 0) {
    return getProjectById(id);
  }
  
  const setClauses = [];
  const values = [];
  
  keys.forEach((key, index) => {
    setClauses.push(`${key} = $${index + 1}`);
    values.push(data[key]);
  });
  
  const setClause = setClauses.join(', ');
  const allValues = [...values, id];
  
  const sql = `UPDATE projects SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
               WHERE id = $${keys.length + 1} RETURNING *`;
  
  const result = await query(sql, allValues);
  return result.rows[0] || null;
}

/**
 * Update project status
 */
async function updateProjectStatus(id, status) {
  const result = await query(
    `UPDATE projects SET status = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0] || null;
}

/**
 * Assign project manager
 */
async function assignProjectManager(projectId, managerUserId) {
  const result = await query(
    `UPDATE projects SET project_manager_id = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2 RETURNING *`,
    [managerUserId, projectId]
  );
  return result.rows[0] || null;
}

// ============================================================================
// Project Employees Management
// ============================================================================

/**
 * Assign employee to project
 */
async function assignEmployeeToProject(projectId, employeeId, roleInProject) {
  const result = await query(
    `INSERT INTO project_employees (project_id, employee_id, role_in_project)
     VALUES ($1, $2, $3)
     ON CONFLICT (project_id, employee_id) DO UPDATE 
     SET role_in_project = $3, assigned_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [projectId, employeeId, roleInProject]
  );
  return result.rows[0];
}

/**
 * Get employees assigned to project
 */
async function getProjectEmployees(projectId) {
  const result = await query(
    `SELECT 
      pe.*,
      e.first_name, e.last_name, e.arabic_name,
      e.job_title, e.employee_number,
      u.email AS system_email, u.phone AS system_phone
    FROM project_employees pe
    JOIN employees e ON e.id = pe.employee_id
    LEFT JOIN users u ON u.id = e.user_id
    WHERE pe.project_id = $1
    ORDER BY pe.assigned_at DESC`,
    [projectId]
  );
  return result.rows;
}

/**
 * Remove employee from project
 */
async function removeEmployeeFromProject(projectId, employeeId) {
  await query(
    `DELETE FROM project_employees 
     WHERE project_id = $1 AND employee_id = $2`,
    [projectId, employeeId]
  );
}

// ============================================================================
// Purchase Requests
// ============================================================================

/**
 * Create purchase request
 */
async function createPurchaseRequest(data) {
  const { project_id, requested_by, item_name, quantity, unit, reason } = data;
  
  const result = await query(
    `INSERT INTO purchase_requests 
      (project_id, requested_by, item_name, quantity, unit, reason)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [project_id, requested_by, item_name, quantity, unit, reason]
  );
  
  return result.rows[0];
}

/**
 * Get purchase requests for project
 */
async function getPurchaseRequests(projectId) {
  const result = await query(
    `SELECT 
       pr.*,
       u.first_name || ' ' || u.last_name AS requested_by_name,
       approver.first_name || ' ' || approver.last_name AS approved_by_name
     FROM purchase_requests pr
     LEFT JOIN users u ON u.id = pr.requested_by
     LEFT JOIN users approver ON approver.id = pr.approved_by
     WHERE pr.project_id = $1
     ORDER BY pr.created_at DESC`,
    [projectId]
  );
  return result.rows;
}

/**
 * Update purchase request status
 */
async function updatePurchaseRequestStatus(id, status, approvedBy = null, rejectionReason = null) {
  const result = await query(
    `UPDATE purchase_requests SET
        status = $1,
        approved_by = $2,
        approved_at = CASE WHEN $1 = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END,
        rejection_reason = $3,
        updated_at = CURRENT_TIMESTAMP
     WHERE id = $4 RETURNING *`,
    [status, approvedBy, rejectionReason, id]
  );
  return result.rows[0] || null;
}

// ============================================================================
// Project Reports
// ============================================================================

/**
 * Create project report
 */
async function createProjectReport(data) {
  const { project_id, reported_by, report_type, title, content, status, attachments } = data;
  
  const result = await query(
    `INSERT INTO project_reports 
      (project_id, reported_by, report_type, title, content, status, attachments)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [project_id, reported_by, report_type, title, content, status || 'open', attachments]
  );
  
  return result.rows[0];
}

/**
 * Get project reports
 */
async function getProjectReports(projectId) {
  const result = await query(
    `SELECT 
       pr.*,
       u.first_name || ' ' || u.last_name AS reported_by_name
     FROM project_reports pr
     LEFT JOIN users u ON u.id = pr.reported_by
     WHERE pr.project_id = $1
     ORDER BY pr.created_at DESC`,
    [projectId]
  );
  return result.rows;
}

// ============================================================================
// QHSE Inspections
// ============================================================================

/**
 * Create QHSE inspection
 */
async function createQhseInspection(data) {
  const { project_id, assigned_by, assigned_engineer, inspection_date, safety_materials } = data;
  
  const result = await query(
    `INSERT INTO qhse_inspections 
      (project_id, assigned_by, assigned_engineer, inspection_date, safety_materials)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [project_id, assigned_by, assigned_engineer, inspection_date, safety_materials]
  );
  
  return result.rows[0];
}

/**
 * Get QHSE inspections for project
 */
async function getQhseInspections(projectId) {
  const result = await query(
    `SELECT 
       qi.*,
       ab.first_name || ' ' || ab.last_name AS assigned_by_name,
       ae.first_name || ' ' || ae.last_name AS assigned_engineer_name
     FROM qhse_inspections qi
     LEFT JOIN users ab ON ab.id = qi.assigned_by
     LEFT JOIN users ae ON ae.id = qi.assigned_engineer
     WHERE qi.project_id = $1
     ORDER BY qi.created_at DESC`,
    [projectId]
  );
  return result.rows;
}

/**
 * Update QHSE inspection (submit report)
 */
async function updateQhseInspection(id, data) {
  const allowedFields = ['status', 'report', 'attachments'];
  const keys = Object.keys(data).filter(key => allowedFields.includes(key));
  
  if (keys.length === 0) {
    return null;
  }
  
  const setClauses = [];
  const values = [];
  
  keys.forEach((key, index) => {
    setClauses.push(`${key} = $${index + 1}`);
    values.push(data[key]);
  });
  
  const setClause = setClauses.join(', ');
  const allValues = [...values, id];
  
  const sql = `UPDATE qhse_inspections SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
               WHERE id = $${keys.length + 1} RETURNING *`;
  
  const result = await query(sql, allValues);
  return result.rows[0] || null;
}

// ============================================================================
// Materials Allocation & Inventory Management
// ============================================================================

/**
 * Allocate materials from inventory to project
 * Uses database transaction for atomicity
 */
async function allocateMaterials(projectId, allocations, requestedBy) {
  // allocations = [{ item_id, quantity, unit, warehouse_id }]
  
  try {
    await query('BEGIN');
    
    const results = [];
    
    for (const allocation of allocations) {
      const { item_id, quantity, unit, warehouse_id } = allocation;
      
      // Check warehouse stock (warehouse-specific)
      const { rows: [warehouseStock] } = await query(
        `SELECT ws.*, i.item_name, i.item_name_ar, i.unit_of_measure
         FROM warehouse_stock ws
         JOIN inventory_items i ON i.id = ws.item_id
         WHERE ws.item_id = $1 AND ws.warehouse_id = $2
         FOR UPDATE`,
        [item_id, warehouse_id || 1] // Default to warehouse 1 if not specified
      );
      
      if (!warehouseStock) {
        await query('ROLLBACK');
        const err = new Error(`العنصر غير موجود في هذا المستودع`);
        err.statusCode = 404;
        throw err;
      }
      
      // CRITICAL: Quantity guardrail
      if (warehouseStock.quantity_on_hand < quantity) {
        await query('ROLLBACK');
        const err = new Error(`الكمية المطلوبة غير متوفرة في المخزون — يرجى إنشاء طلب شراء`);
        err.statusCode = 400;
        err.insufficient_stock = true;
        err.item_id = item_id;
        err.requested = quantity;
        err.available = warehouseStock.quantity_on_hand;
        throw err;
      }
      
      // Reserve quantity only at PM allocation stage (no stock deduction yet)
      await query(
        `UPDATE warehouse_stock 
         SET reserved_quantity = reserved_quantity + $1,
             updated_at = NOW()
         WHERE item_id = $2 AND warehouse_id = $3`,
        [quantity, item_id, warehouse_id || 1]
      );

      // Create reservation movement record
      const { rows: [movement] } = await query(
        `INSERT INTO inventory_movements 
          (inventory_item_id, project_id, movement_type, quantity, performed_by, notes, warehouse_id)
         VALUES ($1, $2, 'transfer', $3, $4, $5, $6)
         RETURNING *`,
        [item_id, projectId, quantity, requestedBy, `RESERVED for project ${projectId} from warehouse ${warehouse_id || 1}`, warehouse_id || 1]
      );
      
      results.push({
        item_id,
        item_name: warehouseStock.item_name,
        item_name_ar: warehouseStock.item_name_ar,
        quantity_allocated: quantity,
        unit: unit || warehouseStock.unit_of_measure,
        warehouse_id: warehouse_id || 1,
        previous_quantity: warehouseStock.quantity_on_hand,
        new_quantity: warehouseStock.quantity_on_hand,
        reserved_quantity: parseFloat(warehouseStock.reserved_quantity || 0) + parseFloat(quantity),
        allocation_status: 'reserved',
        movement_id: movement.id
      });
    }
    
    await query('COMMIT');
    return results;
    
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
}

/**
 * Get allocated materials for project
 */
async function getProjectMaterials(projectId) {
  const result = await query(
    `SELECT 
       im.*,
       i.item_name,
       i.item_code AS sku,
       i.unit_of_measure AS unit,
       u.first_name || ' ' || u.last_name AS performed_by_name
     FROM inventory_movements im
     JOIN inventory_items i ON i.id = im.inventory_item_id
     LEFT JOIN users u ON u.id = im.performed_by
     WHERE im.project_id = $1 AND im.movement_type IN ('transfer', 'out')
     ORDER BY im.created_at DESC`,
    [projectId]
  );
  return result.rows;
}

// ============================================================================
// Assets Assignment
// ============================================================================

/**
 * Assign asset to project
 */
async function assignAssetToProject(projectId, assetId, assignedBy) {
  const result = await query(
    `UPDATE assets 
     SET project_id = $1, 
         assigned_to = $2,
         status = 'assigned',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 RETURNING *`,
    [projectId, assignedBy, assetId]
  );
  return result.rows[0] || null;
}

/**
 * Get assets assigned to project
 */
async function getProjectAssets(projectId) {
  const result = await query(
    `SELECT 
       a.*,
       u.first_name || ' ' || u.last_name AS assigned_by_name
     FROM assets a
     LEFT JOIN users u ON u.id = a.assigned_to
     WHERE a.project_id = $1
     ORDER BY a.created_at DESC`,
    [projectId]
  );
  return result.rows;
}

/**
 * Return asset from project
 */
async function returnAssetFromProject(assetId) {
  const result = await query(
    `UPDATE assets 
     SET project_id = NULL, 
         assigned_to = NULL,
         status = 'available',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING *`,
    [assetId]
  );
  return result.rows[0] || null;
}

module.exports = {
  // Project CRUD
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  updateProjectStatus,
  assignProjectManager,
  
  // Project Employees
  assignEmployeeToProject,
  getProjectEmployees,
  removeEmployeeFromProject,
  
  // Purchase Requests
  createPurchaseRequest,
  getPurchaseRequests,
  updatePurchaseRequestStatus,
  
  // Project Reports
  createProjectReport,
  getProjectReports,
  
  // QHSE Inspections
  createQhseInspection,
  getQhseInspections,
  updateQhseInspection,
  
  // Materials & Assets
  allocateMaterials,
  getProjectMaterials,
  assignAssetToProject,
  getProjectAssets,
  returnAssetFromProject,
};