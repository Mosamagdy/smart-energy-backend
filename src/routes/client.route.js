const express = require('express');
const router = express.Router();

// Import controller
const clientController = require('../modules/client/client.controller');

// Import middlewares
const { authMiddleware } = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Restrict all routes to 'client' role only
router.use(roleMiddleware(['client']));

// ============================================
// CLIENT PROFILE
// ============================================

/**
 * @route   GET /api/client/profile
 * @desc    Get client profile information
 * @access  Private (client role only)
 */
router.get('/profile', clientController.getClientProfile);

// ============================================
// QUOTATIONS
// ============================================

/**
 * @route   GET /api/client/my-quotations
 * @desc    Get all quotations for this client
 * @access  Private (client role only)
 */
router.get('/my-quotations', clientController.getMyQuotations);

/**
 * @route   PATCH /api/client/quotations/:id/respond
 * @desc    Client responds to quotation (accept/reject)
 * @access  Private (client role only)
 */
router.patch('/quotations/:id/respond', clientController.respondToQuotation);

// ============================================
// PROJECTS
// ============================================

/**
 * @route   GET /api/client/projects
 * @desc    Get all projects for this client
 * @access  Private (client role only)
 */
router.get('/projects', clientController.getClientProjects);

/**
 * @route   GET /api/client/projects/:id
 * @desc    Get single project with tasks
 * @access  Private (client role only)
 */
router.get('/projects/:id', clientController.getClientProject);

/**
 * @route   GET /api/client/projects/:projectId/messages
 * @desc    Get support messages for a project (chat with sales rep)
 * @access  Private (client role only)
 */
router.get('/projects/:projectId/messages', clientController.getProjectMessages);

/**
 * @route   POST /api/client/projects/:projectId/messages
 * @desc    Send message to sales representative
 * @access  Private (client role only)
 */
router.post('/projects/:projectId/messages', clientController.sendMessage);

/**
 * @route   GET /api/client/projects/:id/rating-eligibility
 * @desc    Check if client can rate the project (30-day rule)
 * @access  Private (client role only)
 */
router.get('/projects/:id/rating-eligibility', clientController.checkRatingEligibility);

/**
 * @route   POST /api/client/projects/:id/ratings
 * @desc    Submit project rating (1-5 stars + comment)
 * @access  Private (client role only)
 */
router.post('/projects/:id/ratings', clientController.submitProjectRating);

// ============================================
// INVOICES
// ============================================

/**
 * @route   GET /api/client/invoices
 * @desc    Get all invoices for this client
 * @access  Private (client role only)
 */
router.get('/invoices', clientController.getClientInvoices);

/**
 * @route   GET /api/client/invoices/:id
 * @desc    Get single invoice with payment history
 * @access  Private (client role only)
 */
router.get('/invoices/:id', clientController.getClientInvoice);

// ============================================
// MAINTENANCE
// ============================================

/**
 * @route   GET /api/client/maintenance/assets
 * @desc    Get client's installed assets
 * @access  Private (client role only)
 */
router.get('/maintenance/assets', clientController.getClientAssets);

/**
 * @route   GET /api/client/maintenance/visits
 * @desc    Get client's maintenance visits
 * @access  Private (client role only)
 */
router.get('/maintenance/visits', clientController.getClientMaintenanceVisits);

/**
 * @route   GET /api/client/maintenance/contracts
 * @desc    Get client's maintenance contracts
 * @access  Private (client role only)
 */
router.get('/maintenance/contracts', clientController.getClientMaintenanceContracts);

// ============================================
// MESSAGES
// ============================================

/**
 * @route   PATCH /api/client/messages/:id/read
 * @desc    Mark message as read
 * @access  Private (client role only)
 */
router.patch('/messages/:id/read', clientController.markMessageRead);

/**
 * @route   GET /api/client/messages/unread-count
 * @desc    Get unread message count
 * @access  Private (client role only)
 */
router.get('/messages/unread-count', clientController.getUnreadCount);

// ============================================
// RATINGS
// ============================================

/**
 * @route   GET /api/client/ratings
 * @desc    Get client's submitted ratings
 * @access  Private (client role only)
 */
router.get('/ratings', clientController.getClientRatings);

module.exports = router;
