/**
 * Payment Voucher Controller
 * Phase 3: سند الصرف (Payment Vouchers)
 * HTTP request handlers
 */

const service = require('./payment-voucher.service');

/**
 * POST /api/finance/payment-vouchers
 * Create payment voucher
 */
async function createVoucher(req, res, next) {
  try {
    const result = await service.createPaymentVoucher(req.body, req.user);
    
    res.status(201).json({
      status: 'success',
      message: 'سند صرف تم إنشاؤه بنجاح - Payment voucher created successfully',
      data: result
    });
  } catch (error) {
    console.error('[Payment Voucher Controller] Error:', error.message);
    
    if (error.message.includes('Invoice not found') || 
        error.message.includes('الفاتورة غير موجودة')) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error.message.includes('Payment amount') || 
        error.message.includes('مبلغ الدفع')) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error.message.includes('account not found') || 
        error.message.includes('غير موجود')) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
    
    next(error);
  }
}

/**
 * GET /api/finance/payment-vouchers
 * Get all vouchers with filters
 */
async function getVouchers(req, res, next) {
  try {
    const filters = {
      status: req.query.status,
      supplier_id: req.query.supplier_id,
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };
    
    const vouchers = await service.getVouchers(filters);
    
    res.status(200).json({
      status: 'success',
      data: {
        vouchers,
        count: vouchers.length
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/finance/payment-vouchers/:id
 * Get voucher by ID
 */
async function getVoucherById(req, res, next) {
  try {
    const { id } = req.params;
    const voucher = await service.getVoucherById(id);
    
    res.status(200).json({
      status: 'success',
      data: voucher
    });
  } catch (error) {
    if (error.message.includes('not found') || 
        error.message.includes('غير موجود')) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    next(error);
  }
}

/**
 * GET /api/finance/payment-vouchers/invoice/:invoice_id
 * Get payment history for an invoice
 */
async function getInvoicePaymentHistory(req, res, next) {
  try {
    const { invoice_id } = req.params;
    const history = await service.getInvoicePaymentHistory(invoice_id);
    
    res.status(200).json({
      status: 'success',
      data: history
    });
  } catch (error) {
    if (error.message.includes('Invoice not found') || 
        error.message.includes('الفاتورة غير موجودة')) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    next(error);
  }
}

/**
 * POST /api/finance/payment-vouchers/:id/cancel
 * Cancel a payment voucher
 */
async function cancelVoucher(req, res, next) {
  try {
    const { id } = req.params;
    const result = await service.cancelVoucher(id, req.user);
    
    res.status(200).json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    if (error.message.includes('not found') || 
        error.message.includes('غير موجود')) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    next(error);
  }
}

module.exports = {
  createVoucher,
  getVouchers,
  getVoucherById,
  getInvoicePaymentHistory,
  cancelVoucher
};
