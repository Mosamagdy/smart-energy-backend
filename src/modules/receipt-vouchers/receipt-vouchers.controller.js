const service = require('./receipt-vouchers.service');

// ============================================================================
// Receipt Vouchers Controller
// ============================================================================

/**
 * POST /api/finance/receipt-vouchers
 * Create receipt voucher
 */
async function createVoucher(req, res, next) {
  try {
    console.log('[Create Voucher] === REQUEST RECEIVED ===');
    console.log('[Create Voucher] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[Create Voucher] User:', req.user);
    
    // Validate required fields
    const { client_id, receipt_date, amount, payment_method, payment_account_id, status, invoices } = req.body;
    
    if (!client_id) {
      console.error('[Create Voucher] ❌ Missing client_id');
      const err = new Error('معرف العميل مطلوب');
      err.statusCode = 400;
      throw err;
    }
    
    if (!amount || amount <= 0) {
      console.error('[Create Voucher] ❌ Invalid amount:', amount);
      const err = new Error('المبلغ يجب أن يكون أكبر من صفر');
      err.statusCode = 400;
      throw err;
    }
    
    if (!payment_method) {
      console.error('[Create Voucher] ❌ Missing payment_method');
      const err = new Error('طريقة الدفع مطلوبة');
      err.statusCode = 400;
      throw err;
    }
    
    if (!payment_account_id) {
      console.error('[Create Voucher] ❌ Missing payment_account_id');
      const err = new Error('حساب الدفع مطلوب');
      err.statusCode = 400;
      throw err;
    }
    
    if (!status || !['draft', 'posted'].includes(status)) {
      console.error('[Create Voucher] ❌ Invalid status:', status);
      const err = new Error('الحالة يجب أن تكون draft أو posted');
      err.statusCode = 400;
      throw err;
    }
    
    // Validate invoices array if provided
    if (invoices && invoices.length > 0) {
      console.log(`[Create Voucher] Validating ${invoices.length} invoices`);
      for (const inv of invoices) {
        if (!inv.sales_invoice_id || !inv.amount_applied) {
          console.error('[Create Voucher] ❌ Invalid invoice structure:', inv);
          const err = new Error('بيانات الفاتورة غير صحيحة');
          err.statusCode = 400;
          throw err;
        }
      }
    }
    
    console.log('[Create Voucher] ✅ Validation passed, creating voucher...');
    
    const voucher = await service.createReceiptVoucher(req.body, req.user);
    
    console.log('[Create Voucher] ✅ Voucher created:', voucher.voucher_no);
    
    res.status(201).json({
      status: 'success',
      message: status === 'posted' ? 'تم إنشاء وإعلان سند القبض بنجاح' : 'تم إنشاء سند القبض بنجاح',
      data: voucher
    });
  } catch (err) {
    console.error('[Create Voucher] ❌ ERROR:', err.message);
    console.error('[Create Voucher] Stack:', err.stack);
    next(err);
  }
}

/**
 * GET /api/finance/receipt-vouchers
 * Get all vouchers
 */
async function getAllVouchers(req, res, next) {
  try {
    const vouchers = await service.getAllVouchers(req.query);
    
    res.status(200).json({
      status: 'success',
      data: vouchers
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/finance/receipt-vouchers/:id
 * Get voucher by ID with linked invoices
 */
async function getVoucherById(req, res, next) {
  try {
    const voucherId = parseInt(req.params.id);
    
    if (isNaN(voucherId)) {
      const err = new Error('رقم السند غير صحيح');
      err.statusCode = 400;
      throw err;
    }
    
    console.log(`[Get Voucher] Getting voucher ID: ${voucherId}`);
    
    const voucher = await service.getVoucherById(voucherId);
    
    if (!voucher) {
      const err = new Error('سند القبض غير موجود');
      err.statusCode = 404;
      throw err;
    }
    
    // Get linked invoices
    const invoices = await service.getLinkedInvoices(voucherId);
    
    console.log(`[Get Voucher] Found ${invoices.length} linked invoices`);
    
    res.status(200).json({
      status: 'success',
      data: {
        ...voucher,
        invoices: invoices
      }
    });
  } catch (err) {
    console.error('[Get Voucher] Error:', err.message);
    next(err);
  }
}

/**
 * GET /api/finance/receipt-vouchers/clients/:clientId/outstanding-invoices
 * Get client outstanding invoices
 */
async function getClientOutstandingInvoices(req, res, next) {
  try {
    const clientId = req.params.clientId;
    console.log(`[Receipt Vouchers] Getting outstanding invoices for client ID: ${clientId}`);
    
    const invoices = await service.getClientOutstandingInvoices(clientId);
    
    console.log(`[Receipt Vouchers] Found ${invoices.length} outstanding invoices`);
    if (invoices.length > 0) {
      console.log('[Receipt Vouchers] First invoice:', invoices[0]);
    }
    
    res.status(200).json({
      status: 'success',
      data: invoices
    });
  } catch (err) {
    console.error('[Receipt Vouchers] Error getting outstanding invoices:', err.message);
    next(err);
  }
}

/**
 * POST /api/finance/receipt-vouchers/:id/post
 * Post voucher
 */
async function postVoucher(req, res, next) {
  try {
    const voucher = await service.postVoucherWithJournal(req.params.id, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تم إعلان سند القبض بنجاح',
      data: voucher
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/finance/receipt-vouchers/:id/cancel
 * Cancel voucher
 */
async function cancelVoucher(req, res, next) {
  try {
    const voucherId = parseInt(req.params.id);
    
    if (isNaN(voucherId)) {
      const err = new Error('رقم السند غير صحيح');
      err.statusCode = 400;
      throw err;
    }
    
    console.log(`[Cancel Voucher] Cancelling voucher ID: ${voucherId}`);
    
    const voucher = await service.cancelVoucher(voucherId, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تم إلغاء سند القبض بنجاح',
      data: voucher
    });
  } catch (err) {
    console.error('[Cancel Voucher] Error:', err.message);
    next(err);
  }
}

module.exports = {
  createVoucher,
  getAllVouchers,
  getVoucherById,
  getClientOutstandingInvoices,
  postVoucher,
  cancelVoucher,
};
