const express = require('express');
const router = express.Router();
const controller = require('../modules/journal-entries/journal-entries.controller');
const {authMiddleware} = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');

// Apply authentication to all journal entry routes
router.use(authMiddleware);

/**
 * Journal Entries Routes
 * Role access matrix:
 * - super_admin: full access
 * - general_manager: read all
 * - finance_manager: full access (create/view)
 * - accountants: read all
 */

// POST /api/journal-entries - Create entry (finance_manager only)
router.post(
  '/',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.createJournalEntry
);

// GET /api/journal-entries/:id - Get single entry
router.get(
  '/:id',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getJournalEntryById
);

// GET /api/journal-entries/reference/:type/:id - Get by reference
router.get(
  '/reference/:type/:id',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getEntriesByReference
);

// GET /api/journal-entries/project/:projectId - Get project entries
router.get(
  '/project/:projectId',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getProjectEntries
);

// GET /api/journal-entries/trial-balance - Trial balance report
router.get(
  '/trial-balance',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager']),
  controller.getTrialBalance
);

module.exports = router;
