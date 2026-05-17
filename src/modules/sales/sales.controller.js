const salesService = require('./sales.service');

// ============================================================================
// Sales Module Controller
// Handles HTTP requests for Won Leads and Sales Invoices
// ============================================================================

/**
 * GET /api/sales/leads/won
 * Get all won leads with processing status
 */
async function getWonLeads(req, res) {
  console.log('[getWonLeads Controller] === REQUEST RECEIVED ===');
  
  try {
    console.log('[getWonLeads Controller] Calling service.getWonLeads()...');
    const leads = await salesService.getWonLeads();
    
    console.log('[getWonLeads Controller] Service returned', leads.length, 'leads');
    console.log('[getWonLeads Controller] Sending response now...');

    res.status(200).json({
      success: true,
      message: 'تم جلب قائمة العملاء الفائزين بنجاح',
      message_en: 'Won leads retrieved successfully',
      data: leads,
      count: leads.length
    });
    
    console.log('[getWonLeads Controller] ✅ Response sent successfully');

  } catch (error) {
    console.error('[getWonLeads Controller] ❌ ERROR:', error.message);
    console.error('[getWonLeads Controller] Error stack:', error.stack);

    res.status(500).json({
      success: false,
      message: 'فشل جلب قائمة العملاء الفائزين',
      message_en: error.message
    });
    
    console.log('[getWonLeads Controller] ✅ Error response sent');
  }
}

/**
 * POST /api/sales/leads/:id/process-won
 * Process a won lead: Create client user, AR account, link project
 */
async function processWonLead(req, res) {
  try {
    const leadId = parseInt(req.params.id);
    const userId = req.user?.id || req.body.created_by;

    if (!leadId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل مطلوب', // Lead ID is required
        message_en: 'Lead ID is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'يجب تسجيل الدخول', // Must be logged in
        message_en: 'Authentication required'
      });
    }

    console.log(`[processWonLead] Processing Lead #${leadId} by User #${userId}`);

    const result = await salesService.processWonLead(leadId, userId);

    return res.status(201).json({
      success: true,
      message: 'تم معالجة العميل الفائز بنجاح', // Won lead processed successfully
      message_en: 'Won lead processed successfully',
      data: result
    });

  } catch (error) {
    console.error('[processWonLead] Error:', error.message);

    // Handle specific errors with Arabic messages
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود أو حالته ليست "فاز"',
        message_en: error.message
      });
    }

    if (error.message.includes('role not found')) {
      return res.status(500).json({
        success: false,
        message: 'دور العميل غير موجود في النظام',
        message_en: error.message
      });
    }

    if (error.message.includes('account 121')) {
      return res.status(500).json({
        success: false,
        message: 'حساب المدينون (121) غير موجود في دليل الحسابات',
        message_en: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'فشل معالجة العميل الفائز',
      message_en: error.message
    });
  }
}

/**
 * POST /api/sales/invoices
 * Create sales invoice with automatic journal entry and PDF generation
 */
async function createSalesInvoice(req, res) {
  try {
    const userId = req.user?.id || req.body.created_by;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'يجب تسجيل الدخول',
        message_en: 'Authentication required'
      });
    }

    // Validate required fields
    const { lead_id, client_id, subtotal, revenue_account_id } = req.body;

    if (!lead_id) {
      return res.status(400).json({
        success: false,
        message: 'يرجى اختيار مشروع',
        message_en: 'Please select a project (lead_id is required)'
      });
    }

    if (!subtotal || subtotal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ الفرعي يجب أن يكون أكبر من صفر',
        message_en: 'Subtotal must be greater than zero'
      });
    }

    if (!revenue_account_id) {
      return res.status(400).json({
        success: false,
        message: 'حساب الإيرادات مطلوب',
        message_en: 'Revenue account is required'
      });
    }

    console.log(`[createSalesInvoice] Creating invoice for Lead #${lead_id}${client_id ? ', Client #' + client_id : ' (client_id will be derived from lead)'}`);

    const result = await salesService.createSalesInvoice(req.body, userId);

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء فاتورة المبيعات بنجاح',
      message_en: 'Sales invoice created successfully',
      data: {
        invoice: result.invoice,
        pdf_path: result.pdf_path,
        journal_entry: result.journal_entry_details
      }
    });

  } catch (error) {
    console.error('[createSalesInvoice] Error:', error.message);

    // Handle specific errors with Arabic messages
    if (error.message.includes('Invalid subtotal')) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ الفرعي غير صحيح',
        message_en: error.message
      });
    }

    if (error.message.includes('Lead not found')) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود',
        message_en: error.message
      });
    }

    if (error.message.includes('Client AR account not found')) {
      return res.status(400).json({
        success: false,
        message: 'حساب المدينون للعميل غير موجود. يرجى معالجة العميل الفائز أولاً',
        message_en: error.message
      });
    }

    if (error.message.includes('Invalid revenue account')) {
      return res.status(400).json({
        success: false,
        message: 'حساب الإيرادات غير صحيح. يجب أن يكون من فرع 41xxx',
        message_en: error.message
      });
    }

    if (error.message.includes('VAT account 22101 not found')) {
      return res.status(500).json({
        success: false,
        message: 'حساب ضريبة المخرجات (22101) غير موجود',
        message_en: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'فشل إنشاء فاتورة المبيعات',
      message_en: error.message
    });
  }
}

/**
 * GET /api/sales/invoices
 * List all sales invoices with optional filters
 */
async function getSalesInvoices(req, res) {
  try {
    const filters = {
      status: req.query.status,
      client_id: req.query.client_id,
      lead_id: req.query.lead_id
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) delete filters[key];
    });

    const invoices = await salesService.getSalesInvoices(filters);

    return res.status(200).json({
      success: true,
      message: 'تم جلب قائمة الفواتير بنجاح',
      message_en: 'Invoices retrieved successfully',
      data: invoices,
      count: invoices.length
    });

  } catch (error) {
    console.error('[getSalesInvoices] Error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'فشل جلب قائمة الفواتير',
      message_en: error.message
    });
  }
}

/**
 * GET /api/sales/invoices/:id
 * Get single invoice by ID
 */
async function getSalesInvoiceById(req, res) {
  try {
    const invoiceId = parseInt(req.params.id);

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الفاتورة مطلوب',
        message_en: 'Invoice ID is required'
      });
    }

    console.log(`[getSalesInvoiceById] Fetching Invoice #${invoiceId}`);

    const invoice = await salesService.getSalesInvoiceById(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة',
        message_en: 'Invoice not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'تم جلب الفاتورة بنجاح',
      message_en: 'Invoice retrieved successfully',
      data: invoice
    });

  } catch (error) {
    console.error('[getSalesInvoiceById] Error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'فشل جلب الفاتورة',
      message_en: error.message
    });
  }
}

/**
 * GET /api/sales/invoices/:id/pdf
 * Get PDF file path for download
 */
async function getInvoicePDF(req, res) {
  try {
    const invoiceId = parseInt(req.params.id);

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الفاتورة مطلوب',
        message_en: 'Invoice ID is required'
      });
    }

    const invoice = await salesService.getSalesInvoiceById(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة',
        message_en: 'Invoice not found'
      });
    }

    if (!invoice.pdf_path) {
      return res.status(404).json({
        success: false,
        message: 'ملف PDF غير موجود لهذه الفاتورة',
        message_en: 'PDF file not available for this invoice'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'تم العثور على ملف PDF',
      message_en: 'PDF found',
      data: {
        pdf_path: invoice.pdf_path,
        invoice_number: invoice.invoice_number
      }
    });

  } catch (error) {
    console.error('[getInvoicePDF] Error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'فشل جلب ملف PDF',
      message_en: error.message
    });
  }
}

/**
 * POST /api/sales/invoices/:id/finalize
 * Finalize sales invoice - change status from draft to final
 */
async function finalizeSalesInvoice(req, res) {
  try {
    const invoiceId = parseInt(req.params.id);
    const userId = req.user?.id;
    const warehouseId = req.body.warehouse_id ? parseInt(req.body.warehouse_id) : null;

    console.log(`[Finalize Controller] ===== REQUEST RECEIVED =====`);
    console.log(`[Finalize Controller] Invoice ID: ${invoiceId}`);
    console.log(`[Finalize Controller] User ID: ${userId}`);
    console.log(`[Finalize Controller] Warehouse ID: ${warehouseId || 'Not provided'}`);
    console.log(`[Finalize Controller] Request params:`, req.params);
    console.log(`[Finalize Controller] Request body:`, req.body);
    console.log(`[Finalize Controller] Request user:`, req.user);

    if (!invoiceId || isNaN(invoiceId)) {
      console.error(`[Finalize Controller] ❌ Invalid invoice ID: ${req.params.id}`);
      return res.status(400).json({
        success: false,
        message: 'معرف الفاتورة مطلوب',
        message_en: 'Invoice ID is required'
      });
    }

    if (!userId) {
      console.error(`[Finalize Controller] ❌ No user ID in request`);
      return res.status(401).json({
        success: false,
        message: 'يجب تسجيل الدخول',
        message_en: 'Authentication required'
      });
    }

    console.log(`[Finalize Controller] Calling service.finalizeSalesInvoice...`);

    const invoice = await salesService.finalizeSalesInvoice(invoiceId, userId, warehouseId);

    console.log(`[Finalize Controller] ✅ Service returned successfully`);

    return res.status(200).json({
      success: true,
      message: 'تم اعتماد الفاتورة بنجاح',
      message_en: 'Invoice finalized successfully',
      data: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        status: invoice.status
      }
    });
  } catch (error) {
    console.error(`[Finalize Controller] ❌ ERROR:`);
    console.error(`[Finalize Controller] Message:`, error.message);
    console.error(`[Finalize Controller] Status Code:`, error.statusCode);
    console.error(`[Finalize Controller] Stack:`, error.stack);
    
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'فشل اعتماد الفاتورة',
      message_en: error.message
    });
  }
}

module.exports = {
  getWonLeads,
  processWonLead,
  createSalesInvoice,
  finalizeSalesInvoice,
  getSalesInvoices,
  getSalesInvoiceById,
  getInvoicePDF
};
