/**
 * Installed Assets Controller
 * HTTP request handlers for asset management
 */

const service = require('./maintenance.service');

/**
 * POST /api/maintenance/assets
 * Create new installed asset
 */
async function createAsset(req, res, next) {
  try {
    const asset = await service.createInstalledAsset(req.body, req.user);
    
    res.status(201).json({
      status: 'success',
      message: 'تم تسجيل الأصل بنجاح',
      data: asset
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/maintenance/assets
 * List all assets with optional filters
 */
async function listAssets(req, res, next) {
  try {
    const filters = {
      project_id: req.query.project_id ? parseInt(req.query.project_id) : null,
      client_id: req.query.client_id ? parseInt(req.query.client_id) : null,
      category: req.query.category || null,
      status: req.query.status || null,
      search: req.query.search || null,
    };

    // Clean up null values
    Object.keys(filters).forEach(key => {
      if (filters[key] === null || filters[key] === undefined || filters[key] === '') {
        delete filters[key];
      }
    });

    const assets = await service.listAssets(filters);
    
    res.json({
      status: 'success',
      count: assets.length,
      data: assets
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/maintenance/assets/project/:projectId
 * Get assets by project ID
 */
async function getAssetsByProject(req, res, next) {
  try {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      const err = new Error('رقم المشروع غير صحيح');
      err.statusCode = 400;
      throw err;
    }

    const assets = await service.getAssetsByProjectId(projectId);
    
    res.json({
      status: 'success',
      count: assets.length,
      data: assets
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/maintenance/assets/warranty-alerts
 * Get warranty expiry alerts
 */
async function getWarrantyAlerts(req, res, next) {
  try {
    const alerts = await service.getWarrantyAlerts();
    
    res.json({
      status: 'success',
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/maintenance/assets/dashboard
 * Get dashboard statistics
 */
async function getDashboard(req, res, next) {
  try {
    const stats = await service.getDashboardStats();
    
    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/maintenance/assets/:id
 * Get asset by ID with maintenance history
 */
async function getAsset(req, res, next) {
  try {
    const assetId = parseInt(req.params.id);
    
    if (isNaN(assetId)) {
      const err = new Error('رقم الأصل غير صحيح');
      err.statusCode = 400;
      throw err;
    }

    const asset = await service.getAssetById(assetId);
    
    res.json({
      status: 'success',
      data: asset
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/maintenance/assets/:id
 * Update asset
 */
async function updateAsset(req, res, next) {
  try {
    const assetId = parseInt(req.params.id);
    
    if (isNaN(assetId)) {
      const err = new Error('رقم الأصل غير صحيح');
      err.statusCode = 400;
      throw err;
    }

    const updated = await service.updateAsset(assetId, req.body, req.user);
    
    res.json({
      status: 'success',
      message: 'تم تحديث الأصل بنجاح',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/maintenance/assets/:id
 * Delete asset
 */
async function deleteAsset(req, res, next) {
  try {
    const assetId = parseInt(req.params.id);
    
    if (isNaN(assetId)) {
      const err = new Error('رقم الأصل غير صحيح');
      err.statusCode = 400;
      throw err;
    }

    const result = await service.deleteAsset(assetId, req.user);
    
    res.json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createAsset,
  listAssets,
  getAssetsByProject,
  getWarrantyAlerts,
  getDashboard,
  getAsset,
  updateAsset,
  deleteAsset,
};
