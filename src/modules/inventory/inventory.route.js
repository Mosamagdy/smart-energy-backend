const express = require('express');
const router = express.Router();
const controller = require('./inventory.controller');
const { authMiddleware } = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role');

// All routes require authentication
router.use(authMiddleware);

// Inventory permissions with explicit manager roles
const writeRoles = ['super_admin', 'general_manager', 'finance_manager', 'inventory_manager', 'warehouse_manager'];
const readRoles = ['super_admin', 'general_manager', 'finance_manager', 'project_manager', 'dep_pr_manager', 'inventory_manager', 'warehouse_manager'];

// ============================================================================
// IMPORTANT: Static routes MUST be registered BEFORE dynamic routes (/:id)
// Express reads routes top-to-bottom. If /:id is first, it captures everything!
// This prevents Error 22P02: invalid input syntax for type integer
// ============================================================================

// GET /api/inventory/low-stock (static route - MUST be before /:id)
router.get('/low-stock',
  roleMiddleware(readRoles),
  controller.getLowStockReport
);

// ✅ GET /api/inventory/categories (static route - MUST be before /:id)
router.get('/categories',
  roleMiddleware(readRoles),
  controller.getCategories
);

// ✅ GET /api/inventory/dashboard (static route - MUST be before /:id)
router.get('/dashboard',
  roleMiddleware(readRoles),
  controller.getInventoryDashboard
);

// ✅ GET /api/inventory/summary (static route - MUST be before /:id)
router.get('/summary',
  roleMiddleware(readRoles),
  controller.getInventorySummary
);

// ✅ GET /api/inventory/by-warehouse/:warehouseId (get items for specific warehouse)
router.get('/by-warehouse/:warehouseId',
  roleMiddleware(readRoles),
  controller.getItemsByWarehouse
);

// ✅ POST /api/inventory/stock-in (add stock to warehouse)
router.post('/stock-in',
  roleMiddleware(writeRoles),
  controller.stockIn
);

// POST /api/inventory (create item)
router.post('/',
  roleMiddleware(writeRoles),
  controller.createItem
);

// GET /api/inventory (get all items with filters)
router.get('/',
  roleMiddleware(readRoles),
  controller.getAllItems
);

// GET /api/inventory/:id (dynamic route - MUST be after static routes)
router.get('/:id',
  roleMiddleware(readRoles),
  controller.getItemById
);

// PUT /api/inventory/:id (dynamic route)
router.put('/:id',
  roleMiddleware(writeRoles),
  controller.updateItem
);

module.exports = router;
