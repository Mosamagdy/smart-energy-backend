const service = require('./treasury.service');

// ============================================================================
// Treasury Controller - Cash & Bank Balance Management
// ============================================================================

/**
 * GET /api/finance/treasury/dashboard
 * Get treasury dashboard with balances and recent transactions
 */
async function getTreasuryDashboard(req, res, next) {
  try {
    const dashboard = await service.getTreasuryDashboard();
    
    res.status(200).json({
      status: 'success',
      data: dashboard
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTreasuryDashboard,
};
