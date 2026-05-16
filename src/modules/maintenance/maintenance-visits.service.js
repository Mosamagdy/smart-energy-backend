const repo = require('./maintenance-visits.repository');
const { notify, notifyRole } = require('../../utils/notify');

/**
 * Maintenance Visits Service
 * Business logic for maintenance visits
 */

/**
 * Create new maintenance visit
 */
async function createMaintenanceVisit(data, currentUser) {
  // Validate required fields
  if (!data.asset_id || !data.visit_date) {
    const err = new Error('يجب تحديد الأصل وتاريخ الزيارة');
    err.statusCode = 400;
    throw err;
  }

  // Validate asset exists
  const { query } = require('../../db');
  const assetCheck = await query('SELECT id FROM installed_assets WHERE id = $1', [data.asset_id]);
  if (assetCheck.rows.length === 0) {
    const err = new Error('الأصل غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Calculate total cost if not provided
  let totalCost = data.total_cost;
  if (totalCost === undefined) {
    totalCost = (data.travel_cost || 0) + (data.labor_cost || 0);
  }

  // Create the visit
  const visit = await repo.createVisit({
    ...data,
    total_cost: totalCost,
    scheduled_by: currentUser.id,
    created_by: currentUser.id
  });

  // Send notifications
  try {
    // Notify assigned engineer
    if (data.assigned_engineer_id) {
      await notify(data.assigned_engineer_id, {
        title: 'تم تعيين زيارة صيانة جديدة',
        message: `تم تعيينك لزيارة صيانة للأصل: ${assetCheck.rows[0].asset_name}`,
        type: 'assignment',
        entity_type: 'maintenance_visit',
        entity_id: visit.id,
      });
    }

    // Notify general manager
    await notifyRole('general_manager', {
      title: 'زيارة صيانة مجدولة',
      message: `تم جدولة زيارة صيانة جديدة (${data.visit_type})`,
      type: 'info',
      entity_type: 'maintenance_visit',
      entity_id: visit.id,
    });

    // If emergency visit, notify department head immediately
    if (data.visit_type === 'emergency') {
      await notifyRole('dept_head', {
        title: 'زيارة صيانة طارئة',
        message: 'تم جدولة زيارة صيانة طارئة - يرجى المتابعة',
        type: 'alert',
        entity_type: 'maintenance_visit',
        entity_id: visit.id,
      });
    }
  } catch (notifError) {
    console.error('Failed to send notifications:', notifError.message);
  }

  return visit;
}

/**
 * Get visit by ID
 */
async function getVisitById(id) {
  const visit = await repo.findVisitById(id);
  
  if (!visit) {
    const err = new Error('الزيارة غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  return visit;
}

/**
 * List all visits with filters
 */
async function listVisits(filters) {
  return await repo.findAllVisits(filters);
}

/**
 * Get visits by asset ID (for maintenance history)
 */
async function getMaintenanceVisitsByAssetId(asset_id) {
  return await repo.findVisitsByAssetId(asset_id);
}

/**
 * Update visit status
 */
async function updateVisitStatus(id, status, currentUser) {
  const visit = await repo.findVisitById(id);
  
  if (!visit) {
    const err = new Error('الزيارة غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  // Validate status transition
  const validTransitions = {
    'scheduled': ['in_progress', 'cancelled'],
    'in_progress': ['completed', 'cancelled'],
    'completed': [], // Terminal state
    'cancelled': []  // Terminal state
  };

  if (!validTransitions[visit.status].includes(status)) {
    const err = new Error(`لا يمكن تغيير الحالة من ${visit.status} إلى ${status}`);
    err.statusCode = 400;
    throw err;
  }

  const updated = await repo.updateVisit(id, { status });

  // Send notifications based on status change
  try {
    if (status === 'completed') {
      await notifyRole('general_manager', {
        title: 'تم إكمال زيارة الصيانة',
        message: `تم إكمال زيارة الصيانة للأصل: ${visit.asset_name}`,
        type: 'info',
        entity_type: 'maintenance_visit',
        entity_id: id,
      });

      // If billable, notify finance
      if (visit.billable) {
        await notifyRole('finance_manager', {
          title: 'زيارة صيانة قابلة للفوترة',
          message: 'يرجى إعداد فاتورة لزيارة الصيانة المكتملة',
          type: 'warning',
          entity_type: 'maintenance_visit',
          entity_id: id,
        });
      }
    } else if (status === 'in_progress') {
      await notifyRole('dept_head', {
        title: 'زيارة صيانة قيد التنفيذ',
        message: `بدأت زيارة الصيانة للأصل: ${visit.asset_name}`,
        type: 'info',
        entity_type: 'maintenance_visit',
        entity_id: id,
      });
    }
  } catch (error) {
    console.error('Notification error:', error.message);
  }

  return updated;
}

/**
 * Update visit details
 */
async function updateVisit(id, data, currentUser) {
  const visit = await repo.findVisitById(id);
  
  if (!visit) {
    const err = new Error('الزيارة غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  // Don't allow updating completed visits
  if (visit.status === 'completed') {
    const err = new Error('لا يمكن تعديل زيارة مكتملة');
    err.statusCode = 400;
    throw err;
  }

  const updated = await repo.updateVisit(id, data);

  return updated;
}

/**
 * Delete visit
 */
async function deleteVisit(id, currentUser) {
  const visit = await repo.findVisitById(id);
  
  if (!visit) {
    const err = new Error('الزيارة غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  // Don't allow deleting completed visits
  if (visit.status === 'completed') {
    const err = new Error('لا يمكن حذف زيارة مكتملة');
    err.statusCode = 400;
    throw err;
  }

  await repo.deleteVisit(id);

  return { success: true, message: 'تم حذف الزيارة بنجاح' };
}

/**
 * Get upcoming visits
 */
async function getUpcomingVisits(days = 7) {
  return await repo.getUpcomingVisits(days);
}

/**
 * Get overdue visits
 */
async function getOverdueVisits() {
  const overdue = await repo.getOverdueVisits();
  
  // Send notifications for newly overdue visits
  if (overdue.length > 0) {
    try {
      await notifyRole('dept_head', {
        title: 'زيارات صيانة متأخرة',
        message: `يوجد ${overdue.length} زيارات صيانة متأخرة`,
        type: 'alert',
        entity_type: 'maintenance_overdue',
      });
    } catch (error) {
      console.error('Failed to send overdue notifications:', error.message);
    }
  }

  return overdue;
}

module.exports = {
  createMaintenanceVisit,
  getVisitById,
  listVisits,
  getMaintenanceVisitsByAssetId,
  updateVisitStatus,
  updateVisit,
  deleteVisit,
  getUpcomingVisits,
  getOverdueVisits,
};
