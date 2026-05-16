const service = require('./fixed-assets.service');

// ============================================================================
// Fixed Assets Controller - Request Handler Layer
// ============================================================================

/**
 * POST /api/fixed-assets
 * Create new fixed asset
 */
async function createAsset(req, res, next) {
  try {
    const asset = await service.createAsset(req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء الأصل الثابت بنجاح',
      data: asset
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/fixed-assets
 * Get all assets with optional filters
 */
async function getAllAssets(req, res, next) {
  try {
    const { status, category } = req.query;
    const filters = {};
    
    if (status) filters.status = status;
    if (category) filters.category = category;

    const assets = await service.getAllAssets(filters);
    res.status(200).json({
      status: 'success',
      data: assets
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/fixed-assets/:id
 * Get asset by ID
 */
async function getAssetById(req, res, next) {
  try {
    const asset = await service.getAssetById(req.params.id);
    
    if (!asset) {
      const err = new Error('الأصل الثابت غير موجود');
      err.statusCode = 404;
      throw err;
    }

    res.status(200).json({
      status: 'success',
      data: asset
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/fixed-assets/:id
 * Update asset
 */
async function updateAsset(req, res, next) {
  try {
    const asset = await service.updateAsset(req.params.id, req.body);
    
    if (!asset) {
      const err = new Error('الأصل الثابت غير موجود');
      err.statusCode = 404;
      throw err;
    }

    res.status(200).json({
      status: 'success',
      message: 'تم تحديث الأصل الثابت بنجاح',
      data: asset
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/fixed-assets/:id
 * Delete asset (only if active)
 */
async function deleteAsset(req, res, next) {
  try {
    const asset = await service.deleteAsset(req.params.id);
    
    if (!asset) {
      const err = new Error('لا يمكن حذف الأصل الثابت. يجب أن يكون في حالة "نشط"');
      err.statusCode = 400;
      throw err;
    }

    res.status(200).json({
      status: 'success',
      message: 'تم حذف الأصل الثابت بنجاح'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/fixed-assets/:id/depreciation
 * Calculate monthly depreciation for asset
 */
async function calculateDepreciation(req, res, next) {
  try {
    const depreciation = await service.calculateMonthlyDepreciation(req.params.id);
    res.status(200).json({
      status: 'success',
      data: depreciation
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/fixed-assets/depreciation/run
 * Run monthly depreciation for all active assets
 */
async function runMonthlyDepreciation(req, res, next) {
  try {
    const result = await service.runMonthlyDepreciation(req.user);
    res.status(200).json({
      status: 'success',
      message: `تم تشغيل الإهلاك الشهري لـ ${result.processed} أصل`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/fixed-assets/:id/dispose
 * Dispose asset
 */
async function disposeAsset(req, res, next) {
  try {
    const asset = await service.disposeAsset(req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'تم التخلص من الأصل الثابت بنجاح',
      data: asset
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/fixed-assets/:id/schedule
 * Get depreciation schedule
 */
async function getDepreciationSchedule(req, res, next) {
  try {
    const schedule = await service.getDepreciationSchedule(req.params.id);
    res.status(200).json({
      status: 'success',
      data: schedule
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createAsset,
  getAllAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
  calculateDepreciation,
  runMonthlyDepreciation,
  disposeAsset,
  getDepreciationSchedule
};
