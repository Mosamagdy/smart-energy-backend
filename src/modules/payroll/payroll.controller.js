const service = require('./payroll.service');
const exportService = require('./payroll-export.service');

/**
 * POST /api/payroll/approve-and-post
 * Approve and post payroll for multiple departments at once
 * Creates journal entries and posts them immediately
 */
async function approveAndPostPayroll(req, res, next) {
  try {
    const result = await service.approveAndPostPayroll(req.body, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تم ترحيل قيد الرواتب بنجاح',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/payroll/status
 * Get payroll posting status for current month/year
 * Only checks journal_entries - if it's not in the journal, it's not approved
 */
async function getPayrollStatus(req, res, next) {
  try {
    const { month, year } = req.query;
    const result = await service.getPayrollStatus(month, year);
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/payroll/export/excel
 * Export payroll to Excel with department grouping and totals
 * TASK 6-A: Excel Export (The Auditor's Sheet)
 */
async function exportPayrollExcel(req, res, next) {
  try {
    const { month, year } = req.query;
    
    console.log(`[Payroll Export] Requesting Excel export: Month ${month}, Year ${year}`);
    
    const result = await exportService.exportPayrollToExcel(month, year);
    
    // Set headers for file download
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    
    // Send file buffer
    res.send(result.buffer);
    
    console.log(`[Payroll Export] ✅ Excel file sent to client`);
  } catch (error) {
    console.error('[Payroll Export] Error:', error);
    next(error);
  }
}

module.exports = {
  approveAndPostPayroll,
  getPayrollStatus,
  exportPayrollExcel
};
