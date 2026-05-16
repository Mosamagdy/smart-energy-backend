const service = require('./inspection-reports.service');

/**
 * POST /api/inspection-reports
 * Create inspection report with measurements and photos
 * - Multipart/form-data for file uploads
 */
async function createInspectionReport(req, res, next) {
  try {
    // Parse form data (files will be handled by multer or similar middleware)
    const {
      inspection_id,
      summary,
      measurements,
      required_materials,
      photos,
      technical_notes
    } = req.body;

    // Validate required fields
    if (!inspection_id) {
      const err = new Error('معرّف المعاينة مطلوب');
      err.statusCode = 400;
      return next(err);
    }

    if (!summary) {
      const err = new Error('ملخص التقرير مطلوب');
      err.statusCode = 400;
      return next(err);
    }

    // Parse JSON fields if they're strings
    const parsedData = {
      inspection_id,
      summary,
      measurements: typeof measurements === 'string' ? JSON.parse(measurements) : measurements,
      required_materials: typeof required_materials === 'string' ? JSON.parse(required_materials) : required_materials,
      photos: typeof photos === 'string' ? JSON.parse(photos) : photos,
      technical_notes: technical_notes || ''
    };

    const report = await service.createInspectionReport(parsedData, req.user.id);

    res.status(201).json({
      status: 'success',
      message: 'تم رفع تقرير المعاينة بنجاح وإخطار قسم العروض',
      data: { report }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/inspection-reports/:id
 * Get single inspection report
 */
async function getReportsByLeadId(req, res, next) {
  try {
    const report = await service.getReportsByLeadId(req.params.id);
    res.status(200).json({
      status: 'success',
      data: { report }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leads/:leadId/inspection-report
 * Get inspection report by lead ID
 */
async function getInspectionReportByLeadId(req, res, next) {
  try {
    const report = await service.getInspectionReportByLeadId(req.params.leadId);
    
    if (!report) {
      const err = new Error('لا يوجد تقرير معاينة لهذا العميل');
      err.statusCode = 404;
      return next(err);
    }

    res.status(200).json({
      status: 'success',
      data: { report }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/inspection-reports/:id
 * Update inspection report
 */
async function updateInspectionReport(req, res, next) {
  try {
    const {
      summary,
      measurements,
      required_materials,
      photos,
      technical_notes
    } = req.body;

    const updateData = {};
    if (summary !== undefined) updateData.summary = summary;
    if (measurements !== undefined) updateData.measurements = measurements;
    if (required_materials !== undefined) updateData.required_materials = required_materials;
    if (photos !== undefined) updateData.photos = photos;
    if (technical_notes !== undefined) updateData.technical_notes = technical_notes;

    const report = await service.updateInspectionReport(
      req.params.id,
      updateData,
      req.user.id
    );

    res.status(200).json({
      status: 'success',
      message: 'تم تحديث تقرير المعاينة بنجاح',
      data: { report }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/inspection-reports/:id
 * Soft delete inspection report
 */
async function deleteInspectionReport(req, res, next) {
  try {
    await service.deleteInspectionReport(req.params.id, req.user.id);
    res.status(200).json({
      status: 'success',
      message: 'تم حذف تقرير المعاينة بنجاح'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createInspectionReport,
  getReportsByLeadId,
  getInspectionReportByLeadId,
  updateInspectionReport,
  deleteInspectionReport
};
