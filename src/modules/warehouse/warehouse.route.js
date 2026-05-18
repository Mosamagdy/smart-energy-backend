const express = require('express');
const router = express.Router();
const controller = require('./warehouse.controller');
const { authMiddleware } = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role');

// All routes require authentication
router.use(authMiddleware);

// Write roles: super_admin, finance_manager, project_manager, dept_head (Warehouse Manager)
const writeRoles = ['super_admin', 'finance_manager', 'project_manager', 'warehouse_manager', 'inventory_manager'];
// Read roles: super_admin, finance_manager, general_manager, project_manager, dept_head, engineer, contract_dept_head
const readRoles = ['super_admin', 'finance_manager', 'general_manager', 'dep_pr_manager', 'warehouse_manager', 'inventory_manager', 'engineer', 'contract_dept_head' , 'project_manager'];

// ============================================================================
// IMPORTANT: Static routes MUST be registered BEFORE dynamic routes (/:id)
// ============================================================================

// GET /api/warehouses/summary (static route - MUST be before /:id)
router.get('/summary',
  roleMiddleware(readRoles),
  controller.getWarehousesSummary
);
// ✅ GET /api/inventory/warehouses
router.get('/warehouses', authMiddleware, async (req, res) => {
  try {
    const { item_id } = req.query;

    if (item_id) {
      // الحالة القديمة — مخازن صنف معين
      const stock = await inventoryRepo.getAvailableStock(null, item_id);
      return res.json({ data: { warehouses: stock || [] } });
    }

    // ✅ بدون item_id — كل المخازن النشطة
    const result = await query(
      `SELECT id, warehouse_code, warehouse_name, warehouse_name_ar
       FROM warehouses 
       WHERE is_active = true 
       ORDER BY warehouse_name ASC`
    );

    return res.json({ data: { warehouses: result.rows } });

  } catch (err) {
    console.error('[GET /warehouses]', err);
    res.status(500).json({ message: 'فشل تحميل المستودعات' });
  }
});

// POST /api/warehouses (create warehouse)
router.post('/',
  roleMiddleware(writeRoles),
  controller.createWarehouse
);

// GET /api/warehouses (get all warehouses with filters)
router.get('/',
  roleMiddleware(readRoles),
  controller.getAllWarehouses
);

// GET /api/warehouses/:id (dynamic route - MUST be after static routes)
router.get('/:id',
  roleMiddleware(readRoles),
  controller.getWarehouseById
);

// PUT /api/warehouses/:id (update warehouse)
router.put('/:id',
  roleMiddleware(writeRoles),
  controller.updateWarehouse
);

// DELETE /api/warehouses/:id (delete warehouse)
router.delete('/:id',
  roleMiddleware(writeRoles),
  controller.deleteWarehouse
);

// GET /api/warehouses/:id/stock (get warehouse stock)
router.get('/:id/stock',
  roleMiddleware(readRoles),
  controller.getWarehouseStock
);

module.exports = router;
