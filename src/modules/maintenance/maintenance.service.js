const repo = require('./maintenance.repository');
const { notifyRole, notify } = require('../../utils/notify');

/**
 * Installed Assets Service
 * Business logic for asset management
 */

/**
 * Create new installed asset
 */
async function createInstalledAsset(data, currentUser) {
  // Validate required fields
  if (!data.asset_name || !data.client_id || !data.project_id || !data.category || !data.serial_number) {
    const err = new Error('جميع الحقول المطلوبة يجب تعبئتها');
    err.statusCode = 400;
    throw err;
  }

  // Check if serial number already exists
  const existing = await repo.findAssetBySerialNumber(data.serial_number);
  if (existing) {
    const err = new Error('الرقم التسلسلي مسجل مسبقاً - يرجى التحقق من البيانات');
    err.statusCode = 409;
    throw err;
  }

  // Validate project exists
  const { query } = require('../../db');
  const projectCheck = await query('SELECT id FROM projects WHERE id = $1', [data.project_id]);
  if (projectCheck.rows.length === 0) {
    const err = new Error('المشروع غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Create the asset
  const asset = await repo.createAsset({
    ...data,
    created_by: currentUser.id
  });

  // Notify relevant parties
  try {
    // Notify general manager
    await notifyRole('general_manager', {
      title: 'تم تركيب أصل جديد',
      message: `تم تركيب ${data.asset_name} (${data.serial_number}) في مشروع ${projectCheck.rows[0].project_name}`,
      type: 'info',
      entity_type: 'installed_asset',
      entity_id: asset.id,
    });

    // Notify maintenance department head
    await notifyRole('dept_head', {
      title: 'أصل جديد للمتابعة',
      message: `يجب متابعة الأصل الجديد: ${data.asset_name}`,
      type: 'warning',
      entity_type: 'installed_asset',
      entity_id: asset.id,
    });

    // If assigned engineer specified, notify them
    if (data.assigned_engineer_id) {
      await notify(data.assigned_engineer_id, {
        title: 'تم تعيينك على أصل',
        message: `تم تعيينك للمتابعة على الأصل: ${data.asset_name}`,
        type: 'assignment',
        entity_type: 'installed_asset',
        entity_id: asset.id,
      });
    }
  } catch (notifError) {
    console.error('Failed to send notifications:', notifError.message);
  }

  return asset;
}

/**
 * Get asset by ID with full details
 */
async function getAssetById(id) {
  const asset = await repo.findAssetById(id);
  
  if (!asset) {
    const err = new Error('الأصل غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Get maintenance history
  const { getMaintenanceVisitsByAssetId } = require('./maintenance-visits.service');
  const maintenanceHistory = await getMaintenanceVisitsByAssetId(id);

  return {
    ...asset,
    maintenance_history: maintenanceHistory
  };
}

/**
 * List all assets with filters
 */
async function listAssets(filters) {
  return await repo.findAllAssets(filters);
}

/**
 * Get assets by project ID
 */
async function getAssetsByProjectId(project_id) {
  // Validate project exists
  const { query } = require('../../db');
  const projectCheck = await query('SELECT id FROM projects WHERE id = $1', [project_id]);
  if (projectCheck.rows.length === 0) {
    const err = new Error('المشروع غير موجود');
    err.statusCode = 404;
    throw err;
  }

  return await repo.findAssetsByProjectId(project_id);
}

/**
 * Update asset
 */
async function updateAsset(id, data, currentUser) {
  const asset = await repo.findAssetById(id);
  
  if (!asset) {
    const err = new Error('الأصل غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Prevent updating serial_number (should be immutable)
  if (data.serial_number && data.serial_number !== asset.serial_number) {
    const err = new Error('لا يمكن تغيير الرقم التسلسلي بعد التسجيل');
    err.statusCode = 400;
    throw err;
  }

  const updated = await repo.updateAsset(id, data);

  // Send notification if status changed to needs_maintenance
  if (data.status === 'needs_maintenance' && asset.status !== 'needs_maintenance') {
    try {
      await notifyRole('dept_head', {
        title: 'أصل يحتاج صيانة',
        message: `الأصل ${updated.asset_name} (${updated.serial_number}) يحتاج إلى صيانة`,
        type: 'alert',
        entity_type: 'installed_asset',
        entity_id: updated.id,
      });
    } catch (err) {
      console.error('Notification error:', err.message);
    }
  }

  return updated;
}

/**
 * Delete asset
 */
async function deleteAsset(id, currentUser) {
  const asset = await repo.findAssetById(id);
  
  if (!asset) {
    const err = new Error('الأصل غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Check if asset has maintenance visits
  const { query } = require('../../db');
  const visitCount = await query('SELECT COUNT(*) FROM maintenance_visits WHERE asset_id = $1', [id]);
  
  if (parseInt(visitCount.rows[0].count) > 0) {
    const err = new Error('لا يمكن حذف الأصل لوجود زيارات صيانة مرتبطة به');
    err.statusCode = 400;
    throw err;
  }

  await repo.deleteAsset(id);

  // Notify GM about deletion
  try {
    await notifyRole('general_manager', {
      title: 'تم حذف أصل',
      message: `تم حذف الأصل: ${asset.asset_name} (${asset.serial_number})`,
      type: 'info',
      entity_type: 'installed_asset',
      entity_id: id,
    });
  } catch (err) {
    console.error('Notification error:', err.message);
  }

  return { success: true, message: 'تم حذف الأصل بنجاح' };
}

/**
 * Get warranty expiry alerts
 */
async function getWarrantyAlerts() {
  const expiringAssets = await repo.getWarrantyExpiringSoon(30);
  
  // Send notifications for newly expiring assets
  if (expiringAssets.length > 0) {
    try {
      await notifyRole('general_manager', {
        title: 'تنبيه: ضمان أصول منتهي قريباً',
        message: `يوجد ${expiringAssets.length} أصول ستنتهي ضمانتها خلال 30 يوماً`,
        type: 'alert',
        entity_type: 'warranty_alert',
      });

      await notifyRole('dept_head', {
        title: 'أصول تحتاج متابعة ضمان',
        message: 'يرجى مراجعة الأصول التي ستنتهي ضمانتها قريباً',
        type: 'warning',
        entity_type: 'warranty_alert',
      });
    } catch (error) {
      console.error('Failed to send warranty notifications:', error.message);
    }
  }

  return expiringAssets;
}

/**
 * Get dashboard statistics
 */
async function getDashboardStats() {
  const stats = await repo.getDashboardStats();
  
  // Get additional stats
  const { query } = require('../../db');
  
  const upcomingMaintenance = await query(`
    SELECT COUNT(*) as count 
    FROM maintenance_visits 
    WHERE visit_date >= CURRENT_DATE 
    AND visit_date <= CURRENT_DATE + INTERVAL '7 days'
    AND status = 'scheduled'
  `);

  const overdueVisits = await query(`
    SELECT COUNT(*) as count 
    FROM maintenance_visits 
    WHERE visit_date < CURRENT_DATE 
    AND status IN ('scheduled', 'in_progress')
  `);

  return {
    total_assets: parseInt(stats.total_assets),
    operational: parseInt(stats.operational_count),
    needs_maintenance: parseInt(stats.needs_maintenance_count),
    decommissioned: parseInt(stats.decommissioned_count),
    warranty_expiring_soon: parseInt(stats.warranty_expiring_soon_count),
    upcoming_maintenance_visits: parseInt(upcomingMaintenance.rows[0].count),
    overdue_maintenance_visits: parseInt(overdueVisits.rows[0].count),
  };
}

module.exports = {
  createInstalledAsset,
  getAssetById,
  listAssets,
  getAssetsByProjectId,
  updateAsset,
  deleteAsset,
  getWarrantyAlerts,
  getDashboardStats,
};
