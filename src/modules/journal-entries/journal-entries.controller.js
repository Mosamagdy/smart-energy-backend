const service = require('./journal-entries.service');

// ============================================================================
// Journal Entries Controller - HTTP Request Handlers
// ============================================================================

/**
 * POST /api/journal-entries
 * Create balanced journal entry (double-entry)
 */
async function createJournalEntry(req, res, next) {
  try {
    const { entry_date, description, reference_type, reference_id, project_id, contract_id, lines } = req.body;
    
    // Validate required fields
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      const err = new Error('يجب تحديد السطور المحاسبية للقيد');
      err.statusCode = 400;
      throw err;
    }
    
    const entry = await service.createJournalEntry({
      entry_date,
      description,
      reference_type,
      reference_id,
      project_id,
      contract_id
    }, lines, req.user);
    
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء القيد المحاسبي بنجاح',
      data: { entry }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/journal-entries/:id
 * Get journal entry details with lines
 */
async function getJournalEntryById(req, res, next) {
  try {
    const entry = await service.getJournalEntryById(req.params.id);
    
    if (!entry) {
      const err = new Error('القيد المحاسبي غير موجود');
      err.statusCode = 404;
      throw err;
    }
    
    res.status(200).json({
      status: 'success',
      data: { entry }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/journal-entries/reference/:type/:id
 * Get entries by reference
 */
async function getEntriesByReference(req, res, next) {
  try {
    const { type, id } = req.params;
    const entries = await service.getEntriesByReference(type, parseInt(id));
    
    res.status(200).json({
      status: 'success',
      data: { entries, count: entries.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/journal-entries/project/:projectId
 * Get all entries for project
 */
async function getProjectEntries(req, res, next) {
  try {
    const entries = await service.getProjectEntries(req.params.projectId);
    
    res.status(200).json({
      status: 'success',
      data: { entries, count: entries.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/journal-entries/trial-balance
 * Get trial balance for date range
 */
async function getTrialBalance(req, res, next) {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      const err = new Error('تاريخ البداية والنهاية مطلوبان');
      err.statusCode = 400;
      throw err;
    }
    
    const trialBalance = await service.getTrialBalance(start_date, end_date);
    
    res.status(200).json({
      status: 'success',
      data: { trialBalance, count: trialBalance.length }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createJournalEntry,
  getJournalEntryById,
  getEntriesByReference,
  getProjectEntries,
  getTrialBalance,
};
