const { query } = require('../../db');

/**
 * Analytics Repository
 * Optimized SQL aggregation queries for dashboards and KPIs
 * All calculations done at database level for performance
 */

/**
 * Get main GM dashboard - all high-level KPIs
 */
async function getMainDashboard() {
  const sql = `
    WITH leads_stats AS (
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'won') AS won,
        COUNT(*) FILTER (WHERE status = 'lost') AS lost,
        COUNT(*) FILTER (WHERE status IN ('new', 'contacted', 'negotiation')) AS in_progress,
        COALESCE(ROUND(
          COUNT(*) FILTER (WHERE status = 'won') * 100.0 / NULLIF(COUNT(*), 0)
        , 2), 0) AS conversion_rate
      FROM leads
    ),
    
    projects_stats AS (
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status IN ('planning', 'in_progress')) AS active,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
        COALESCE(ROUND(AVG(
          CASE 
            WHEN total_tasks > 0 THEN (completed_tasks * 100.0 / total_tasks)
            ELSE 0 
          END
        ), 2), 0) AS avg_progress_percentage
      FROM (
        SELECT 
          p.id,
          p.status,
          COUNT(t.id) AS total_tasks,
          COUNT(t.id) FILTER (WHERE t.status = 'completed') AS completed_tasks
        FROM projects p
        LEFT JOIN tasks t ON p.id = t.project_id
        GROUP BY p.id, p.status
      ) project_progress
    ),
    
    finance_stats AS (
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COALESCE(SUM(paid_amount), 0) AS total_paid,
        COALESCE(SUM(total_amount - paid_amount), 0) AS outstanding,
        COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count,
        COALESCE(SUM(total_amount) FILTER (
          WHERE invoice_date >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0) AS month_revenue,
        COALESCE(SUM(total_amount) FILTER (
          WHERE invoice_date >= DATE_TRUNC('year', CURRENT_DATE)
        ), 0) AS year_revenue
      FROM invoices
    ),
    
    expenses_stats AS (
      SELECT 
        COALESCE(SUM(amount), 0) AS total_expenses,
        COALESCE(SUM(amount) FILTER (
          WHERE expense_date >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0) AS month_expenses,
        COALESCE(SUM(amount) FILTER (
          WHERE expense_date >= DATE_TRUNC('year', CURRENT_DATE)
        ), 0) AS year_expenses
      FROM expenses
    ),
    
    maintenance_stats AS (
      SELECT 
        COUNT(DISTINCT mc.id) AS active_contracts,
        COUNT(DISTINCT ia.id) AS total_assets,
        COUNT(DISTINCT mv.id) AS total_visits,
        COUNT(DISTINCT mv.id) FILTER (
          WHERE mv.visit_date >= CURRENT_DATE 
          AND mv.visit_date <= CURRENT_DATE + INTERVAL '7 days'
          AND mv.status = 'scheduled'
        ) AS upcoming_visits,
        COUNT(DISTINCT mv.id) FILTER (
          WHERE mv.visit_date < CURRENT_DATE 
          AND mv.status IN ('scheduled', 'in_progress')
        ) AS overdue_visits,
        COUNT(DISTINCT mv.id) FILTER (
          WHERE mv.status = 'completed'
          AND mv.completed_at >= DATE_TRUNC('month', CURRENT_DATE)
        ) AS completed_this_month
      FROM maintenance_contracts mc
      LEFT JOIN installed_assets ia ON mc.client_id = ia.client_id
      LEFT JOIN maintenance_visits mv ON ia.id = mv.asset_id
      WHERE mc.status = 'active'
    ),
    
    hr_stats AS (
      SELECT 
        COUNT(DISTINCT e.id) AS total_employees,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') AS active_employees,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'pending') AS pending_leaves,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'approved') AS approved_leaves
      FROM employees e
      LEFT JOIN leave_requests l ON e.id = l.employee_id
    ),
    
    inventory_stats AS (
      SELECT 
        COUNT(*) AS total_items,
        COUNT(*) FILTER (WHERE quantity <= reorder_level) AS low_stock_items,
        COUNT(*) FILTER (WHERE quantity = 0) AS out_of_stock_items
      FROM inventory_items
    )
    
    SELECT 
      json_build_object(
        'total', ls.total,
        'won', ls.won,
        'lost', ls.lost,
        'in_progress', ls.in_progress,
        'conversion_rate', ls.conversion_rate
      ) AS leads,
      
      json_build_object(
        'total', ps.total,
        'active', ps.active,
        'completed', ps.completed,
        'delivered', ps.delivered,
        'avg_progress_percentage', ps.avg_progress_percentage
      ) AS projects,
      
      json_build_object(
        'total_revenue', fs.total_revenue,
        'total_paid', fs.total_paid,
        'outstanding', fs.outstanding,
        'overdue_invoices', fs.overdue_count,
        'month_revenue', fs.month_revenue,
        'year_revenue', fs.year_revenue,
        'total_expenses', es.total_expenses,
        'month_expenses', es.month_expenses,
        'year_expenses', es.year_expenses,
        'net_profit', fs.total_revenue - es.total_expenses,
        'month_net_profit', fs.month_revenue - es.month_expenses,
        'year_net_profit', fs.year_revenue - es.year_expenses
      ) AS finance,
      
      json_build_object(
        'total_employees', hs.total_employees,
        'active_employees', hs.active_employees,
        'pending_leaves', hs.pending_leaves,
        'approved_leaves', hs.approved_leaves
      ) AS hr,
      
      json_build_object(
        'active_contracts', ms.active_contracts,
        'total_assets', ms.total_assets,
        'total_visits', ms.total_visits,
        'upcoming_visits', ms.upcoming_visits,
        'overdue_visits', ms.overdue_visits,
        'completed_this_month', ms.completed_this_month
      ) AS maintenance,
      
      json_build_object(
        'total_items', invs.total_items,
        'low_stock_items', invs.low_stock_items,
        'out_of_stock_items', invs.out_of_stock_items
      ) AS inventory
    FROM leads_stats ls, projects_stats ps, finance_stats fs, 
         expenses_stats es, hr_stats hs, maintenance_stats ms, inventory_stats invs;
  `;
  
  const result = await query(sql);
  return result.rows[0];
}

/**
 * Financial analytics with monthly trends
 */
async function getFinancialAnalytics(filters = {}) {
  const { period = 'month', project_id = null } = filters;
  
  // Monthly revenue vs expenses
  const monthlyTrendSql = `
    SELECT 
      TO_CHAR(date_trunc('month', gs.month), 'YYYY-MM') AS month,
      COALESCE(SUM(i.total_amount), 0) AS revenue,
      COALESCE(SUM(e.amount), 0) AS expenses,
      COALESCE(SUM(i.total_amount), 0) - COALESCE(SUM(e.amount), 0) AS profit
    FROM generate_series(
      DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
      DATE_TRUNC('month', CURRENT_DATE),
      INTERVAL '1 month'
    ) gs(month)
    LEFT JOIN invoices i ON 
      DATE_TRUNC('month', i.invoice_date) = gs.month
      ${project_id ? `AND i.project_id = ${project_id}` : ''}
    LEFT JOIN expenses e ON 
      DATE_TRUNC('month', e.expense_date) = gs.month
      ${project_id ? `AND e.project_id = ${project_id}` : ''}
    GROUP BY gs.month
    ORDER BY gs.month ASC;
  `;
  
  // Top 5 profitable projects
  const topProjectsSql = `
    SELECT 
      p.id,
      p.name,
      COALESCE(SUM(i.total_amount), 0) AS total_revenue,
      COALESCE(SUM(e.amount), 0) AS total_expenses,
      COALESCE(SUM(i.total_amount), 0) - COALESCE(SUM(e.amount), 0) AS net_profit,
      ROUND(
        (COALESCE(SUM(i.total_amount), 0) - COALESCE(SUM(e.amount), 0)) * 100.0 / 
        NULLIF(COALESCE(SUM(i.total_amount), 0), 0)
      , 2) AS profit_margin
    FROM projects p
    LEFT JOIN invoices i ON p.id = i.project_id
    LEFT JOIN expenses e ON p.id = e.project_id
    GROUP BY p.id, p.name
    HAVING COALESCE(SUM(i.total_amount), 0) > 0 OR COALESCE(SUM(e.amount), 0) > 0
    ORDER BY net_profit DESC
    LIMIT 5;
  `;
  
  // Outstanding receivables
  const receivablesSql = `
    SELECT 
      COUNT(*) AS total_unpaid_invoices,
      SUM(total_amount - paid_amount) AS total_outstanding_amount,
      AVG(total_amount - paid_amount) AS avg_invoice_amount,
      MAX(due_date) AS furthest_due_date
    FROM invoices
    WHERE status != 'paid'
      AND total_amount > paid_amount;
  `;
  
  const [monthlyTrend, topProjects, receivables] = await Promise.all([
    query(monthlyTrendSql),
    query(topProjectsSql),
    query(receivablesSql)
  ]);
  
  return {
    monthly_trend: monthlyTrend.rows,
    top_projects: topProjects.rows,
    receivables: receivables.rows[0]
  };
}

/**
 * HR & Productivity Analytics
 */
async function getHRAnalytics() {
  // Headcount per department
  const headcountSql = `
    SELECT 
      d.name AS department_name,
      COUNT(e.id) AS employee_count,
      COUNT(e.id) FILTER (WHERE e.status = 'active') AS active_count,
      COUNT(e.id) FILTER (WHERE e.status = 'inactive') AS inactive_count
    FROM departments d
    LEFT JOIN employees e ON d.id = e.department_id
    GROUP BY d.id, d.name
    ORDER BY employee_count DESC;
  `;
  
  // Employee performance based on completed tasks/visits
  const performanceSql = `
    WITH task_completions AS (
      SELECT 
        u.id AS user_id,
        COUNT(t.id) AS completed_tasks,
        COUNT(t.id) FILTER (
          WHERE t.completed_at >= DATE_TRUNC('month', CURRENT_DATE)
        ) AS completed_this_month
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to AND t.status = 'completed'
      GROUP BY u.id
    ),
    
    visit_completions AS (
      SELECT 
        ae.assigned_engineer_id AS user_id,
        COUNT(mv.id) AS completed_visits,
        COUNT(mv.id) FILTER (
          WHERE mv.status = 'completed'
          AND mv.completed_at >= DATE_TRUNC('month', CURRENT_DATE)
        ) AS visits_this_month
      FROM maintenance_visits mv
      INNER JOIN installed_assets ae ON mv.asset_id = ae.id
      WHERE mv.status = 'completed'
      GROUP BY ae.assigned_engineer_id
    )
    
    SELECT 
      u.id,
      u.first_name || ' ' || u.last_name AS employee_name,
      u.email,
      d.name AS department,
      COALESCE(tc.completed_tasks, 0) AS total_tasks_completed,
      COALESCE(tc.completed_this_month, 0) AS tasks_this_month,
      COALESCE(vc.completed_visits, 0) AS total_visits_completed,
      COALESCE(vc.visits_this_month, 0) AS visits_this_month,
      COALESCE(tc.completed_tasks, 0) + COALESCE(vc.completed_visits, 0) AS total_completions,
      COALESCE(tc.completed_this_month, 0) + COALESCE(vc.visits_this_month, 0) AS completions_this_month
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN task_completions tc ON u.id = tc.user_id
    LEFT JOIN visit_completions vc ON u.id = vc.user_id
    WHERE u.role_name IN ('engineer', 'project_manager')
    ORDER BY total_completions DESC
    LIMIT 20;
  `;
  
  // Leave statistics
  const leaveStatsSql = `
    SELECT 
      COUNT(*) AS total_leaves,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'approved') AS approved,
      COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
      COUNT(*) FILTER (
        WHERE start_date >= CURRENT_DATE 
        AND status = 'approved'
      ) AS upcoming_approved_leaves
    FROM leave_requests;
  `;
  
  const [headcount, performance, leaveStats] = await Promise.all([
    query(headcountSql),
    query(performanceSql),
    query(leaveStatsSql)
  ]);
  
  return {
    headcount_by_department: headcount.rows,
    employee_performance: performance.rows,
    leave_statistics: leaveStats.rows[0]
  };
}

/**
 * Inventory & Maintenance Analytics
 */
async function getInventoryMaintenanceAnalytics() {
  // Low stock alerts
  const lowStockSql = `
    SELECT 
      ii.name AS item_name,
      ii.sku,
      ii.quantity AS current_quantity,
      ii.reorder_level,
      ii.unit,
      c.name AS category_name,
      CASE 
        WHEN ii.quantity = 0 THEN 'out_of_stock'
        WHEN ii.quantity < ii.reorder_level THEN 'low_stock'
        ELSE 'adequate'
      END AS stock_status,
      ii.reorder_level - ii.quantity AS quantity_needed
    FROM inventory_items ii
    LEFT JOIN categories c ON ii.category_id = c.id
    WHERE ii.quantity <= ii.reorder_level
    ORDER BY 
      CASE 
        WHEN ii.quantity = 0 THEN 1
        ELSE 2
      END,
      (ii.reorder_level - ii.quantity) DESC
    LIMIT 20;
  `;
  
  // Most used materials in projects
  const materialsUsageSql = `
    SELECT 
      im.item_name,
      im.unit,
      SUM(im.quantity_used) AS total_used,
      COUNT(DISTINCT im.project_id) AS projects_used_in,
      AVG(im.quantity_used) AS avg_per_project
    FROM (
      SELECT 
        item_name,
        unit,
        quantity,
        project_id
      FROM purchase_requests
      WHERE status = 'approved'
      
      UNION ALL
      
      SELECT 
        item_name,
        unit,
        quantity_allocated,
        project_id
      FROM project_materials
    ) im
    GROUP BY im.item_name, im.unit
    ORDER BY total_used DESC
    LIMIT 20;
  `;
  
  // Average response time for maintenance visits
  const responseTimeSql = `
    SELECT 
      COUNT(*) AS total_completed_visits,
      ROUND(AVG(
        EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
      ), 2) AS avg_response_time_hours,
      ROUND(MIN(
        EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
      ), 2) AS min_response_time_hours,
      ROUND(MAX(
        EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
      ), 2) AS max_response_time_hours,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
      ), 2) AS median_response_time_hours
    FROM maintenance_visits
    WHERE status = 'completed'
      AND completed_at IS NOT NULL;
  `;
  
  // Visit types breakdown
  const visitTypesSql = `
    SELECT 
      visit_type,
      COUNT(*) AS count,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) AS percentage
    FROM maintenance_visits
    GROUP BY visit_type
    ORDER BY count DESC;
  `;
  
  const [lowStock, materialsUsage, responseTime, visitTypes] = await Promise.all([
    query(lowStockSql),
    query(materialsUsageSql),
    query(responseTimeSql),
    query(visitTypesSql)
  ]);
  
  return {
    low_stock_alerts: lowStock.rows,
    most_used_materials: materialsUsage.rows.length > 0 ? materialsUsage.rows : [],
    response_time_stats: responseTime.rows[0],
    visit_types_breakdown: visitTypes.rows
  };
}

/**
 * Department-specific dashboard
 */
async function getDepartmentDashboard(departmentId) {
  // Get department info
  const deptSql = `
    SELECT id, name, name_ar, code
    FROM departments
    WHERE id = $1
  `;
  const deptResult = await query(deptSql, [departmentId]);
  
  if (deptResult.rows.length === 0) {
    throw new Error('القسم غير موجود');
  }
  
  const department = deptResult.rows[0];
  const deptName = department.name.toLowerCase();
  
  // Different metrics based on department type
  let metrics = {};
  
  if (deptName.includes('sales') || deptName.includes('مبيعات')) {
    // Sales/Leads department
    metrics = await getSalesDepartmentMetrics(departmentId);
  } else if (deptName.includes('project') || deptName.includes('مشاريع')) {
    // Projects department
    metrics = await getProjectsDepartmentMetrics(departmentId);
  } else if (deptName.includes('finance') || deptName.includes('مالية')) {
    // Finance department
    metrics = await getFinanceDepartmentMetrics(departmentId);
  } else if (deptName.includes('hr') || deptName.includes('موارد')) {
    // HR department
    metrics = await getHRDepartmentMetrics(departmentId);
  } else if (deptName.includes('maintenance') || deptName.includes('صيانة')) {
    // Maintenance department
    metrics = await getMaintenanceDepartmentMetrics(departmentId);
  } else if (deptName.includes('qhse') || deptName.includes('جودة')) {
    // QHSE department
    metrics = await getQHSEDepartmentMetrics(departmentId);
  } else if (deptName.includes('procurement') || deptName.includes('مشتريات')) {
    // Procurement department
    metrics = await getProcurementDepartmentMetrics(departmentId);
  } else {
    // Generic metrics for other departments
    metrics = await getGenericDepartmentMetrics(departmentId);
  }
  
  return {
    department: {
      id: department.id,
      name: department.name,
      name_ar: department.name_ar,
      code: department.code
    },
    metrics
  };
}

// Helper functions for department-specific metrics
async function getSalesDepartmentMetrics(deptId) {
  const sql = `
    SELECT 
      COUNT(l.id) AS total_leads,
      COUNT(l.id) FILTER (WHERE l.status = 'won') AS won_leads,
      COUNT(l.id) FILTER (WHERE l.status = 'lost') AS lost_leads,
      COUNT(l.id) FILTER (WHERE l.status IN ('new', 'contacted', 'negotiation')) AS active_leads,
      COALESCE(SUM(l.estimated_value), 0) AS total_pipeline_value,
      COALESCE(SUM(l.estimated_value) FILTER (WHERE l.status = 'won'), 0) AS won_value,
      ROUND(COUNT(l.id) FILTER (WHERE l.status = 'won') * 100.0 / NULLIF(COUNT(l.id), 0), 2) AS conversion_rate
    FROM leads l
    WHERE l.department_id = $1;
  `;
  
  const result = await query(sql, [deptId]);
  return { sales_metrics: result.rows[0] };
}

async function getProjectsDepartmentMetrics(deptId) {
  const sql = `
    SELECT 
      COUNT(p.id) AS total_projects,
      COUNT(p.id) FILTER (WHERE p.status IN ('planning', 'in_progress')) AS active_projects,
      COUNT(p.id) FILTER (WHERE p.status = 'completed') AS completed_projects,
      COUNT(p.id) FILTER (WHERE p.status = 'delivered') AS delivered_projects,
      COALESCE(SUM(p.budget), 0) AS total_budget,
      COALESCE(SUM(p.budget) FILTER (WHERE p.status IN ('planning', 'in_progress')), 0) AS active_budget
    FROM projects p
    WHERE p.department_id = $1;
  `;
  
  const result = await query(sql, [deptId]);
  return { projects_metrics: result.rows[0] };
}

async function getFinanceDepartmentMetrics(deptId) {
  const sql = `
    SELECT 
      COUNT(i.id) AS total_invoices,
      COALESCE(SUM(i.total_amount), 0) AS total_revenue,
      COALESCE(SUM(i.paid_amount), 0) AS total_collected,
      COALESCE(SUM(i.total_amount - i.paid_amount), 0) AS outstanding,
      COUNT(i.id) FILTER (WHERE i.status = 'overdue') AS overdue_invoices,
      COALESCE(SUM(e.amount), 0) AS total_expenses,
      COALESCE(SUM(i.total_amount - i.paid_amount), 0) - COALESCE(SUM(e.amount), 0) AS net_cash_flow
    FROM invoices i
    LEFT JOIN expenses e ON TRUE
    WHERE i.department_id = $1;
  `;
  
  const result = await query(sql, [deptId]);
  return { finance_metrics: result.rows[0] };
}

async function getHRDepartmentMetrics(deptId) {
  const sql = `
    SELECT 
      COUNT(e.id) AS total_employees,
      COUNT(e.id) FILTER (WHERE e.status = 'active') AS active_employees,
      COUNT(l.id) FILTER (WHERE l.status = 'pending') AS pending_leaves,
      COUNT(l.id) FILTER (WHERE l.status = 'approved') AS approved_leaves,
      COUNT(l.id) FILTER (WHERE l.status = 'rejected') AS rejected_leaves
    FROM employees e
    LEFT JOIN leave_requests l ON e.id = l.employee_id
    WHERE e.department_id = $1;
  `;
  
  const result = await query(sql, [deptId]);
  return { hr_metrics: result.rows[0] };
}

async function getMaintenanceDepartmentMetrics(deptId) {
  const sql = `
    SELECT 
      COUNT(DISTINCT ia.id) AS total_assets,
      COUNT(DISTINCT ia.id) FILTER (WHERE ia.status = 'operational') AS operational_assets,
      COUNT(DISTINCT ia.id) FILTER (WHERE ia.status = 'needs_maintenance') AS needs_maintenance_assets,
      COUNT(DISTINCT mv.id) AS total_visits,
      COUNT(DISTINCT mv.id) FILTER (WHERE mv.status = 'completed') AS completed_visits,
      COUNT(DISTINCT mv.id) FILTER (WHERE mv.status = 'scheduled' AND mv.visit_date >= CURRENT_DATE) AS upcoming_visits,
      COUNT(DISTINCT mv.id) FILTER (WHERE mv.status IN ('scheduled', 'in_progress') AND mv.visit_date < CURRENT_DATE) AS overdue_visits,
      COUNT(DISTINCT mc.id) FILTER (WHERE mc.status = 'active') AS active_contracts
    FROM installed_assets ia
    LEFT JOIN maintenance_visits mv ON ia.id = mv.asset_id
    LEFT JOIN maintenance_contracts mc ON ia.client_id = mc.client_id
    WHERE ia.assigned_engineer_id IN (
      SELECT u.id FROM users u WHERE u.department_id = $1
    );
  `;
  
  const result = await query(sql, [deptId]);
  return { maintenance_metrics: result.rows[0] };
}

async function getQHSEDepartmentMetrics(deptId) {
  const sql = `
    SELECT 
      COUNT(qi.id) AS total_inspections,
      COUNT(qi.id) FILTER (WHERE qi.status = 'completed') AS completed_inspections,
      COUNT(qi.id) FILTER (WHERE qi.status = 'scheduled') AS scheduled_inspections,
      COUNT(qi.id) FILTER (WHERE qi.status = 'pending') AS pending_inspections,
      COUNT(qi.id) FILTER (WHERE qi.report IS NOT NULL) AS reports_submitted
    FROM qhse_inspections qi
    WHERE qi.assigned_engineer_id IN (
      SELECT u.id FROM users u WHERE u.department_id = $1
    );
  `;
  
  const result = await query(sql, [deptId]);
  return { qhse_metrics: result.rows[0] };
}

async function getProcurementDepartmentMetrics(deptId) {
  const sql = `
    SELECT 
      COUNT(pr.id) AS total_requests,
      COUNT(pr.id) FILTER (WHERE pr.status = 'pending') AS pending_requests,
      COUNT(pr.id) FILTER (WHERE pr.status = 'approved') AS approved_requests,
      COUNT(pr.id) FILTER (WHERE pr.status = 'rejected') AS rejected_requests,
      COUNT(pr.id) FILTER (WHERE pr.status = 'ready') AS ready_requests
    FROM purchase_requests pr
    WHERE pr.requested_by IN (
      SELECT u.id FROM users u WHERE u.department_id = $1
    );
  `;
  
  const result = await query(sql, [deptId]);
  return { procurement_metrics: result.rows[0] };
}

async function getGenericDepartmentMetrics(deptId) {
  const sql = `
    SELECT 
      COUNT(DISTINCT e.id) AS employee_count,
      COUNT(DISTINCT t.id) AS total_tasks,
      COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') AS completed_tasks,
      COUNT(DISTINCT u.id) FILTER (
        WHERE u.department_id = $1 
        AND u.role_name IN ('engineer', 'project_manager')
      ) AS field_staff_count
    FROM employees e
    LEFT JOIN tasks t ON e.user_id = t.assigned_to
    LEFT JOIN users u ON e.department_id = u.department_id
    WHERE e.department_id = $1;
  `;
  
  const result = await query(sql, [deptId]);
  return { general_metrics: result.rows[0] };
}

/**
 * Customer Satisfaction Analytics for GM Dashboard
 */
async function getCustomerSatisfaction() {
  const sql = `
    WITH rating_stats AS (
      SELECT 
        COUNT(*) AS total_reviews,
        ROUND(AVG(rating), 2) AS average_rating,
        ROUND(
          COUNT(*) FILTER (WHERE rating >= 4) * 100.0 / NULLIF(COUNT(*), 0)
        , 2) AS satisfaction_rate,
        COUNT(*) FILTER (WHERE rating = 5) AS five_star_count,
        COUNT(*) FILTER (WHERE rating = 4) AS four_star_count,
        COUNT(*) FILTER (WHERE rating = 3) AS three_star_count,
        COUNT(*) FILTER (WHERE rating = 2) AS two_star_count,
        COUNT(*) FILTER (WHERE rating = 1) AS one_star_count
      FROM project_ratings
    ),
    
    latest_comments AS (
      SELECT 
        pr.id,
        pr.project_id,
        p.name AS project_name,
        pr.rating,
        pr.comment,
        pr.is_anonymous,
        CASE 
          WHEN pr.is_anonymous THEN 'Anonymous'
          ELSE c.first_name || ' ' || c.last_name
        END AS client_name,
        pr.created_at
      FROM project_ratings pr
      INNER JOIN projects p ON pr.project_id = p.id
      INNER JOIN users c ON pr.client_id = c.id
      WHERE pr.comment IS NOT NULL AND pr.comment != ''
      ORDER BY pr.created_at DESC
      LIMIT 5
    ),
    
    monthly_trend AS (
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') AS month,
        ROUND(AVG(rating), 2) AS avg_rating,
        COUNT(*) AS review_count
      FROM project_ratings
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 6
    )
    
    SELECT 
      json_build_object(
        'total_reviews', rs.total_reviews,
        'average_rating', rs.average_rating,
        'satisfaction_rate', rs.satisfaction_rate,
        'five_stars', rs.five_star_count,
        'four_stars', rs.four_star_count,
        'three_stars', rs.three_star_count,
        'two_stars', rs.two_star_count,
        'one_star', rs.one_star_count
      ) AS summary,
      
      COALESCE(json_agg(DISTINCT lc) FILTER (WHERE lc.id IS NOT NULL), '[]'::json) AS latest_comments,
      
      COALESCE(json_agg(DISTINCT mt) FILTER (WHERE mt.month IS NOT NULL), '[]'::json) AS monthly_trend
      
    FROM rating_stats rs
    CROSS JOIN LATERAL (SELECT * FROM latest_comments) lc
    CROSS JOIN LATERAL (SELECT * FROM monthly_trend) mt;
  `;
  
  const result = await query(sql);
  return result.rows[0];
}

module.exports = {
  getMainDashboard,
  getFinancialAnalytics,
  getHRAnalytics,
  getInventoryMaintenanceAnalytics,
  getDepartmentDashboard,
  getCustomerSatisfaction,
};
