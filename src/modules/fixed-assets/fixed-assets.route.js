const express    = require('express');
const router     = express.Router();
const controller = require('./fixed-assets.controller');
const { authMiddleware } = require('../../middlewares/auth');
const roleMiddleware     = require('../../middlewares/role');

router.use(authMiddleware);

// ✅ FIX: /depreciation/run لازم يكون قبل /:id
// لو جاء بعده Express هيفسر 'depreciation' كـ :id ويروح للـ getAssetById

// POST /api/fixed-assets/depreciation/run
router.post('/depreciation/run',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.runMonthlyDepreciation
);

// POST /api/fixed-assets
router.post('/',
  roleMiddleware(['super_admin', 'finance_manager', 'general_manager']),
  controller.createAsset
);

// GET /api/fixed-assets
router.get('/',
  roleMiddleware(['super_admin', 'finance_manager', 'general_manager', 'project_manager']),
  controller.getAllAssets
);

// GET /api/fixed-assets/:id
router.get('/:id',
  roleMiddleware(['super_admin', 'finance_manager', 'general_manager', 'project_manager']),
  controller.getAssetById
);

// PUT /api/fixed-assets/:id
router.put('/:id',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.updateAsset
);

// DELETE /api/fixed-assets/:id
router.delete('/:id',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.deleteAsset
);

// GET /api/fixed-assets/:id/depreciation
router.get('/:id/depreciation',
  roleMiddleware(['super_admin', 'finance_manager', 'general_manager']),
  controller.calculateDepreciation
);

// POST /api/fixed-assets/:id/dispose
router.post('/:id/dispose',
  roleMiddleware(['super_admin', 'finance_manager']),
  controller.disposeAsset
);

// GET /api/fixed-assets/:id/schedule
router.get('/:id/schedule',
  roleMiddleware(['super_admin', 'finance_manager', 'general_manager']),
  controller.getDepreciationSchedule
);

module.exports = router;