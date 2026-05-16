const express        = require('express');
const router         = express.Router();
const controller     = require('../modules/leads/leads.controller');
const interactionsController = require('../modules/leads/lead-interactions.controller');
const reportsController = require('../modules/leads/inspection-reports.controller');
const { authMiddleware } = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');
const upload = require('../config/multer'); // ✅ أضف الـ import ده

router.use(authMiddleware);

const SALES_ROLES  = ['super_admin', 'general_manager', 'sales_manager'];
const MANAGE_ROLES = ['super_admin', 'general_manager', 'sales_manager'];
const TECH_ROLES   = ['super_admin', 'general_manager', 'tech_head', 'mc_manager', 'qs_manager'];

router.post('/', roleMiddleware(SALES_ROLES), controller.createLead);
// dep_pr_manager: read-only visibility in CRM
router.get('/', roleMiddleware([...SALES_ROLES, 'sales_rep', 'quotation_specialist', 'dep_pr_manager' , 'tech_head']), controller.getAllLeads);
router.get('/my-tasks', roleMiddleware(['engineer', 'sales_rep', 'quotation_specialist']), controller.getMyTasks);
router.get('/follow-ups/upcoming', interactionsController.getUpcomingFollowUps);

// Reports static routes — MUST be before /:id
router.get('/reports/:reportId', reportsController.getInspectionReportById);
router.patch('/reports/:reportId', reportsController.updateInspectionReport);
router.delete('/reports/:reportId', reportsController.deleteInspectionReport);

router.get('/:id', roleMiddleware([...SALES_ROLES, 'sales_rep', 'engineer', 'quotation_specialist', 'finance_manager', 'dep_pr_manager' , 'tech_head']), controller.getLeadById);
router.get('/:id/customer-statement', roleMiddleware(['super_admin', 'general_manager', 'finance_manager', 'sales_manager', 'sales_rep']), controller.getCustomerStatement);
router.patch('/:id', roleMiddleware(SALES_ROLES), controller.updateLead);
router.patch('/:id/assign', roleMiddleware(SALES_ROLES), controller.assignSalesRep);
router.patch('/:id/remove-sales-rep', roleMiddleware(MANAGE_ROLES), controller.removeSalesRep);
router.patch('/:id/assign-engineer', roleMiddleware([...TECH_ROLES]), controller.assignEngineer);
router.patch('/:id/remove-engineer', roleMiddleware(['super_admin', 'general_manager', ...TECH_ROLES]), controller.removeEngineer);
router.patch('/:id/status', roleMiddleware(['super_admin', 'general_manager', 'sales_manager', 'sales_rep', 'engineer', ...TECH_ROLES]), controller.updateLeadStatus);
router.delete('/:id', roleMiddleware(MANAGE_ROLES), controller.deleteLead);

router.patch('/:id/approve-by-finance', authMiddleware, roleMiddleware(['finance_manager', 'general_manager', 'super_admin']), controller.approveByFinance);
router.patch('/:id/approve-by-gm', authMiddleware, roleMiddleware(['general_manager', 'super_admin']), controller.approveByGm);
router.patch('/:id/approve-for-client', authMiddleware, roleMiddleware(['sales_manager', 'general_manager', 'super_admin']), controller.approveForClient);

router.post('/:id/interactions', roleMiddleware(['super_admin', 'general_manager', 'sales_manager', 'sales_rep']), interactionsController.createInteraction);
router.get('/:id/interactions', interactionsController.getInteractions);
router.patch('/:id/request-survey', roleMiddleware(['super_admin', 'general_manager', 'sales_manager', 'sales_rep']), interactionsController.requestSurvey);

// ✅ أضف upload.single('file') هنا
router.post('/:id/reports',
  roleMiddleware(['super_admin', 'general_manager', 'sales_manager', 'engineer', 'sales_rep', ...TECH_ROLES]),
  upload.single('file'),
  reportsController.createInspectionReport
);

router.get('/:id/reports', reportsController.getReportsByLeadId);

module.exports = router;