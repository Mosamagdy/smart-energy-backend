const express = require('express');
const router = express.Router();

// Import controllers
const assetController = require('../modules/maintenance/maintenance.controller');
const visitController = require('../modules/maintenance/maintenance-visits.controller');

// Import middlewares
const roleMiddleware  = require('../middlewares/role');
const {authMiddleware} = require('../middlewares/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// ============================================
// INSTALLED ASSETS ROUTES
// ============================================

/**
 * @route   POST /api/maintenance/assets
 * @desc    Create new installed asset (requires dept_head, finance_manager, or super_admin)
 * @access  Private
 */
router.post('/assets', 
  roleMiddleware(['dept_head', 'finance_manager', 'general_manager', 'super_admin']),
  assetController.createAsset
);

/**
 * @route   GET /api/maintenance/assets
 * @desc    List all assets with filters
 * @access  Private
 */
router.get('/assets', 
  roleMiddleware(['dept_head', 'finance_manager', 'general_manager', 'super_admin', 'engineer']),
  assetController.listAssets
);

/**
 * @route   GET /api/maintenance/assets/project/:projectId
 * @desc    Get assets by project ID
 * @access  Private
 */
router.get('/assets/project/:projectId', 
  roleMiddleware(['dept_head', 'finance_manager', 'general_manager', 'super_admin', 'engineer']),
  assetController.getAssetsByProject
);

/**
 * @route   GET /api/maintenance/assets/warranty-alerts
 * @desc    Get warranty expiry alerts (30 days)
 * @access  Private
 */
router.get('/assets/warranty-alerts', 
  roleMiddleware(['dept_head', 'finance_manager', 'general_manager', 'super_admin']),
  assetController.getWarrantyAlerts
);

/**
 * @route   GET /api/maintenance/assets/dashboard
 * @desc    Get maintenance dashboard statistics
 * @access  Private
 */
router.get('/assets/dashboard', 
  roleMiddleware(['dept_head', 'finance_manager', 'general_manager', 'super_admin']),
  assetController.getDashboard
);

/**
 * @route   GET /api/maintenance/assets/:id
 * @desc    Get asset by ID with maintenance history
 * @access  Private
 */
router.get('/assets/:id', 
  roleMiddleware(['dept_head', 'finance_manager', 'general_manager', 'super_admin', 'engineer']),
  assetController.getAsset
);

/**
 * @route   PATCH /api/maintenance/assets/:id
 * @desc    Update asset information
 * @access  Private
 */
router.patch('/assets/:id', 
  roleMiddleware(['dept_head', 'finance_manager', 'general_manager', 'super_admin']),
  assetController.updateAsset
);

/**
 * @route   DELETE /api/maintenance/assets/:id
 * @desc    Delete asset (only if no maintenance visits)
 * @access  Private
 */
router.delete('/assets/:id', 
  roleMiddleware(['dept_head', 'finance_manager', 'general_manager', 'super_admin']),
  assetController.deleteAsset
);

// ============================================
// MAINTENANCE VISITS ROUTES
// ============================================

/**
 * @route   POST /api/maintenance/visits
 * @desc    Create new maintenance visit
 * @access  Private
 */
router.post('/visits', 
  roleMiddleware(['dept_head', 'finance_manager', 'general_manager', 'super_admin']),
  visitController.createVisit
);

/**
 * @route   GET /api/maintenance/visits
 * @desc    List all visits with filters
 * @access  Private
 */
router.get('/visits', 
  roleMiddleware(['dept_head', 'finance_manager', 'general_manager', 'super_admin', 'engineer']),
  visitController.listVisits
);

/**
 * @route   GET /api/maintenance/visits/upcoming
 * @desc    Get upcoming visits (next 7 days)
 * @access  Private
 */
router.get('/visits/upcoming', 
  roleMiddleware(['dept_head', 'finance_manager', 'general_manager', 'super_admin', 'engineer']),
  visitController.getUpcomingVisits
);

/**
 * @route   GET /api/maintenance/visits/overdue
 * @desc    Get overdue visits
 * @access  Private
 */
router.get('/visits/overdue', 
  roleMiddleware(['dept_head', 'finance_manager', 'general_manager', 'super_admin']),
  visitController.getOverdueVisits
);

/**
 * @route   GET /api/maintenance/visits/:id
 * @desc    Get visit by ID
 * @access  Private
 */
router.get('/visits/:id', 
  roleMiddleware(['dept_head', 'finance_manager', 'general_manager', 'super_admin', 'engineer']),
  visitController.getVisit
);

/**
 * @route   PATCH /api/maintenance/visits/:id/status
 * @desc    Update visit status
 * @access  Private
 */
router.patch('/visits/:id/status', 
  roleMiddleware(['dept_head', 'finance_manager', 'general_manager', 'super_admin', 'engineer']),
  visitController.updateVisitStatus
);

/**
 * @route   PATCH /api/maintenance/visits/:id
 * @desc    Update visit details
 * @access  Private
 */
router.patch('/visits/:id', 
  roleMiddleware(['dept_head', 'finance_manager', 'general_manager', 'super_admin', 'engineer']),
  visitController.updateVisit
);

/**
 * @route   DELETE /api/maintenance/visits/:id
 * @desc    Delete visit (only if not completed)
 * @access  Private
 */
router.delete('/visits/:id', 
  roleMiddleware(['dept_head', 'finance_manager', 'general_manager', 'super_admin']),
  visitController.deleteVisit
);

module.exports = router;
