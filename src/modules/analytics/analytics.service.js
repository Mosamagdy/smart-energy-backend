const repo = require('./analytics.repository');

/**
 * Analytics Service
 * Business logic for analytics and reporting
 */

/**
 * Get main GM dashboard
 */
async function getMainDashboard() {
  try {
    const dashboard = await repo.getMainDashboard();
    
    // Format numbers for better readability
    const formatted = formatNumbers(dashboard);
    
    return {
      ...formatted,
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching main dashboard:', error.message);
    throw error;
  }
}

/**
 * Get financial analytics
 */
async function getFinancialAnalytics(filters) {
  try {
    const analytics = await repo.getFinancialAnalytics(filters);
    
    // Format currency values
    analytics.monthly_trend = analytics.monthly_trend.map(row => ({
      ...row,
      revenue: parseFloat(row.revenue),
      expenses: parseFloat(row.expenses),
      profit: parseFloat(row.profit)
    }));
    
    analytics.top_projects = analytics.top_projects.map(project => ({
      ...project,
      total_revenue: parseFloat(project.total_revenue),
      total_expenses: parseFloat(project.total_expenses),
      net_profit: parseFloat(project.net_profit),
      profit_margin: parseFloat(project.profit_margin)
    }));
    
    analytics.receivables = {
      ...analytics.receivables,
      total_outstanding_amount: parseFloat(analytics.receivables.total_outstanding_amount),
      avg_invoice_amount: parseFloat(analytics.receivables.avg_invoice_amount)
    };
    
    return analytics;
  } catch (error) {
    console.error('Error fetching financial analytics:', error.message);
    throw error;
  }
}

/**
 * Get HR analytics
 */
async function getHRAnalytics() {
  try {
    const analytics = await repo.getHRAnalytics();
    
    // Format headcount numbers
    analytics.headcount_by_department = analytics.headcount_by_department.map(dept => ({
      ...dept,
      employee_count: parseInt(dept.employee_count),
      active_count: parseInt(dept.active_count),
      inactive_count: parseInt(dept.inactive_count)
    }));
    
    // Format performance numbers
    analytics.employee_performance = analytics.employee_performance.map(emp => ({
      ...emp,
      total_tasks_completed: parseInt(emp.total_tasks_completed),
      tasks_this_month: parseInt(emp.tasks_this_month),
      total_visits_completed: parseInt(emp.total_visits_completed),
      visits_this_month: parseInt(emp.visits_this_month),
      total_completions: parseInt(emp.total_completions),
      completions_this_month: parseInt(emp.completions_this_month)
    }));
    
    // Format leave stats
    analytics.leave_statistics = {
      ...analytics.leave_statistics,
      total_leaves: parseInt(analytics.leave_statistics.total_leaves),
      pending: parseInt(analytics.leave_statistics.pending),
      approved: parseInt(analytics.leave_statistics.approved),
      rejected: parseInt(analytics.leave_statistics.rejected),
      cancelled: parseInt(analytics.leave_statistics.cancelled),
      upcoming_approved_leaves: parseInt(analytics.leave_statistics.upcoming_approved_leaves)
    };
    
    return analytics;
  } catch (error) {
    console.error('Error fetching HR analytics:', error.message);
    throw error;
  }
}

/**
 * Get inventory and maintenance analytics
 */
async function getInventoryMaintenanceAnalytics() {
  try {
    const analytics = await repo.getInventoryMaintenanceAnalytics();
    
    // Format low stock alerts
    analytics.low_stock_alerts = analytics.low_stock_alerts.map(item => ({
      ...item,
      current_quantity: parseInt(item.current_quantity),
      reorder_level: parseInt(item.reorder_level),
      quantity_needed: parseInt(item.quantity_needed)
    }));
    
    // Format materials usage
    analytics.most_used_materials = analytics.most_used_materials.map(mat => ({
      ...mat,
      total_used: parseFloat(mat.total_used),
      projects_used_in: parseInt(mat.projects_used_in),
      avg_per_project: parseFloat(mat.avg_per_project)
    }));
    
    // Response time stats already formatted from DB
    
    // Visit types breakdown
    analytics.visit_types_breakdown = analytics.visit_types_breakdown.map(type => ({
      ...type,
      count: parseInt(type.count),
      percentage: parseFloat(type.percentage)
    }));
    
    return analytics;
  } catch (error) {
    console.error('Error fetching inventory/maintenance analytics:', error.message);
    throw error;
  }
}

/**
 * Get department-specific dashboard
 */
async function getDepartmentDashboard(departmentId) {
  try {
    const dashboard = await repo.getDepartmentDashboard(departmentId);
    
    // Format all numeric values in metrics
    const formattedMetrics = {};
    
    for (const [key, value] of Object.entries(dashboard.metrics)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        formattedMetrics[key] = formatNumbers(value);
      } else if (Array.isArray(value)) {
        formattedMetrics[key] = value.map(item => formatNumbers(item));
      } else {
        formattedMetrics[key] = value;
      }
    }
    
    return {
      ...dashboard,
      metrics: formattedMetrics,
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching department dashboard:', error.message);
    throw error;
  }
}

/**
 * Helper function to format numbers consistently
 */
function formatNumbers(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const formatted = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      formatted[key] = 0;
    } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      // Convert numeric strings to appropriate types
      const num = parseFloat(value);
      formatted[key] = Number.isInteger(num) ? parseInt(value) : num;
    } else if (typeof value === 'number') {
      // Round very precise decimals
      formatted[key] = Number.isInteger(value) ? value : Math.round(value * 100) / 100;
    } else {
      formatted[key] = value;
    }
  }
  
  return formatted;
}

/**
 * Get customer satisfaction analytics
 */
async function getCustomerSatisfaction() {
  try {
    const analytics = await repo.getCustomerSatisfaction();
    
    // Parse JSON results
    const summary = analytics.summary;
    const latest_comments = Array.isArray(analytics.latest_comments) 
      ? analytics.latest_comments.map(c => ({
          ...c,
          rating: parseInt(c.rating)
        }))
      : [];
    const monthly_trend = Array.isArray(analytics.monthly_trend)
      ? analytics.monthly_trend.map(m => ({
          ...m,
          avg_rating: parseFloat(m.avg_rating),
          review_count: parseInt(m.review_count)
        }))
      : [];
    
    return {
      summary: {
        total_reviews: parseInt(summary.total_reviews) || 0,
        average_rating: parseFloat(summary.average_rating) || 0,
        satisfaction_rate: parseFloat(summary.satisfaction_rate) || 0,
        five_stars: parseInt(summary.five_stars) || 0,
        four_stars: parseInt(summary.four_stars) || 0,
        three_stars: parseInt(summary.three_stars) || 0,
        two_stars: parseInt(summary.two_stars) || 0,
        one_star: parseInt(summary.one_star) || 0
      },
      latest_comments,
      monthly_trend
    };
  } catch (error) {
    console.error('Error fetching customer satisfaction:', error.message);
    throw error;
  }
}

module.exports = {
  getMainDashboard,
  getFinancialAnalytics,
  getHRAnalytics,
  getInventoryMaintenanceAnalytics,
  getDepartmentDashboard,
  getCustomerSatisfaction,
};
