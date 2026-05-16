const service = require('./purchasing.service');

// ============================================================================
// Purchasing Controller - Request Handler Layer
// ============================================================================

/**
 * POST /api/purchasing/orders
 * Create purchase order
 */
async function createPO(req, res, next) {
  try {
    const po = await service.createPO(req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء أمر الشراء بنجاح',
      data: po
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/purchasing/orders
 * Get all purchase orders
 */
async function getAllPOs(req, res, next) {
  try {
    const { status, supplier_id, project_id } = req.query;
    const filters = {};
    
    if (status) filters.status = status;
    if (supplier_id) filters.supplier_id = supplier_id;
    if (project_id) filters.project_id = project_id;

    const orders = await service.getAllPOs(filters);
    res.status(200).json({
      status: 'success',
      data: orders
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/purchasing/orders/:id
 * Get PO by ID
 */
async function getPOById(req, res, next) {
  try {
    const po = await service.getPOById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: po
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/purchasing/orders/:id
 * Update PO with supplier and prices (Procurement Manager)
 */
async function updatePO(req, res, next) {
  try {
    const po = await service.updatePO(req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'تم تحديث أمر الشراء بنجاح',
      data: po
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/purchasing/orders/:id/receive
 * Receive goods (create GRN)
 */
async function receiveGoods(req, res, next) {
  try {
    const grn = await service.receiveGoods(req.params.id, req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'تم استلام البضاعة بنجاح',
      data: grn
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/purchasing/invoices
 * Create purchase invoice
 */
async function createPurchaseInvoice(req, res, next) {
  try {
    const invoice = await service.createPurchaseInvoice(req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء فاتورة الشراء بنجاح',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/purchasing/invoices
 * Get all purchase invoices
 */
async function getAllPurchaseInvoices(req, res, next) {
  try {
    console.log('[PurchaseInvoice Controller] Query params:', req.query);
    console.log('[PurchaseInvoice Controller] User role:', req.user?.role);
    
    const { status, supplier_id } = req.query;
    const filters = {};
    
    if (status) filters.status = status;
    if (supplier_id) filters.supplier_id = supplier_id;

    console.log('[PurchaseInvoice Controller] Filters:', filters);

    const invoices = await service.getAllPurchaseInvoices(filters);
    
    console.log('[PurchaseInvoice Controller] Returning', invoices.length, 'invoices');
    
    res.status(200).json({
      status: 'success',
      data: invoices
    });
  } catch (error) {
    console.error('[PurchaseInvoice Controller] Error:', error.message);
    next(error);
  }
}

/**
 * GET /api/purchasing/invoices/:id
 * Get purchase invoice by ID
 */
async function getPurchaseInvoiceById(req, res, next) {
  try {
    const invoice = await service.getPurchaseInvoiceById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/purchasing/invoices/:id/finalize
 * Finalize purchase invoice - increase stock and create journal entry
 */
async function finalizePurchaseInvoice(req, res, next) {
  try {
    const invoiceId = parseInt(req.params.id);
    if (isNaN(invoiceId)) {
      return res.status(400).json({
        status: 'error',
        message: 'رقم الفاتورة غير صحيح',
        message_en: 'Invalid invoice ID'
      });
    }
    
    const invoice = await service.finalizePurchaseInvoice(invoiceId, req.user);
    res.status(200).json({
      status: 'success',
      message: 'تم اعتماد فاتورة الشراء بنجاح',
      message_en: 'Purchase invoice finalized successfully',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/purchasing/invoices/:id/payments
 * Record supplier payment
 */
async function recordSupplierPayment(req, res, next) {
  try {
    const invoice = await service.recordSupplierPayment(req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'تم تسجيل الدفعة بنجاح',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/purchasing/dashboard
 * Get purchasing dashboard
 */
async function getPurchasingDashboard(req, res, next) {
  try {
    const dashboard = await service.getPurchasingDashboard();
    res.status(200).json({
      status: 'success',
      data: dashboard
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPO,
  getAllPOs,
  getPOById,
  updatePO,
  receiveGoods,
  createPurchaseInvoice,
  finalizePurchaseInvoice,
  getAllPurchaseInvoices,
  getPurchaseInvoiceById,
  recordSupplierPayment,
  getPurchasingDashboard
};
