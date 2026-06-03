const service = require('./projects.service');
const { query } = require('../../db');

// ============================================================================
// Projects Controller - HTTP Request Handlers
// ============================================================================

/**
 * POST /api/projects
 * Create a new project (auto or manual by GM/super_admin/dept_head)
 */
async function createProject(req, res, next) {
  try {
    const project = await service.createProject(req.body, req.user);
    
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء المشروع بنجاح',
      data: { project }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects
 * List all projects (filtered by role)
 */
async function getAllProjects(req, res, next) {
  try {
    const { department_id, status, client_id } = req.query;
    
    const filters = {};
    if (department_id) filters.department_id = department_id;
    if (status) filters.status = status;
    if (client_id) filters.client_id = client_id;
    
    filters.user_role = req.user?.role || req.user?.role_name;
    filters.user_department_id = req.user?.department_id;

    const projects = await service.getAllProjects(filters, req.user);
    
    res.status(200).json({
      status: 'success',
      data: { projects, count: projects.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:id
 * Full project details (tasks, team, materials)
 */
async function getProjectById(req, res, next) {
  try {
    const project = await service.getProjectById(req.params.id, req.user);
    
    res.status(200).json({
      status: 'success',
      data: { project }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/projects/:id
 * Update project info
 */
async function updateProject(req, res, next) {
  try {
    const project = await service.updateProject(req.params.id, req.body, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تم تحديث بيانات المشروع',
      data: { project }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/projects/:id/status
 * Update project status
 */
async function updateProjectStatus(req, res, next) {
  try {
    const { status } = req.body;
    
    if (!status) {
      const err = new Error('حالة المشروع مطلوبة');
      err.statusCode = 400;
      throw err;
    }
    
    const project = await service.updateProjectStatus(req.params.id, status, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تم تحديث حالة المشروع',
      data: { project }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/projects/:id/assign-manager
 * Assign project manager (projects dept_head only)
 */
async function assignProjectManager(req, res, next) {
  try {
    const { manager_user_id } = req.body;
    
    if (!manager_user_id) {
      const err = new Error('المستخدم المطلوب تعيينه كمدير مشروع مطلوب');
      err.statusCode = 400;
      throw err;
    }
    
    const project = await service.assignProjectManager(
      req.params.id, 
      manager_user_id, 
      req.user
    );
    
    res.status(200).json({
      status: 'success',
      message: 'تم تعيين مدير المشروع بنجاح',
      data: { project }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/managers/by-department/:departmentId
 * Get all project managers filtered by department (for PMO head to select from)
 */
async function getProjectManagersByDepartment(req, res, next) {
  try {
    const { departmentId } = req.params;
    
    if (!departmentId) {
      const err = new Error('معرف الإدارة مطلوب');
      err.statusCode = 400;
      throw err;
    }
    
    // Fetch users with role = 'project_manager' AND their department_id matches
    const { rows } = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.department_id,
              r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.department_id = $1 
         AND (r.name = 'project_manager' OR r.name = 'engineer')
         AND u.status = 'active'
       ORDER BY u.created_at DESC`,
      [departmentId]
    );
    
    res.status(200).json({
      status: 'success',
      data: { 
        managers: rows,
        count: rows.length,
        department_id: departmentId
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/projects/:id/employees
 * Assign employees from dept (project_manager only)
 */
async function assignEmployees(req, res, next) {
  try {
    const { employee_ids } = req.body;
    
    if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      const err = new Error('يجب تحديد معرفات الموظفين المراد تعيينهم');
      err.statusCode = 400;
      throw err;
    }
    
    const assignments = await service.assignEmployees(
      req.params.id, 
      employee_ids, 
      req.user
    );
    
    res.status(200).json({
      status: 'success',
      message: `تم تعيين ${assignments.length} موظفين في المشروع`,
      data: { assignments }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:id/employees
 * List project employees
 */
async function getProjectEmployees(req, res, next) {
  try {
    const employees = await service.getProjectEmployees(req.params.id, req.user);
    
    res.status(200).json({
      status: 'success',
      data: { employees, count: employees.length }
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// Materials & Assets Controllers
// ============================================================================

/**
 * POST /api/projects/:id/materials
 * Allocate materials from inventory to project
 */
async function allocateMaterials(req, res, next) {
  try {
    const { allocations } = req.body;
    
    if (!allocations || !Array.isArray(allocations)) {
      const err = new Error('يجب تحديد المواد المطلوبة');
      err.statusCode = 400;
      throw err;
    }
    
    const results = await service.allocateMaterials(req.params.id, allocations, req.user);
    
    res.status(200).json({
      status: 'success',
      message: `تم صرف ${results.length} أصناف من المخزون`,
      data: { allocations: results }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:id/materials
 * List allocated materials for project
 */
async function getProjectMaterials(req, res, next) {
  try {
    const materials = await service.getProjectMaterials(req.params.id, req.user);
    
    res.status(200).json({
      status: 'success',
      data: { materials, count: materials.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/projects/:id/assets
 * Assign asset to project
 */
async function assignAsset(req, res, next) {
  try {
    const { asset_id } = req.body;
    
    if (!asset_id) {
      const err = new Error('معرف الأصل مطلوب');
      err.statusCode = 400;
      throw err;
    }
    
    const asset = await service.assignAssetToProject(req.params.id, asset_id, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تم تعيين الأصل للمشروع',
      data: { asset }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:id/assets
 * List project assets
 */
async function getProjectAssets(req, res, next) {
  try {
    const assets = await service.getProjectAssets(req.params.id, req.user);
    
    res.status(200).json({
      status: 'success',
      data: { assets, count: assets.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/projects/assets/:assetId/return
 * Return asset from project
 */
async function returnAsset(req, res, next) {
  try {
    const asset = await service.returnAssetFromProject(req.params.assetId, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تم إرجاع الأصل للمخزون',
      data: { asset }
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// Purchase Requests Controllers
// ============================================================================

/**
 * POST /api/projects/:id/purchase-requests
 * Create purchase request
 */
async function createPurchaseRequest(req, res, next) {
  try {
    const purchaseRequest = await service.createPurchaseRequest(req.params.id, req.body, req.user);
    
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء طلب الشراء بنجاح',
      data: { purchaseRequest }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:id/purchase-requests
 * List purchase requests
 */
async function getPurchaseRequests(req, res, next) {
  try {
    const requests = await service.getPurchaseRequests(req.params.id, req.user);
    
    res.status(200).json({
      status: 'success',
      data: { requests, count: requests.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/projects/purchase-requests/:requestId/status
 * Update purchase request status
 */
async function updatePurchaseRequestStatus(req, res, next) {
  try {
    const { status, rejection_reason } = req.body;
    
    if (!status) {
      const err = new Error('حالة طلب الشراء مطلوبة');
      err.statusCode = 400;
      throw err;
    }
    
    const request = await service.updatePurchaseRequestStatus(
      req.params.requestId, 
      status, 
      rejection_reason, 
      req.user
    );
    
    res.status(200).json({
      status: 'success',
      message: status === 'approved' ? 'تمت الموافقة على طلب الشراء' : 'تم تحديث طلب الشراء',
      data: { request }
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// QHSE Inspections Controllers
// ============================================================================

/**
 * POST /api/projects/:id/qhse-inspections
 * Create QHSE inspection
 */
async function createQhseInspection(req, res, next) {
  try {
    const inspection = await service.createQhseInspection(req.params.id, req.body, req.user);
    
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء تفتيش QHSE بنجاح',
      data: { inspection }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:id/qhse-inspections
 * List QHSE inspections
 */
async function getQhseInspections(req, res, next) {
  try {
    const inspections = await service.getQhseInspections(req.params.id, req.user);
    
    res.status(200).json({
      status: 'success',
      data: { inspections, count: inspections.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/projects/qhse-inspections/:id/submit-report
 * Submit QHSE report
 */
async function updateQhseInspection(req, res, next) {
  try {
    const { status, report, attachments } = req.body;
    
    const inspection = await service.updateQhseInspection(
      req.params.id,
      { status, report, attachments },
      req.user
    );
    
    res.status(200).json({
      status: 'success',
      message: 'تم تقديم تقرير QHSE بنجاح',
      data: { inspection }
    });
  } catch (err) {
    next(err);
  }
}


// ============================================================================
// Project Delivery Controller
// ============================================================================

/**
 * PATCH /api/projects/:id/deliver
 * Mark project as delivered and upload final documents
 */
async function deliverProject(req, res, next) {
  try {
    const { status, delivery_notes } = req.body;
    
    // Validate status
    if (status !== 'delivered') {
      const err = new Error('يجب تغيير الحالة إلى "delivered"');
      err.statusCode = 400;
      throw err;
    }
    
    // Handle file uploads if present
    let attachments = null;
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
        uploaded_at: new Date().toISOString()
      }));
    }
    
    // Update project status and add delivery data
    const updatedData = {
      status: 'delivered',
      ...(delivery_notes && { description: delivery_notes }),
      ...(attachments && { metadata: { delivery_attachments: attachments } })
    };
    
    const project = await service.updateProject(req.params.id, updatedData, req.user);
    
    // Notify finance manager for final invoicing
    await notifyRole('finance_manager', {
      title: 'تم تسليم المشروع',
      message: `تم تسليم مشروع "${project.name}" - جاهز للفوترة النهائية`,
      type: 'success',
      entity_type: 'project',
      entity_id: project.id
    });
    
    // Notify general manager
    await notifyRole('general_manager', {
      title: 'تم تسليم مشروع للعميل',
      message: `تم تسليم مشروع "${project.name}" بنجاح للعميل`,
      type: 'success',
      entity_type: 'project',
      entity_id: project.id
    });
    
    res.status(200).json({
      status: 'success',
      message: 'تم تسليم المشروع بنجاح',
      data: { project }
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// PMO DASHBOARD CONTROLLERS
// ============================================================================

/**
 * GET /api/pmo/stats
 * Get PMO Dashboard Statistics
 */
async function getPMOStats(req, res, next) {
  try {
    const stats = await service.getPMOStats();
    
    res.status(200).json({
      status: 'success',
      data: stats
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/pmo/projects/progress
 * Get Project Progress List
 */
async function getProjectProgress(req, res, next) {
  try {
    const projects = await service.getProjectProgress();
    
    res.status(200).json({
      status: 'success',
      data: projects
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/pmo/tasks/delayed
 * Get Delayed Tasks
 */
async function getDelayedTasks(req, res, next) {
  try {
    const tasks = await service.getDelayedTasks();
    
    res.status(200).json({
      status: 'success',
      data: tasks
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/pmo/projects/recent
 * Get Recent Projects
 */
async function getRecentProjects(req, res, next) {
  try {
    const projects = await service.getRecentProjects();
    
    res.status(200).json({
      status: 'success',
      data: projects
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// Project Messages Controllers (Client Support Chat)
// ============================================================================

/**
 * GET /api/projects/:id/messages
 * Get all messages for a project (client support chat)
 */
async function getProjectMessages(req, res, next) {
  try {
    const messages = await service.getProjectMessages(parseInt(req.params.id), req.user);
    
    res.status(200).json({
      status: 'success',
      data: { messages }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/projects/:id/messages
 * Send a message to client
 */
async function sendProjectMessage(req, res, next) {
  try {
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      const err = new Error('نص الرسالة مطلوب');
      err.statusCode = 400;
      throw err;
    }
    
    const newMessage = await service.sendProjectMessage(
      parseInt(req.params.id),
      { message },
      req.user
    );
    
    res.status(201).json({
      status: 'success',
      message: 'تم إرسال الرسالة بنجاح',
      data: newMessage
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  updateProjectStatus,
  assignProjectManager,
  assignEmployees,
  getProjectEmployees,
  getProjectManagersByDepartment,
  
  // Materials & Assets
  allocateMaterials,
  getProjectMaterials,
  assignAsset,
  getProjectAssets,
  returnAsset,
  
  // Purchase Requests
  createPurchaseRequest,
  getPurchaseRequests,
  updatePurchaseRequestStatus,
  
  // Project Delivery
  deliverProject,
  
  // PMO Dashboard
  getPMOStats,
  getProjectProgress,
  getDelayedTasks,
  getRecentProjects,
  
  // Project Messages
  getProjectMessages,
  sendProjectMessage
};