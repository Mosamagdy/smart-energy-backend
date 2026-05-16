const service = require('./analytics.service');

/**
 * Analytics Controller
 * HTTP request handlers for analytics and dashboards
 */

/**
 * GET /api/analytics/main-dashboard
 * Main GM dashboard with all KPIs
 */
async function getMainDashboard(req, res, next) {
  try {
    const dashboard = await service.getMainDashboard();
    
    res.json({
      status: 'success',
      message: 'تم جلب بيانات لوحة التحكم بنجاح',
      data: dashboard
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/analytics/finance
 * Financial analytics with trends and projections
 */
async function getFinancialAnalytics(req, res, next) {
  try {
    const filters = {
      period: req.query.period || 'month',
      project_id: req.query.project_id ? parseInt(req.query.project_id) : null
    };
    
    const analytics = await service.getFinancialAnalytics(filters);
    
    res.json({
      status: 'success',
      message: 'تم جلب البيانات المالية بنجاح',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/analytics/hr
 * HR & productivity analytics
 */
async function getHRAnalytics(req, res, next) {
  try {
    const analytics = await service.getHRAnalytics();
    
    res.json({
      status: 'success',
      message: 'تم جلب بيانات الموارد البشرية بنجاح',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/analytics/inventory-maintenance
 * Inventory and maintenance analytics
 */
async function getInventoryMaintenanceAnalytics(req, res, next) {
  try {
    const analytics = await service.getInventoryMaintenanceAnalytics();
    
    res.json({
      status: 'success',
      message: 'تم جلب بيانات المخزون والصيانة بنجاح',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/analytics/departments/:id
 * Department-specific dashboard
 */
async function getDepartmentDashboard(req, res, next) {
  try {
    const departmentId = parseInt(req.params.id);
    
    if (isNaN(departmentId)) {
      const err = new Error('رقم القسم غير صحيح');
      err.statusCode = 400;
      throw err;
    }
    
    const dashboard = await service.getDepartmentDashboard(departmentId);
    
    res.json({
      status: 'success',
      message: 'تم جلب بيانات قسم ' + dashboard.department.name + ' بنجاح',
      data: dashboard
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/analytics/projects
 * Project-specific analytics (optional enhancement)
 */
async function getProjectAnalytics(req, res, next) {
  try {
    const { query } = require('../../db');
    
    const sql = `
      SELECT 
        p.id,
        p.name AS project_name,
        p.status,
        p.start_date,
        p.end_date,
        p.budget,
        COUNT(t.id) AS total_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'completed') AS completed_tasks,
        ROUND(
          COUNT(t.id) FILTER (WHERE t.status = 'completed') * 100.0 / 
          NULLIF(COUNT(t.id), 0)
        , 2) AS completion_percentage,
        COALESCE(SUM(i.total_amount), 0) AS total_revenue,
        COALESCE(SUM(e.amount), 0) AS total_expenses,
        COALESCE(SUM(i.total_amount), 0) - COALESCE(SUM(e.amount), 0) AS net_profit
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN invoices i ON p.id = i.project_id
      LEFT JOIN expenses e ON p.id = e.project_id
      GROUP BY p.id, p.name, p.status, p.start_date, p.end_date, p.budget
      ORDER BY p.created_at DESC;
    `;
    
    const result = await query(sql);
    
    res.json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/analytics/customer-satisfaction
 * Customer satisfaction analytics for GM
 */
async function getCustomerSatisfaction(req, res, next) {
  try {
    const analytics = await service.getCustomerSatisfaction();
    
    res.json({
      status: 'success',
      message: 'تم جلب بيانات رضا العملاء بنجاح',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMainDashboard,
  getFinancialAnalytics,
  getHRAnalytics,
  getInventoryMaintenanceAnalytics,
  getDepartmentDashboard,
  getProjectAnalytics,
  getCustomerSatisfaction,
};
