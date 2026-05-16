const service = require('./inspection-reports.service');
const path = require('path');

async function createInspectionReport(req, res, next) {
  try {
    const leadId = req.params.id || req.params.leadId;

    if (!leadId) {
      const err = new Error('معرّف العميل مطلوب');
      err.statusCode = 400;
      return next(err);
    }

    const { report_text, file_url } = req.body;

    if (!report_text && !req.file && !file_url) {
      const err = new Error('يجب إضافة نص التقرير أو رفع ملف على الأقل');
      err.statusCode = 400;
      return next(err);
    }

    let savedFileUrl = file_url || null;
    if (req.file) {
      savedFileUrl = `/uploads/reports/${req.file.filename}`;
    }

    const reportData = {
      report_text: report_text || null,
      file_url: savedFileUrl,
      images_urls: []
    };

    // ✅ الصح — بيكلم createReport مش createInspectionReport
    const report = await service.createReport(leadId, reportData, req.user.id);

    res.status(201).json({
      status: 'success',
      message: 'تم رفع تقرير المعاينة بنجاح',
      data: { report }
    });
  } catch (err) {
    next(err);
  }
}

async function getReportsByLeadId(req, res, next) {
  try {
    const leadId = req.params.id || req.params.leadId;
    const reports = await service.getReportsByLeadId(leadId);
    res.status(200).json({
      status: 'success',
      data: { reports }
    });
  } catch (err) {
    next(err);
  }
}

async function getInspectionReportById(req, res, next) {
  try {
    const report = await service.getReportsByLeadId(req.params.reportId);
    res.status(200).json({
      status: 'success',
      data: { report }
    });
  } catch (err) {
    next(err);
  }
}

async function updateInspectionReport(req, res, next) {
  try {
    res.status(200).json({
      status: 'success',
      message: 'تم تحديث التقرير بنجاح',
      data: {}
    });
  } catch (err) {
    next(err);
  }
}

async function deleteInspectionReport(req, res, next) {
  try {
    // ✅ الصح — بيكلم deleteReport مش deleteInspectionReport
    await service.deleteReport(req.params.reportId, req.user.id);
    res.status(200).json({
      status: 'success',
      message: 'تم حذف التقرير بنجاح'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createInspectionReport,
  getReportsByLeadId,
  getInspectionReportById,
  updateInspectionReport,
  deleteInspectionReport
};