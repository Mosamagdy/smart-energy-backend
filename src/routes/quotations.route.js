const express = require('express');
const router = express.Router();
const controller = require('../modules/quotations/quotations.controller');
const { authMiddleware, checkFirstLogin } = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');
const upload = require('../config/multer');

// Apply authentication to all routes
router.use(authMiddleware);

// Apply first login check for client routes
router.use('/client', checkFirstLogin);

// POST   /api/quotations                    — إنشاء عرض سعر مع BOQ وملف (quotation_specialist)
router.post('/',
  roleMiddleware(['quotation_specialist', 'super_admin', 'general_manager']),
  upload.single('file'),
  controller.createQuotation
);

// GET    /api/quotations                    — عرض جميع العروض
router.get('/',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager', 'quotation_specialist', 'project_manager', 'engineer', 'dept_head','dep_pr_manager']),
  controller.getAllQuotations
);

// GET    /api/quotations/:id                — عرض سعر محدد
router.get('/:id',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager', 'quotation_specialist', 'project_manager', 'engineer', 'dept_head', 'contract_dept_head','dep_pr_manager', 'sales_manager', 'tech_head']),
  controller.getQuotationById
);

// GET    /api/leads/:leadId/quotations      — عروض سعر لعميل معين
router.get('/leads/:leadId/quotations',
  roleMiddleware(['super_admin', 'general_manager', 'finance_manager', 'quotation_specialist', 'sales_rep' ]),
  controller.getQuotationsByLeadId
);

// PATCH  /api/quotations/:id                — تحديث عرض السعر (قبل الموافقة النهائية)
router.patch('/:id',
  roleMiddleware(['quotation_specialist']),
  controller.updateQuotation
);

// PATCH  /api/quotations/:id/finance-review — المراجعة المالية (finance_manager)
router.patch('/:id/finance-review',
  roleMiddleware(['finance_manager']),
  controller.financeReview
);

// PATCH  /api/quotations/:id/gm-review      — اعتماد المدير العام (general_manager)
router.patch('/:id/gm-review',
  roleMiddleware(['general_manager']),
  controller.gmReview
);

// NOTE: Final client delivery (user creation + email) is handled via LEADS module
// Use: PATCH /api/leads/:id/approve-for-client instead

// PATCH  /api/quotations/:id/send-to-client  — إرسال العرض للعميل وإنشاء حسابه
router.patch('/:id/send-to-client',
  roleMiddleware(['general_manager', 'super_admin']),
  controller.sendToClient
);

// POST   /api/quotations/:id/convert-to-project — تحويل العرض لمشروع
router.post('/:id/convert-to-project',
  roleMiddleware(['general_manager', 'super_admin']),
  controller.convertToProject
);

// PATCH  /api/quotations/:id/confirm-downpayment — تأكيد استلام الدفعة الأولى
router.patch('/:id/confirm-downpayment',
  roleMiddleware(['finance_manager', 'general_manager', 'super_admin']),
  controller.confirmDownpayment
);

// DELETE /api/quotations/:id                — حذف عرض السعر (admin only)
router.delete('/:id',
  roleMiddleware(['super_admin', 'general_manager']),
  controller.deleteQuotation
);

// ============================================
// CLIENT PORTAL ENDPOINTS
// ============================================

/**
 * @route   GET /api/client/my-quotations
 * @desc    Get all quotations for logged-in client
 * @access  Private (client role only)
 */
router.get('/client/my-quotations',
  authMiddleware,
  roleMiddleware(['client']),
  controller.getClientQuotations
);

/**
 * @route   PATCH /api/client/quotations/:id/respond
 * @desc    Client responds to quotation (approve/reject)
 * @access  Private (client role only)
 */
router.patch('/client/quotations/:id/respond',
  authMiddleware,
  roleMiddleware(['client']),
  controller.respondToQuotation
);

module.exports = router;
