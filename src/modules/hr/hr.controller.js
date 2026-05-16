/**
 * hr.controller.js
 * Handles: Employees, Evaluations, File Uploads
 * Leaves logic has been moved to modules/leaves/leave.controller.js
 */

const multer  = require('multer');
const path    = require('path');
const service = require('./hr.service');

const upload = multer({
  dest: 'uploads/temp/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('نوع الملف غير مسموح — PDF, JPG, PNG, DOC, DOCX فقط'));
  },
});

const uploadFields = upload.fields([
  { name: 'passport_file',    maxCount: 1 },
  { name: 'national_id_file', maxCount: 1 },
  { name: 'residence_file',   maxCount: 1 },
  { name: 'contract_file',    maxCount: 1 },
]);

// ── Employees ─────────────────────────────────────────────────────────────────

async function createEmployee(req, res, next) {
  uploadFields(req, res, async (err) => {
    if (err) { err.statusCode = 400; return next(err); }
    try {
      const result = await service.createEmployee(req.body, req.files, req.user.id);
      res.status(201).json({
        status: 'success',
        message: 'تم إضافة الموظف بنجاح وتم إرسال بيانات الدخول على الإيميل والواتساب',
        data: result,
      });
    } catch (err) { next(err); }
  });
}

async function getAllEmployees(req, res, next) {
  try {
    const { department_id, status } = req.query;
    const employees = await service.getAllEmployees({ department_id, status }, req.user);
    res.status(200).json({
      status: 'success',
      data: { employees },
    });
  } catch (err) {
    console.error('[Controller] getAllEmployees error:', err);
    next(err);
  }
}

async function getCurrentEmployee(req, res, next) {
  try {
    const employee = await service.getCurrentEmployee(req.user.id);
    if (!employee) {
      return res.status(404).json({ status: 'error', message: 'Employee record not found' });
    }
    res.status(200).json({
      status: 'success',
      data: { employee },
    });
  } catch (err) {
    console.error('[Controller] getCurrentEmployee error:', err);
    next(err);
  }
}

async function getExpiringDocuments(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 30;
    const list = await service.getExpiringDocuments(days);
    res.status(200).json({
      status: 'success',
      data: { employees: list, count: list.length },
    });
  } catch (err) { next(err); }
}

async function getEmployeeById(req, res, next) {
  try {
    const employee = await service.getEmployeeById(req.params.id, req.user);
    res.status(200).json({ status: 'success', data: { employee } });
  } catch (err) { next(err); }
}

async function updateEmployee(req, res, next) {
  try {
    const employee = await service.updateEmployee(req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'تم تحديث بيانات الموظف',
      data: { employee },
    });
  } catch (err) { next(err); }
}

async function deleteEmployee(req, res, next) {
  try {
    await service.deleteEmployee(req.params.id, req.user);
    res.status(200).json({ status: 'success', message: 'تم حذف الموظف بنجاح' });
  } catch (err) { next(err); }
}

async function uploadEmployeeFiles(req, res, next) {
  try {
    const employeeId = req.params.id;
    const files      = req.files;

    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({ status: 'error', message: 'لم يتم رفع أي ملفات' });
    }

    const employee = await service.uploadEmployeeFiles(employeeId, files, req.user);
    res.status(200).json({
      status: 'success',
      message: 'تم رفع الملفات بنجاح',
      data: { employee },
    });
  } catch (err) { next(err); }
}

// ── Evaluations ───────────────────────────────────────────────────────────────

async function createEvaluation(req, res, next) {
  try {
    const evaluation = await service.createEvaluation(req.body, req.user.id, req.user);
    res.status(201).json({
      status: 'success',
      message: 'تم إضافة التقييم',
      data: { evaluation },
    });
  } catch (err) { next(err); }
}

async function getEmployeeEvaluations(req, res, next) {
  try {
    const evaluations = await service.getEmployeeEvaluations(req.params.employee_id, req.user);
    res.status(200).json({ status: 'success', data: { evaluations } });
  } catch (err) { next(err); }
}

async function getAllEvaluations(req, res, next) {
  try {
    const evaluations = await service.getAllEvaluations(req.user);
    res.status(200).json({
      status: 'success',
      data: { evaluations, count: evaluations.length },
    });
  } catch (err) { next(err); }
}

module.exports = {
  createEmployee, getAllEmployees, getCurrentEmployee, getEmployeeById,
  updateEmployee, deleteEmployee, getExpiringDocuments,
  uploadEmployeeFiles,
  createEvaluation, getEmployeeEvaluations, getAllEvaluations,
};