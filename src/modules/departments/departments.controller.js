const service = require('./departments.service');

/**
 * POST /api/departments
 * Create department + head in one step
 * super_admin or general_manager only
 */
async function createDepartment(req, res, next) {
  try {
    const {
      name, description, icon, dept_type,
      head_first_name, head_last_name,
      head_email, head_username,
      head_password, head_phone,
    } = req.body;

    // Validate required fields
    const required = { name, head_first_name, head_last_name, head_email, head_username, head_password };
    const missing  = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);

    if (missing.length > 0) {
      const err = new Error(`الحقول التالية مطلوبة: ${missing.join(', ')}`);
      err.statusCode = 400;
      return next(err);
    }

    const result = await service.createDepartmentWithHead(
      { name, description, icon, dept_type, head_first_name, head_last_name, head_email, head_username, head_password, head_phone },
      req.user.id
    );

    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء الإدارة وحساب المدير بنجاح',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/departments/simple
 * Create department WITHOUT head - just name and optional description
 * Head will be assigned later via specialized manager endpoint
 * super_admin or general_manager only
 */
async function createDepartmentSimple(req, res, next) {
  try {
    const { name, description, icon, dept_type } = req.body;

    // Validate required fields
    if (!name) {
      const err = new Error('اسم الإدارة مطلوب');
      err.statusCode = 400;
      return next(err);
    }

    const result = await service.createDepartmentSimple(
      { name, description, icon, dept_type },
      req.user.id
    );

    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء الإدارة بنجاح - سيتم تعيين المدير لاحقاً',
      data: { department: result },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/departments
 * Get all departments — authenticated users
 */
async function getAllDepartments(req, res, next) {
  try {
    const departments = await service.getAllDepartments();
    res.status(200).json({ status: 'success', data: { departments } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/departments/technical
 * Get only technical departments (for lead assignment)
 */
async function getTechnicalDepartments(req, res, next) {
  try {
    const departments = await service.getTechnicalDepartments();
    res.status(200).json({ status: 'success', data: { departments } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/departments/:id
 * Get single department
 */
async function getDepartmentById(req, res, next) {
  try {
    const dept = await service.getDepartmentById(req.params.id);
    res.status(200).json({ status: 'success', data: { department: dept } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/departments/:id
 * Update department info — super_admin or general_manager only
 */
async function updateDepartment(req, res, next) {
  try {
    const { name, description, icon } = req.body;
    const updated = await service.updateDepartment(req.params.id, { name, description, icon });
    res.status(200).json({
      status: 'success',
      message: 'تم تحديث بيانات الإدارة بنجاح',
      data: { department: updated },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/departments/:id/toggle
 * Auto-toggle department active status — super_admin only
 * Flips the status automatically without requiring is_active in body
 */
async function toggleDepartment(req, res, next) {
  try {
    const updated = await service.toggleActiveAuto(req.params.id);
    res.status(200).json({
      status: 'success',
      message: `تم ${updated.is_active ? 'تفعيل' : 'تعطيل'} الإدارة بنجاح`,
      data: { department: updated },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/departments/:id/assign-manager
 * Assign a manager to a department by creating a new user
 * super_admin or general_manager only
 */
async function assignManager(req, res, next) {
  try {
    const { 
      first_name, 
      last_name, 
      email, 
      username, 
      password, 
      phone,
      role_id 
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !username || !password || !role_id) {
      const err = new Error('جميع الحقول مطلوبة: first_name, last_name, email, username, password, role_id');
      err.statusCode = 400;
      return next(err);
    }

    const departmentId = req.params.id;
    const manager = await service.assignManager(departmentId, {
      first_name,
      last_name,
      email,
      username,
      password,
      phone,
      role_id: parseInt(role_id, 10)
    }, req.user);

    res.status(201).json({
      status: 'success',
      message: 'تم تعيين المدير بنجاح',
      data: { manager }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/departments/:id
 * Delete department — super_admin or general_manager only
 * Validates that department has no linked employees before deletion
 */
async function deleteDepartment(req, res, next) {
  try {
    const deleted = await service.deleteDepartment(req.params.id);
    
    if (!deleted) {
      const err = new Error('الإدارة غير موجودة');
      err.statusCode = 404;
      return next(err);
    }

    res.status(200).json({
      status: 'success',
      message: 'تم حذف الإدارة بنجاح',
    });
  } catch (err) {
    // Check if it's the "has employees" error
    if (err.message.includes('لا يمكن حذف قسم يحتوي على موظفين')) {
      err.statusCode = 400;
    }
    next(err);
  }
}

module.exports = {
  createDepartment,
  createDepartmentSimple,
  getAllDepartments,
  getTechnicalDepartments,
  getDepartmentById,
  updateDepartment,
  toggleDepartment,
  assignManager,
  deleteDepartment,
};
