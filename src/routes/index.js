const express = require('express');
const router  = express.Router();

const healthRoutes        = require('./health.routes');
const authRoutes          = require('./auth.route');
const departmentRoutes    = require('./departments.route');
const leadsRoutes         = require('./leads.route');
const notificationsRoutes = require('./notifications.route');
const hrRoutes            = require('./hr.route');
const inspectionReportsRoutes = require('./inspection-reports.route');
const quotationsRoutes    = require('./quotations.route');
const projectsRoutes      = require('./projects.route');
const projectDocumentsRoutes = require('../modules/projects/project-documents.route');
const contractsRoutes     = require('./contracts.route');
const rolesRoutes         = require('./roles.route');
const usersRoutes         = require('./users.route');
const tasksRoutes         = require('./tasks.route');  // ✅ TASK 2: My Tasks route
const leavesRoutes        = require('../modules/leaves/leave.route');  // ✅ TASK 2: My Leaves route

// PHASE 2 Financial Modules
const coaRoutes           = require('./coa.route');
const journalEntriesRoutes = require('./journal-entries.route');
const pettyCashRoutes     = require('./petty-cash.route');
const invoicesRoutes      = require('./invoices.route');
const expensesRoutes      = require('./expenses.route');
const fixedAssetsRoutes   = require('../modules/fixed-assets/fixed-assets.route');
const paymentVoucherRoutes = require('../modules/finance/payment-voucher.route'); // PHASE 3
const supplierStatementRoutes = require('../modules/finance/supplier-statement.route'); // Supplier Statement
const expenseVoucherRoutes = require('../modules/finance/expense-voucher.route'); // Expense Vouchers

// PHASE 9 Sales Module
const salesRoutes = require('../modules/sales/sales.route');

// Credit Notes Module (ZATCA Compliant Sales Returns)
const creditNotesRoutes = require('../modules/credit-notes/credit-notes.routes');



// Leads
router.use('/leads', leadsRoutes);

router.use('/leads/:leadId/reports', inspectionReportsRoutes);

// Standalone inspection-reports (for GET/PATCH/DELETE by ID)
router.use('/inspection-reports', inspectionReportsRoutes);
// Leaves
router.use('/leaves', leavesRoutes);



router.use('/health',              healthRoutes);
router.use('/auth',                authRoutes);
router.use('/departments',         departmentRoutes);
router.use('/leads',               leadsRoutes);
router.use('/users',               usersRoutes);
router.use('/tasks',               tasksRoutes);  // ✅ TASK 2: My Tasks
router.use('/notifications',       notificationsRoutes);
router.use('/hr',                  hrRoutes);
router.use('/inspection-reports',  inspectionReportsRoutes);
router.use('/quotations',          quotationsRoutes);
router.use('/roles',               rolesRoutes);
router.use('/projects/:id/documents', projectDocumentsRoutes);
router.use('/projects',            projectsRoutes);
router.use('/contracts',           contractsRoutes);

// PHASE 2 Financial Routes
router.use('/coa',                 coaRoutes);
router.use('/journal-entries',     journalEntriesRoutes);
router.use('/finance/petty-cash',  pettyCashRoutes);
router.use('/finance',             invoicesRoutes);
// DISABLED: Old expenses module - replaced by expense-voucher.route.js (line 64)
// router.use('/finance',             expensesRoutes);
router.use('/finance/payment-vouchers', paymentVoucherRoutes); // PHASE 3: Payment Vouchers
router.use('/finance/suppliers', supplierStatementRoutes); // Supplier Statement
router.use('/finance', expenseVoucherRoutes); // Expense Vouchers (NEW - with automatic journal entries)

// Treasury Module (Cash & Bank Management)
const treasuryRoutes = require('./treasury.route');
router.use('/finance/treasury', treasuryRoutes);

// Receipt Vouchers Module
const receiptVouchersRoutes = require('./receipt-vouchers.route');
router.use('/finance/receipt-vouchers', receiptVouchersRoutes);

// PHASE 9 Sales Module
router.use('/sales', salesRoutes);

// Credit Notes Module
router.use('/credit-notes', creditNotesRoutes);

// PHASE 7 Financial Reports Module
const financialReportsRoutes   = require('../modules/reports/reports.route');
router.use('/reports',             financialReportsRoutes);

// PHASE 3 Maintenance Routes
const maintenanceRoutes   = require('./maintenance.route');
router.use('/maintenance',         maintenanceRoutes);

// PHASE 5 Inventory & Purchasing Module
const suppliersRoute      = require('../modules/suppliers/suppliers.route');
const inventoryRoute      = require('../modules/inventory/inventory.route');
const warehouseRoute      = require('../modules/warehouse/warehouse.route');
const purchasingRoute     = require('../modules/purchasing/purchasing.route');
const procurementRoute    = require('./procurement.route');

router.use('/suppliers',           suppliersRoute);
router.use('/inventory',           inventoryRoute);
router.use('/warehouses',          warehouseRoute);
router.use('/purchasing',          purchasingRoute);
router.use('/procurement',         procurementRoute);

// PHASE 6 Payroll & HR Module
const employeesRoute      = require('../modules/employees/employees.route');
const payrollRoute        = require('../modules/payroll/payroll.route');

router.use('/employees',           employeesRoute);
router.use('/payroll',             payrollRoute);

// PHASE 8 Budgeting Module
const budgetingRoute      = require('../modules/budgeting/budgeting.route');
router.use('/budgeting',           budgetingRoute);

// PHASE 4 Analytics Module
const analyticsRoutes     = require('./analytics.route');
router.use('/analytics',           analyticsRoutes);

// PHASE 5 Client Portal
const clientRoutes        = require('./client.route');
router.use('/client',              clientRoutes);

// PMO Dashboard Routes
const pmoRoutes           = require('./pmo.route');
router.use('/pmo',                 pmoRoutes);

// PHASE 4 Fixed Assets Module

router.use('/fixed-assets',        fixedAssetsRoutes);

module.exports = router;