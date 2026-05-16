/**
 * Maintenance Visits Controller
 * HTTP request handlers for maintenance visits
 */

const service = require('./maintenance-visits.service');

/**
 * POST /api/maintenance/visits
 * Create new maintenance visit
 */
async function createVisit(req, res, next) {
  try {
    const visit = await service.createMaintenanceVisit(req.body, req.user);
    
    res.status(201).json({
      status: 'success',
      message: 'تم جدولة زيارة الصيانة بنجاح',
      data: visit
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/maintenance/visits
 * List all visits with filters
 */
async function listVisits(req, res, next) {
  try {
    const filters = {
      asset_id: req.query.asset_id ? parseInt(req.query.asset_id) : null,
      status: req.query.status || null,
      visit_type: req.query.visit_type || null,
      assigned_engineer_id: req.query.assigned_engineer_id ? parseInt(req.query.assigned_engineer_id) : null,
      date_from: req.query.date_from || null,
      date_to: req.query.date_to || null,
    };

    // Clean up null values
    Object.keys(filters).forEach(key => {
      if (filters[key] === null || filters[key] === undefined || filters[key] === '') {
        delete filters[key];
      }
    });

    const visits = await service.listVisits(filters);
    
    res.json({
      status: 'success',
      count: visits.length,
      data: visits
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/maintenance/visits/upcoming
 * Get upcoming visits (next 7 days)
 */
async function getUpcomingVisits(req, res, next) {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 7;
    const visits = await service.getUpcomingVisits(days);
    
    res.json({
      status: 'success',
      count: visits.length,
      data: visits
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/maintenance/visits/overdue
 * Get overdue visits
 */
async function getOverdueVisits(req, res, next) {
  try {
    const visits = await service.getOverdueVisits();
    
    res.json({
      status: 'success',
      count: visits.length,
      data: visits
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/maintenance/visits/:id
 * Get visit by ID
 */
async function getVisit(req, res, next) {
  try {
    const visitId = parseInt(req.params.id);
    
    if (isNaN(visitId)) {
      const err = new Error('رقم الزيارة غير صحيح');
      err.statusCode = 400;
      throw err;
    }

    const visit = await service.getVisitById(visitId);
    
    res.json({
      status: 'success',
      data: visit
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/maintenance/visits/:id/status
 * Update visit status
 */
async function updateVisitStatus(req, res, next) {
  try {
    const visitId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status) {
      const err = new Error('يجب تحديد الحالة الجديدة');
      err.statusCode = 400;
      throw err;
    }

    if (isNaN(visitId)) {
      const err = new Error('رقم الزيارة غير صحيح');
      err.statusCode = 400;
      throw err;
    }

    const updated = await service.updateVisitStatus(visitId, status, req.user);
    
    res.json({
      status: 'success',
      message: 'تم تحديث حالة الزيارة بنجاح',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/maintenance/visits/:id
 * Update visit details
 */
async function updateVisit(req, res, next) {
  try {
    const visitId = parseInt(req.params.id);
    
    if (isNaN(visitId)) {
      const err = new Error('رقم الزيارة غير صحيح');
      err.statusCode = 400;
      throw err;
    }

    const updated = await service.updateVisit(visitId, req.body, req.user);
    
    res.json({
      status: 'success',
      message: 'تم تحديث الزيارة بنجاح',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/maintenance/visits/:id
 * Delete visit
 */
async function deleteVisit(req, res, next) {
  try {
    const visitId = parseInt(req.params.id);
    
    if (isNaN(visitId)) {
      const err = new Error('رقم الزيارة غير صحيح');
      err.statusCode = 400;
      throw err;
    }

    const result = await service.deleteVisit(visitId, req.user);
    
    res.json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createVisit,
  listVisits,
  getUpcomingVisits,
  getOverdueVisits,
  getVisit,
  updateVisitStatus,
  updateVisit,
  deleteVisit,
};
