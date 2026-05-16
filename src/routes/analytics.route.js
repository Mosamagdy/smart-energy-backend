const express = require('express');
const router = express.Router();

// Import controller
const analyticsController = require('../modules/analytics/analytics.controller');

// Import middlewares
const { authMiddleware } = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');

// Apply auth middleware to all routes
router.use(authMiddleware);

// ============================================
// MAIN DASHBOARD (GM & Super Admin only)
// ============================================

/**
 * @route   GET /api/analytics/main-dashboard
 * @desc    Main GM dashboard with all KPIs across modules
 * @access  Private (general_manager, super_admin only)
 */
router.get('/main-dashboard', 
  roleMiddleware(['general_manager', 'super_admin']),
  analyticsController.getMainDashboard
);

// ============================================
// FINANCIAL ANALYTICS
// ============================================

/**
 * @route   GET /api/analytics/finance
 * @desc    Financial analytics with monthly trends and projections
 * @access  Private (general_manager, finance_manager, super_admin)
 */
router.get('/finance', 
  roleMiddleware(['general_manager', 'finance_manager', 'super_admin']),
  analyticsController.getFinancialAnalytics
);

// ============================================
// HR & PRODUCTIVITY ANALYTICS
// ============================================

/**
 * @route   GET /api/analytics/hr
 * @desc    HR analytics including headcount, performance, leave stats
 * @access  Private (general_manager, hr_manager, dept_head, super_admin)
 */
router.get('/hr', 
  roleMiddleware(['general_manager', 'hr_manager', 'dept_head', 'super_admin']),
  analyticsController.getHRAnalytics
);

// ============================================
// INVENTORY & MAINTENANCE ANALYTICS
// ============================================

/**
 * @route   GET /api/analytics/inventory-maintenance
 * @desc    Inventory and maintenance analytics
 * @access  Private (general_manager, dept_head, super_admin)
 */
router.get('/inventory-maintenance', 
  roleMiddleware(['general_manager', 'dept_head', 'super_admin']),
  analyticsController.getInventoryMaintenanceAnalytics
);

// ============================================
// DEPARTMENT-SPECIFIC DASHBOARDS
// ============================================

/**
 * @route   GET /api/analytics/departments/:id
 * @desc    Department-specific dashboard based on department type
 * @access  Private (general_manager, dept_head of that department, super_admin)
 */
router.get('/departments/:id', 
  roleMiddleware(['general_manager', 'dept_head', 'super_admin']),
  analyticsController.getDepartmentDashboard
);

// ============================================
// PROJECT ANALYTICS (Optional Enhancement)
// ============================================

/**
 * @route   GET /api/analytics/projects
 * @desc    Project-specific analytics with completion % and profitability
 * @access  Private (general_manager, project_manager, super_admin)
 */
router.get('/projects', 
  roleMiddleware(['general_manager', 'project_manager', 'super_admin']),
  analyticsController.getProjectAnalytics
);

/**
 * @route   GET /api/analytics/customer-satisfaction
 * @desc    Customer satisfaction dashboard with ratings and trends
 * @access  Private (general_manager, super_admin only)
 */
router.get('/customer-satisfaction', 
  roleMiddleware(['general_manager', 'super_admin']),
  analyticsController.getCustomerSatisfaction
);

module.exports = router;
