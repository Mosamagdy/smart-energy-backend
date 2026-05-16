const service = require('./reports.service');

// ============================================================================
// Financial Reports Controller - Request Handler Layer
// ============================================================================

function normalizeRole(role) {
  return typeof role === 'string' ? role.toLowerCase() : '';
}

function allowedReportsByRole(role) {
  const r = normalizeRole(role);

  // Super admin / GM: see everything (metadata)
  if (r === 'super_admin' || r === 'general_manager') {
    return ['finance', 'sales', 'hr', 'projects', 'technical'];
  }

  if (r === 'sales_manager') {
    return ['sales']; // Sales, Revenue, Lead Conversion
  }

  if (r === 'sales_rep') {
    return ['sales']; // but scoped to own leads in services
  }

  if (r === 'hr_manager') {
    return ['hr']; // Attendance, Payroll, Turnover
  }

  if (r === 'dep_pr_manager') {
    return ['projects']; // Project progress, Task completion
  }

  if (r === 'tech_head') {
    return ['technical']; // Technical KPIs
  }

  if (r === 'finance_manager') {
    return ['finance']; // trial balance, etc.
  }

  return [];
}

function assertCategoryAllowed(req, category) {
  const allowed = allowedReportsByRole(req.user?.role);
  if (!allowed.includes(category)) {
    const err = new Error('غير مصرح لك بالوصول لهذا التقرير');
    err.statusCode = 403;
    throw err;
  }
}

/**
 * GET /api/reports/available
 * Returns report metadata allowed for the current role.
 */
async function getAvailableReports(req, res, next) {
  try {
    const allowedCategories = allowedReportsByRole(req.user?.role);

    // Metadata only (no data leakage)
    const catalogue = {
      sales: [
        { key: 'sales.leads', name: 'Leads' },
        { key: 'sales.revenue', name: 'Revenue' },
        { key: 'sales.conversion', name: 'Lead Conversion' },
      ],
      hr: [
        { key: 'hr.attendance', name: 'Attendance' },
        { key: 'hr.payroll', name: 'Payroll' },
        { key: 'hr.turnover', name: 'Employee Turnover' },
      ],
      projects: [
        { key: 'projects.progress', name: 'Project Progress' },
        { key: 'projects.tasks', name: 'Task Completion' },
      ],
      technical: [
        { key: 'technical.kpis', name: 'Technical KPIs' },
      ],
      finance: [
        { key: 'finance.trialBalance', name: 'Trial Balance' },
        { key: 'finance.balanceSheet', name: 'Balance Sheet' },
        { key: 'finance.incomeStatement', name: 'Income Statement' },
        { key: 'finance.ledger', name: 'General Ledger' },
        { key: 'finance.receivablesAging', name: 'Receivables Aging' },
        { key: 'finance.payablesAging', name: 'Payables Aging' },
        { key: 'finance.cashFlow', name: 'Cash Flow' },
      ],
    };

    const data = {};
    for (const category of allowedCategories) {
      data[category] = catalogue[category] || [];
    }

    res.status(200).json({
      status: 'success',
      data: {
        role: normalizeRole(req.user?.role),
        allowed_categories: allowedCategories,
        reports: data,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/trial-balance
 * Get trial balance for a period
 */
async function getTrialBalance(req, res, next) {
  try {
    assertCategoryAllowed(req, 'finance');
    const { startDate, endDate } = req.query;
    
    // Validate date range if both are provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        const err = new Error('Invalid date format. Use YYYY-MM-DD');
        err.statusCode = 400;
        throw err;
      }
      
      if (start > end) {
        const err = new Error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
        err.statusCode = 400;
        throw err;
      }
    }
    
    const report = await service.getTrialBalance({ startDate, endDate });
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/balance-sheet
 * Get balance sheet as of specific date
 */
async function getBalanceSheet(req, res, next) {
  try {
    assertCategoryAllowed(req, 'finance');
    const { asOfDate } = req.query;
    const report = await service.getBalanceSheet({ asOfDate: asOfDate || new Date() });
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/income-statement
 * Get income statement for a period
 */
async function getIncomeStatement(req, res, next) {
  try {
    assertCategoryAllowed(req, 'finance');
    const { startDate, endDate } = req.query;
    const report = await service.getIncomeStatement({ startDate, endDate });
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/ledger/:accountCode
 * Get account ledger with running balance
 */
async function getAccountLedger(req, res, next) {
  try {
    assertCategoryAllowed(req, 'finance');
    const { accountCode } = req.params;
    const { startDate, endDate } = req.query;
    const report = await service.getAccountLedger({ 
      accountCode, 
      startDate, 
      endDate 
    });
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/receivables-aging
 * Get customer receivables aging report
 */
async function getReceivablesAging(req, res, next) {
  try {
    assertCategoryAllowed(req, 'finance');
    const { asOfDate } = req.query;
    const report = await service.getReceivablesAging({ asOfDate: asOfDate || new Date() });
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/payables-aging
 * Get vendor payables aging report (placeholder for Phase 5)
 */
async function getPayablesAging(req, res, next) {
  try {
    assertCategoryAllowed(req, 'finance');
    const { asOfDate } = req.query;
    const report = await service.getPayablesAging({ asOfDate: asOfDate || new Date() });
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/cash-flow
 * Get cash flow statement
 */
async function getCashFlow(req, res, next) {
  try {
    assertCategoryAllowed(req, 'finance');
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      const err = new Error('startDate و endDate مطلوبان');
      err.statusCode = 400;
      throw err;
    }
    
    const report = await service.getCashFlow({ startDate, endDate });
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/project-cost-vs-invoiced
 * Consolidated view for finance manager before invoice approval
 */
async function getProjectCostVsInvoiced(req, res, next) {
  try {
    assertCategoryAllowed(req, 'finance');
    const { projectId, startDate, endDate } = req.query;
    const report = await service.getProjectCostVsInvoiced({
      projectId: projectId ? parseInt(projectId, 10) : null,
      startDate,
      endDate
    });
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAvailableReports,
  getTrialBalance,
  getBalanceSheet,
  getIncomeStatement,
  getAccountLedger,
  getReceivablesAging,
  getPayablesAging,
  getCashFlow,
  getProjectCostVsInvoiced
};