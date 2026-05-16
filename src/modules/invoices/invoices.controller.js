const service = require('./invoices.service');

// ============================================================================
// Invoices Controller - HTTP Request Handlers
// ============================================================================

/**
 * POST /api/finance/invoices
 * Create invoice with contract validation
 */
async function createInvoice(req, res, next) {
  try {
    const invoice = await service.createInvoice(req.body, req.user);
    
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء الفاتورة بنجاح',
      data: { invoice }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/finance/invoices/:id
 * Get invoice details
 */
async function getInvoiceById(req, res, next) {
  try {
    const invoice = await service.getInvoiceById(req.params.id);
    
    if (!invoice) {
      const err = new Error('الفاتورة غير موجودة');
      err.statusCode = 404;
      throw err;
    }
    
    res.status(200).json({
      status: 'success',
      data: { invoice }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/finance/projects/:projectId/invoices
 * Get all invoices for project
 */
async function getProjectInvoices(req, res, next) {
  try {
    const invoices = await service.getProjectInvoices(req.params.projectId);
    
    res.status(200).json({
      status: 'success',
      data: { invoices, count: invoices.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/finance/invoices/:id/payments
 * Record payment against invoice
 */
async function recordPayment(req, res, next) {
  try {
    const { amount, payment_method, reference_number, bank_name, notes } = req.body;
    
    if (!amount || amount <= 0) {
      const err = new Error('مبلغ الدفعة يجب أن يكون موجبًا');
      err.statusCode = 400;
      throw err;
    }
    
    const updatedInvoice = await service.recordPayment(
      req.params.id,
      { amount, payment_method, reference_number, bank_name, notes },
      req.user
    );
    
    res.status(200).json({
      status: 'success',
      message: 'تم تسجيل الدفعة بنجاح',
      data: { invoice: updatedInvoice }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/finance/projects/:projectId/receivables
 * Get project receivables summary
 */
async function getProjectReceivables(req, res, next) {
  try {
    const summary = await service.getProjectReceivables(req.params.projectId);
    
    res.status(200).json({
      status: 'success',
      data: { summary }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/finance/invoices/:id/finalize
 * Finalize invoice - change status from draft to final
 */
async function finalizeInvoice(req, res, next) {
  try {
    const invoiceId = parseInt(req.params.id);
    
    if (isNaN(invoiceId)) {
      const err = new Error('رقم الفاتورة غير صحيح');
      err.statusCode = 400;
      throw err;
    }
    
    console.log(`[Finalize Controller] Request for invoice ID: ${invoiceId}`);
    
    const invoice = await service.finalizeInvoice(invoiceId, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تم اعتماد الفاتورة بنجاح',
      data: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        status: invoice.status
      }
    });
  } catch (err) {
    console.error('[Finalize Controller] Error:', err.message);
    next(err);
  }
}

/**
 * POST /api/finance/invoices/:id/generate-tax-invoice
 * Generate tax invoice for final/sent invoice
 */
async function generateTaxInvoice(req, res, next) {
  try {
    const invoiceId = parseInt(req.params.id);
    
    if (isNaN(invoiceId)) {
      const err = new Error('رقم الفاتورة غير صحيح');
      err.statusCode = 400;
      throw err;
    }
    
    console.log(`[Tax Invoice Controller] Request for sales invoice ID: ${invoiceId}`);
    
    const taxInvoice = await service.generateTaxInvoice(invoiceId, req.user);
    
    res.status(200).json({
      status: 'success',
      message: `تم إصدار الفاتورة الضريبية رقم ${taxInvoice.tax_invoice_no} بنجاح`,
      data: {
        tax_invoice_no: taxInvoice.tax_invoice_no,
        zatca_uuid: taxInvoice.zatca_uuid,
        qr_code_data: taxInvoice.qr_code_data
      }
    });
  } catch (err) {
    console.error('[Tax Invoice Controller] Error:', err.message);
    next(err);
  }
}

/**
 * GET /api/finance/tax-invoices
 * Get all tax invoices from invoices table
 */
async function getTaxInvoices(req, res, next) {
  try {
    console.log('[Tax Invoices] Fetching all tax invoices');
    
    const result = await require('../../db').query(
      `SELECT 
         i.*,
         u.first_name || ' ' || u.last_name as client_name,
         p.name as project_name
       FROM invoices i
       LEFT JOIN users u ON i.client_id = u.id
       LEFT JOIN projects p ON i.project_id = p.id
       WHERE i.is_tax_invoice = true
       ORDER BY i.created_at DESC`
    );
    
    res.status(200).json({
      status: 'success',
      data: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    console.error('[Tax Invoices Controller] Error:', err.message);
    next(err);
  }
}

module.exports = {
  createInvoice,
  getInvoiceById,
  getProjectInvoices,
  recordPayment,
  getProjectReceivables,
  generateTaxInvoice,
  getTaxInvoices,
  finalizeInvoice
};
