const { query } = require('../../db');
const repo = require('./projects.repository');
const { notifyRole, notify } = require('../../utils/notify');
const { sendNotification } = require('../../services/socket.service');

// ============================================================================
// Projects Service - Business Logic Layer
// ============================================================================

// ============================================================================
// Projects Service - Business Logic Layer
// ============================================================================

/**
 * Create a new project
 * Auto-created when quotation status = 'client_approved' or manually by GM/super_admin
 */
async function createProject(data, currentUser) {
  const {
    name, description, budget, start_date, end_date,
    quotation_id,  lead_id, department_id
  } = data;

  // Validate required fields
  if (!name || !department_id) {
    const err = new Error('اسم المشروع والإدارة مطلوبان');
    err.statusCode = 400;
    throw err;
  }

  // If linked to quotation, verify it's approved
  let client_id = null;
  
  if (quotation_id) {
    const { rows: [quotation] } = await query(
      `SELECT status,lead_id FROM quotations WHERE id = $1`,
      [quotation_id]
    );
    
    if (!quotation) {
      const err = new Error('عرض السعر غير موجود');
      err.statusCode = 404;
      throw err;
    }
    
    if (quotation.status !== 'client_approved' && quotation.status !== 'gm_approved') {
      const err = new Error('لا يمكن إنشاء مشروع إلا بعد موافقة العميل على عرض السعر');
      err.statusCode = 400;
      throw err;
    }
    
    // Auto-set lead_id from quotation if not provided
    if (!lead_id) {
      lead_id = quotation.lead_id;
    }
  }

  // ✅ FIX: Fetch client_id from leads.client_user_id
  if (lead_id) {
    const { rows: [leadData] } = await query(
      `SELECT client_user_id FROM leads WHERE id = $1`,
      [lead_id]
    );
    
    if (leadData && leadData.client_user_id) {
      client_id = leadData.client_user_id;
      console.log(`[Project Creation] ✅ Found client_user_id: ${client_id} from lead ${lead_id}`);
    } else {
      console.warn(`[Project Creation] ⚠️ No client_user_id found for lead ${lead_id}, client_id will be NULL`);
    }
  }

  // Create the project with client_id
  const project = await repo.createProject({
    name, description, budget, start_date, end_date,
    quotation_id, lead_id, department_id, client_id, // ✅ Now includes client_id
    status: 'planning'
  });

  // Update lead status if linked
  if (lead_id) {
    await query(
      `UPDATE leads SET status = 'won' WHERE id = $1`,
      [lead_id]
    );
  }

  // Notify stakeholders
  await notifyRole('general_manager', {
    title: 'تم إنشاء مشروع جديد',
    message: `تم إنشاء مشروع "${name}" - الميزانية: ${budget || 0} ريال`,
    type: 'info',
    entity_type: 'project',
    entity_id: project.id
  });

  await notifyRole('project_manager', {
    title: 'مشروع جديد متاح للإدارة',
    message: `تم إنشاء مشروع جديد: ${name} - يرجى تعيين مدير للمشروع`,
    type: 'warning',
    entity_type: 'project',
    entity_id: project.id
  });

  // CRITICAL PHASE 2: Notify contracts department head to upload contract
  await notifyRole('contracts_dept_head', {
    title: 'مشروع جديد - مطلوب رفع العقد',
    message: `تم إنشاء مشروع "${name}" - يرجى رفع العقد الموقع`,
    type: 'warning',
    entity_type: 'project',
    entity_id: project.id
  });

  return project;
}

/**
 * Get all projects with role-based filtering
 */
async function getAllProjects(filters, currentUser) {
  if (!currentUser) {
    return repo.getAllProjects(filters);
  }

  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  const userId = currentUser.id;
  const userDeptId = currentUser.department_id;

  // Super admin and general manager see everything
  if (['super_admin', 'general_manager'].includes(userRole)) {
    return repo.getAllProjects(filters);
  }

  // Finance manager sees financial data for all projects
  if (userRole === 'finance_manager') {
    return repo.getAllProjects(filters);
  }

  // Dep PR manager: full access to projects in their own department
  if (userRole === 'dep_pr_manager') {
    // if (!userDeptId) return [];
    return repo.getAllProjects(filters);
  }

  // Tech leadership: only projects belonging to their department
  if (['tech_head', 'mc_manager', 'qs_manager'].includes(userRole)) {
    if (!userDeptId) return [];
    return repo.getAllProjects({ ...filters, department_id: userDeptId });
  }

  // Sales manager: read-only visibility (all projects)
  if (userRole === 'sales_manager') {
    return repo.getAllProjects(filters);
  }

  // Department heads are filtered by department type in repository:
  // technical => isolated to their technical_dept_id
  // administrative => all projects
  if (userRole === 'dept_head') {
    return repo.getAllProjects({
      ...filters,
      user_role: userRole,
      user_department_id: userDeptId
    });
  }

  // Project manager sees only their projects
  if (userRole === 'project_manager') {
    return repo.getAllProjects({ ...filters, project_manager_id: userId });
  }

  // Engineer sees projects they're assigned to
  if (userRole === 'engineer') {
    const { rows } = await query(
      `SELECT DISTINCT p.* 
       FROM projects p
       JOIN tasks t ON t.project_id = p.id
       WHERE t.assigned_to = $1`,
      [userId]
    );
    return rows;
  }

  // Client sees only their own projects
  if (userRole === 'client') {
    return repo.getAllProjects({ ...filters, client_id: userId });
  }

  // ✅ Contract dept head sees all projects (read-only access for contract management)
  if (userRole === 'contract_dept_head') {
    return repo.getAllProjects(filters);
  }

  // Default: no access
  return [];
}

/**
 * Get single project by ID with authorization check
 */
async function getProjectById(id, currentUser) {
  const project = await repo.getProjectById(id);
  
  if (!project) {
    const err = new Error('المشروع غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // CRITICAL: Calculate dynamic progress percentage
  try {
    const progress = await repo.calculateProjectProgress(id);
    project.progress_percentage = progress;
  } catch (err) {
    // If tasks table doesn't exist yet, set progress to 0
    project.progress_percentage = 0;
  }

  if (currentUser) {
    const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
    const userDeptId = currentUser.department_id;
    
    // Public access for these roles
    if (['super_admin', 'general_manager', 'finance_manager'].includes(userRole)) {
      return project;
    }

    // Dept head isolation (technical departments only)
    if (userRole === 'dept_head' && userDeptId) {
      const { rows: [dept] } = await query(
        `SELECT dept_type FROM departments WHERE id = $1`,
        [userDeptId]
      );

      if (dept?.dept_type === 'technical') {
        if (Number(project.department_id) !== Number(userDeptId)) {
          const err = new Error('ليس لديك صلاحية الوصول لهذا المشروع');
          err.statusCode = 403;
          throw err;
        }
      }
      return project;
    }

    // Tech head must stay within own department only.
    if (userRole === 'tech_head') {
      if (!userDeptId || Number(project.department_id) !== Number(userDeptId)) {
        const err = new Error('ليس لديك صلاحية الوصول لهذا المشروع');
        err.statusCode = 403;
        throw err;
      }
      return project;
    }

    // Client can only see their own projects
    if (userRole === 'client') {
      if (Number(project.client_id) !== Number(currentUser.id)) {
        const err = new Error('ليس لديك صلاحية الوصول لهذا المشروع');
        err.statusCode = 403;
        throw err;
      }
      return project;
    }

    // Project manager can see if assigned to this project
    if (userRole === 'project_manager') {
      if (Number(project.project_manager_id) === Number(currentUser.id)) {
        return project;
      }
    }
  }

  return project;
}

/**
 * Update project information
 */
async function updateProject(id, data, currentUser) {
  const project = await getProjectById(id, currentUser);
  
  // Only specific roles can update projects
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  if (!['super_admin', 'general_manager', 'project_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية تحديث بيانات المشاريع');
    err.statusCode = 403;
    throw err;
  }

  const updated = await repo.updateProject(id, data);
  
  if (updated) {
    await notifyRole('general_manager', {
      title: 'تم تحديث بيانات المشروع',
      message: `تم تحديث بيانات المشروع: ${updated.name}`,
      type: 'info',
      entity_type: 'project',
      entity_id: updated.id
    });
  }
  
  return updated;
}

/**
 * Update project status with workflow validation
 */
async function updateProjectStatus(id, status, currentUser) {
  const validStatuses = ['planning', 'in_progress', 'testing', 'completed', 'delivered'];
  
  if (!validStatuses.includes(status)) {
    const err = new Error('حالة المشروع غير صحيحة');
    err.statusCode = 400;
    throw err;
  }

  const project = await getProjectById(id, currentUser);
  
  // Status flow validation
  const statusOrder = { planning: 0, in_progress: 1, testing: 2, completed: 3, delivered: 4 };
  if (statusOrder[status] < statusOrder[project.status]) {
    const err = new Error('لا يمكن التراجع في حالة المشروع');
    err.statusCode = 400;
    throw err;
  }

  const updated = await repo.updateProjectStatus(id, status);

  // Notifications based on status changes
  if (status === 'completed') {
    await notifyRole('general_manager', {
      title: 'اكتمل المشروع',
      message: `تم اكتمال المشروع: ${project.name}`,
      type: 'success',
      entity_type: 'project',
      entity_id: project.id
    });

    await notifyRole('finance_manager', {
      title: 'جاهز للفوترة',
      message: `المشروع "${project.name}" مكتمل - يرجى إنشاء الفاتورة`,
      type: 'warning',
      entity_type: 'project',
      entity_id: project.id
    });
  }

  if (status === 'delivered') {
    await notifyRole('general_manager', {
      title: 'تم تسليم المشروع',
      message: `تم تسليم المشروع: ${project.name} للعميل`,
      type: 'success',
      entity_type: 'project',
      entity_id: project.id
    });

    await notifyRole('finance_manager', {
      title: 'تم تسليم المشروع',
      message: `تم تسليم المشروع "${project.name}" - يرجى متابعة المستحقات المالية`,
      type: 'info',
      entity_type: 'project',
      entity_id: project.id
    });
  }

  return updated;
}

/**
 * Assign project manager (projects dept_head only)
 * CRITICAL: PM must belong to same department as project
 */
async function assignProjectManager(projectId, managerUserId, currentUser) {
  // Verify current user is projects dept_head
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  
  if (userRole !== 'dep_pr_manager', 'general_manager') {
    const err = new Error('فقط مدير إدارة المشاريع يمكنه تعيين مديري المشاريع');
    err.statusCode = 403;
    throw err;
  }

  // Verify the department is projects department
  const { rows: [dept] } = await query(
    `SELECT name FROM departments WHERE id = $1`,
    [currentUser.department_id]
  );

  if (!dept || (!dept.name.toLowerCase().includes('projects') && !dept.name.includes('مشاريع'))) {
    const err = new Error('هذه الصلاحية متاحة فقط لمدير إدارة المشاريع');
    err.statusCode = 403;
    throw err;
  }

  // Get project details to check department match
  const { rows: [project] } = await query(
    `SELECT * FROM projects WHERE id = $1`,
    [projectId]
  );

  if (!project) {
    const err = new Error('المشروع غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Verify the manager user exists and has appropriate role
  const { rows: [manager] } = await query(
    `SELECT u.*, r.name AS role_name 
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1 AND (r.name = 'project_manager' OR r.name = 'engineer')`,
    [managerUserId]
  );

  if (!manager) {
    const err = new Error('المستخدم المحدد ليس مؤهلاً ليكون مدير مشروع');
    err.statusCode = 400;
    throw err;
  }

  // CRITICAL VALIDATION: PM must belong to same department as project
  if (Number(manager.department_id) !== Number(project.department_id)) {
    const err = new Error('لا يمكن تعيين مدير مشروع من إدارة أخرى - يجب أن يكون من نفس الإدارة');
    err.statusCode = 400;
    throw err;
  }

  const updatedProject = await repo.assignProjectManager(projectId, managerUserId);

  // Notify the assigned manager with detailed message
  await notify({
    user_id: managerUserId,
    title: 'تم تعيينك كمدير مشروع',
    message: `تم تعيينك كمدير لمشروع: ${project.name} - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق`,
    type: 'info',
    entity_type: 'project',
    entity_id: projectId
  });

  // Socket.io instant alert to PM
  sendNotification(managerUserId, 'system', {
    title: 'تم تعيينك كمدير مشروع جديد',
    message: `يرجى مراجعة مشروع: ${project.name}`,
    icon: '/notifications/assignment.png'
  });

  // Notify GM
  await notifyRole('general_manager', {
    title: 'تم تعيين مدير مشروع',
    message: `تم تعيين ${manager.first_name} ${manager.last_name} مديرًا لمشروع "${project.name}"`,
    type: 'info',
    entity_type: 'project',
    entity_id: projectId
  });

  return updatedProject;
}

/**
 * Assign employees to project (project_manager, dept_head, admin)
 * Can only assign employees from the project's linked department
 */
async function assignEmployees(projectId, employeeIds, currentUser) {
  const project = await getProjectById(projectId, currentUser);
  
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  
  // ✅ Allow project_manager, dept_head, super_admin, general_manager
  if (!['project_manager', 'dept_head', 'super_admin', 'general_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية تعيين الموظفين في المشروع');
    err.statusCode = 403;
    throw err;
  }

  // Project manager can only assign to their own project
  if (userRole === 'project_manager' && Number(project.project_manager_id) !== Number(currentUser.id)) {
    const err = new Error('يمكنك تعيين موظفين فقط في المشروع الذي تديره');
    err.statusCode = 403;
    throw err;
  }

  const assignments = [];
  
  for (const empId of employeeIds) {
    // Verify employee belongs to project's department
    const { rows: [emp] } = await query(
      `SELECT department_id FROM employees WHERE id = $1`,
      [empId]
    );

    if (!emp) {
      continue; // Skip non-existent employees
    }

    if (Number(emp.department_id) !== Number(project.department_id)) {
      const err = new Error('يمكن تعيين موظفين من إدارة المشروع فقط');
      err.statusCode = 400;
      throw err;
    }

    const assignment = await repo.assignEmployeeToProject(projectId, empId, 'team_member');
    assignments.push(assignment);

    // Notify the employee
    const { rows: [userData] } = await query(
      `SELECT user_id FROM employees WHERE id = $1`,
      [empId]
    );

    if (userData && userData.user_id) {
      await notify({
        user_id: userData.user_id,
        title: 'تم تعيينك في مشروع',
        message: `تم تعيينك في المشروع: ${project.name}`,
        type: 'info',
        entity_type: 'project',
        entity_id: projectId
      });
    }
  }

  // Notify GM
  await notifyRole('general_manager', {
    title: 'تم تعيين فريق المشروع',
    message: `تم تعيين ${assignments.length} موظفين في مشروع "${project.name}"`,
    type: 'info',
    entity_type: 'project',
    entity_id: projectId
  });

  return assignments;
}

/**
 * Get project employees
 */
async function getProjectEmployees(projectId, currentUser) {
  const project = await getProjectById(projectId, currentUser);
  return repo.getProjectEmployees(projectId);
}

// ============================================================================
// Materials Allocation & Inventory Management
// ============================================================================

/**
 * Allocate materials from inventory to project
 * Uses database transaction - atomicity guaranteed
 */
async function allocateMaterials(projectId, allocations, currentUser) {
  if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
    const err = new Error('يجب تحديد المواد المطلوبة');
    err.statusCode = 400;
    throw err;
  }

  const project = await getProjectById(projectId, currentUser);
  
  // Only project manager can allocate materials
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  if (!['super_admin', 'general_manager', 'project_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية صرف مواد من المخزون');
    err.statusCode = 403;
    throw err;
  }

  if (Number(project.project_manager_id) !== Number(currentUser.id)) {
    const err = new Error('يمكنك صرف مواد فقط لمشاريعك');
    err.statusCode = 403;
    throw err;
  }

  // Validate each allocation has required fields
  for (const alloc of allocations) {
    if (!alloc.item_id || !alloc.quantity || alloc.quantity <= 0) {
      const err = new Error('بيانات المواد غير صحيحة');
      err.statusCode = 400;
      throw err;
    }
  }

  // Allocate with transaction safety
  const results = await repo.allocateMaterials(projectId, allocations, currentUser.id);

  // Notify stakeholders
  await notifyRole('general_manager', {
    title: 'تم صرف مواد من المخزون',
    message: `تم صرف ${results.length} أصناف لمشروع "${project.name}"`,
    type: 'info',
    entity_type: 'project',
    entity_id: projectId
  });

  return results;
}

/**
 * Get allocated materials for project
 */
async function getProjectMaterials(projectId, currentUser) {
  await getProjectById(projectId, currentUser); // Authorization check
  return repo.getProjectMaterials(projectId);
}

// ============================================================================
// Assets Assignment
// ============================================================================

/**
 * Assign asset to project
 */
async function assignAssetToProject(projectId, assetId, currentUser) {
  const project = await getProjectById(projectId, currentUser);
  
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  if (!['super_admin', 'general_manager', 'project_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية تعيين الأصول');
    err.statusCode = 403;
    throw err;
  }

  if (Number(project.project_manager_id) !== Number(currentUser.id)) {
    const err = new Error('يمكنك تعيين أصول فقط لمشاريعك');
    err.statusCode = 403;
    throw err;
  }

  const asset = await repo.assignAssetToProject(projectId, assetId, currentUser.id);
  
  if (!asset) {
    const err = new Error('الأصل غير موجود');
    err.statusCode = 404;
    throw err;
  }

  await notifyRole('general_manager', {
    title: 'تم تعيين أصل لمشروع',
    message: `تم تعيين الأصل "${asset.name}" لمشروع "${project.name}"`,
    type: 'info',
    entity_type: 'project',
    entity_id: projectId
  });

  return asset;
}

/**
 * Get project assets
 */
async function getProjectAssets(projectId, currentUser) {
  await getProjectById(projectId, currentUser);
  return repo.getProjectAssets(projectId);
}

/**
 * Return asset from project
 */
async function returnAssetFromProject(assetId, currentUser) {
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  if (!['super_admin', 'general_manager', 'project_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية إرجاع الأصول');
    err.statusCode = 403;
    throw err;
  }

  const asset = await repo.returnAssetFromProject(assetId);
  
  if (!asset) {
    const err = new Error('الأصل غير موجود');
    err.statusCode = 404;
    throw err;
  }

  return asset;
}

// ============================================================================
// Purchase Requests
// ============================================================================

/**
 * Create purchase request (when inventory is insufficient)
 */
async function createPurchaseRequest(projectId, data, currentUser) {
  const { item_name, quantity, unit, reason } = data;

  // Validate required fields
  if (!item_name || !quantity || quantity <= 0) {
    const err = new Error('اسم العنصر والكمية مطلوبان');
    err.statusCode = 400;
    throw err;
  }

  const project = await getProjectById(projectId, currentUser);

  // Only project manager can create purchase requests for their project
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  if (!['super_admin', 'general_manager', 'project_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية إنشاء طلبات شراء');
    err.statusCode = 403;
    throw err;
  }

  if (Number(project.project_manager_id) !== Number(currentUser.id)) {
    const err = new Error('يمكنك إنشاء طلبات شراء فقط لمشاريعك');
    err.statusCode = 403;
    throw err;
  }

  // Create the purchase request
  const purchaseRequest = await repo.createPurchaseRequest({
    project_id: projectId,
    requested_by: currentUser.id,
    item_name,
    quantity,
    unit,
    reason,
    status: 'pending'
  });

  // CRITICAL: Notify procurement department head
  await notifyRole('procurement_dept_head', {
    title: 'طلب شراء جديد',
    message: `طلب شراء جديد من مشروع "${project.name}": ${item_name} (الكمية: ${quantity})`,
    type: 'warning',
    entity_type: 'purchase_request',
    entity_id: purchaseRequest.id
  });

  // ✅ Notify warehouse manager (to track pending arrivals)
  await notifyRole('warehouse_manager', {
    title: 'طلب شراء جديد - تحضير لاستلام',
    message: `تم إنشاء طلب شراء في مشروع "${project.name}" - ${item_name} (الكمية: ${quantity}). يرجى التحضير للاستلام.`,
    type: 'info',
    entity_type: 'purchase_request',
    entity_id: purchaseRequest.id
  });

  // Notify finance manager
  await notifyRole('finance_manager', {
    title: 'طلب شراء جديد للمراجعة المالية',
    message: `تم إنشاء طلب شراء في مشروع "${project.name}" - ${item_name} (الكمية: ${quantity}). يرجى مراجعة الميزانية.`,
    type: 'info',
    entity_type: 'purchase_request',
    entity_id: purchaseRequest.id
  });

  // Notify general manager
  await notifyRole('general_manager', {
    title: 'طلب شراء جديد للمراجعة النهائية',
    message: `تم إنشاء طلب شراء في مشروع "${project.name}": ${item_name} (${quantity} ${unit || 'pcs'}). للمراجعة والاعتماد النهائي.`,
    type: 'warning',
    entity_type: 'purchase_request',
    entity_id: purchaseRequest.id
  });

  return purchaseRequest;
}

/**
 * Get purchase requests for project
 */
async function getPurchaseRequests(projectId, currentUser) {
  await getProjectById(projectId, currentUser); // Authorization check
  return repo.getPurchaseRequests(projectId);
}

/**
 * Update purchase request status (approve/reject)
 */
async function updatePurchaseRequestStatus(requestId, status, rejectionReason, currentUser) {
  const validStatuses = ['pending', 'approved', 'rejected'];
  
  if (!validStatuses.includes(status)) {
    const err = new Error('حالة طلب الشراء غير صحيحة');
    err.statusCode = 400;
    throw err;
  }

  // Authorization: Only GM, super_admin, or finance_manager can approve
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  if (!['super_admin', 'general_manager', 'finance_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية الموافقة على طلبات الشراء');
    err.statusCode = 403;
    throw err;
  }

  const updated = await repo.updatePurchaseRequestStatus(requestId, status, rejectionReason, currentUser.id);

  if (!updated) {
    const err = new Error('طلب الشراء غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Notify project manager about approval/rejection
  const { rows: [proj] } = await query(
    `SELECT project_manager_id, name FROM projects WHERE id = $1`,
    [updated.project_id]
  );

  if (proj && proj.project_manager_id) {
    await notify({
      user_id: proj.project_manager_id,
      title: status === 'approved' ? 'تمت الموافقة على طلب الشراء' : 'تم رفض طلب الشراء',
      message: `تمت ${status === 'approved' ? 'الموافقة' : 'رفض'} طلب الشراء الخاص بمشروع "${proj.name}"`,
      type: status === 'approved' ? 'success' : 'danger',
      entity_type: 'purchase_request',
      entity_id: requestId
    });
  }

  // Notify GM
  await notifyRole('general_manager', {
    title: `تم ${status === 'approved' ? 'الموافقة' : 'رفض'} طلب شراء`,
    message: `تم ${status === 'approved' ? 'الموافقة' : 'رفض'} طلب شراء لمشروع "${proj?.name || 'غير معروف'}"`,
    type: 'info',
    entity_type: 'purchase_request',
    entity_id: requestId
  });

  return updated;
}

// ============================================================================
// QHSE Inspections
// ============================================================================

/**
 * Create QHSE inspection
 */
async function createQhseInspection(projectId, data, currentUser) {
  const { assigned_engineer, inspection_date, safety_materials } = data;

  // Validate required fields
  if (!inspection_date) {
    const err = new Error('تاريخ التفتيش مطلوب');
    err.statusCode = 400;
    throw err;
  }

  const project = await getProjectById(projectId, currentUser);

  // Authorization: Only QHSE dept_head, GM, or super_admin can create inspections
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  if (!['super_admin', 'general_manager', 'dept_head'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية إنشاء تفتيش QHSE');
    err.statusCode = 403;
    throw err;
  }

  // Create the inspection
  const inspection = await repo.createQhseInspection({
    project_id: projectId,
    assigned_by: currentUser.id,
    assigned_engineer,
    inspection_date,
    safety_materials
  });

  // Notify QHSE department head
  await notifyRole('qhsr_dept_head', {
    title: 'تم إنشاء تفتيش QHSE جديد',
    message: `تم إنشاء تفتيش سلامة لمشروع "${project.name}" - التاريخ: ${inspection_date}`,
    type: 'warning',
    entity_type: 'qhse_inspection',
    entity_id: inspection.id
  });

  // Notify general manager
  await notifyRole('general_manager', {
    title: 'تم إنشاء تفتيش QHSE',
    message: `تم إنشاء تفتيش سلامة في مشروع "${project.name}"`,
    type: 'info',
    entity_type: 'qhse_inspection',
    entity_id: inspection.id
  });

  // Notify assigned engineer if specified
  if (assigned_engineer) {
    await notify({
      user_id: assigned_engineer,
      title: 'تم تعيينك في تفتيش QHSE',
      message: `تم تعيينك للتفتيش على مشروع "${project.name}"`,
      type: 'info',
      entity_type: 'qhse_inspection',
      entity_id: inspection.id
    });
  }

  return inspection;
}

/**
 * Get QHSE inspections for project
 */
async function getQhseInspections(projectId, currentUser) {
  await getProjectById(projectId, currentUser); // Authorization check
  return repo.getQhseInspections(projectId);
}

/**
 * Update QHSE inspection (submit report)
 */
async function updateQhseInspection(id, data, currentUser) {
  const { status, report, attachments } = data;

  // Validate
  if (!report) {
    const err = new Error('التقرير مطلوب');
    err.statusCode = 400;
    throw err;
  }

  // Authorization
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  if (!['super_admin', 'general_manager', 'dept_head', 'engineer'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية تقديم تقرير QHSE');
    err.statusCode = 403;
    throw err;
  }

  const updated = await repo.updateQhseInspection(id, { status, report, attachments });

  if (!updated) {
    const err = new Error('التفتيش غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Notify stakeholders
  await notifyRole('general_manager', {
    title: 'تم تقديم تقرير QHSE',
    message: `تم تقديم تقرير تفتيش السلامة للمشروع رقم ${id}`,
    type: 'info',
    entity_type: 'qhse_inspection',
    entity_id: id
  });

  return updated;
}

// ============================================================================
// PMO DASHBOARD ENDPOINTS
// ============================================================================

/**
 * Get PMO Dashboard Statistics
 * GET /api/pmo/stats
 */
async function getPMOStats() {
  // 1. Total Active Projects (excluding completed and cancelled)
  const { rows: [activeProjects] } = await query(`
    SELECT COUNT(*) as count 
    FROM projects 
    WHERE status NOT IN ('completed', 'cancelled')
  `);

  // 2. Delayed Tasks (status != 'completed' AND due_date < NOW())
  const { rows: [delayedTasks] } = await query(`
    SELECT COUNT(*) as count 
    FROM tasks 
    WHERE status != 'completed' 
      AND due_date < NOW()
      AND due_date IS NOT NULL
  `);

  // 3. Resource Utilization (assigned engineers / total engineers * 100)
  const { rows: [engineerStats] } = await query(`
    SELECT 
      COUNT(DISTINCT u.id) as total_engineers,
      COUNT(DISTINCT CASE WHEN t.assigned_to IS NOT NULL THEN t.assigned_to END) as assigned_engineers
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    LEFT JOIN tasks t ON t.assigned_to = u.id AND t.status != 'completed'
    WHERE r.name = 'engineer'
  `);

  const utilization = engineerStats.total_engineers > 0 
    ? Math.round((engineerStats.assigned_engineers / engineerStats.total_engineers) * 100)
    : 0;

  // 4. Awaiting PM Assignment
  const { rows: [awaitingPM] } = await query(`
    SELECT COUNT(*) as count 
    FROM projects 
    WHERE status = 'awaiting_pm_assignment'
  `);

  return {
    total_active_projects: parseInt(activeProjects.count),
    delayed_tasks: parseInt(delayedTasks.count),
    resource_utilization: utilization,
    awaiting_pm_assignment: parseInt(awaitingPM.count)
  };
}

/**
 * Get Project Progress List
 * GET /api/pmo/projects/progress
 */
async function getProjectProgress() {
  const { rows } = await query(`
    SELECT 
      p.id,
      p.name,
      p.status,
      p.department_id,
      d.name as department_name,
      COUNT(t.id) as total_tasks,
      COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
      CASE 
        WHEN COUNT(t.id) = 0 THEN 0
        ELSE ROUND(COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::numeric / COUNT(t.id)::numeric * 100, 0)
      END as progress
    FROM projects p
    LEFT JOIN departments d ON d.id = p.department_id
    LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.status NOT IN ('cancelled')
    GROUP BY p.id, p.name, p.status, p.department_id, d.name
    ORDER BY p.created_at DESC
    LIMIT 20
  `);

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    status: row.status,
    department_name: row.department_name || 'غير محدد',
    progress: parseInt(row.progress)
  }));
}

/**
 * Get Delayed Tasks
 * GET /api/pmo/tasks/delayed
 */
async function getDelayedTasks() {
  const { rows } = await query(`
    SELECT 
      t.id,
      t.title,
      t.due_date,
      t.status,
      t.assigned_to,
      p.name as project_name,
      u.first_name || ' ' || u.last_name as assigned_to_name,
      EXTRACT(DAY FROM NOW() - t.due_date)::int as days_overdue
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE t.status != 'completed'
      AND t.due_date < NOW()
      AND t.due_date IS NOT NULL
    ORDER BY t.due_date ASC
    LIMIT 50
  `);

  return rows;
}

/**
 * Get Recent Projects
 * GET /api/pmo/projects/recent
 */
async function getRecentProjects() {
  const { rows } = await query(`
    SELECT 
      p.id,
      p.name,
      p.status,
      p.budget,
      p.created_at,
      d.name as department_name
    FROM projects p
    LEFT JOIN departments d ON d.id = p.department_id
    ORDER BY p.created_at DESC
    LIMIT 10
  `);

  return rows;
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
  
  // Materials & Assets
  allocateMaterials,
  getProjectMaterials,
  assignAssetToProject,
  getProjectAssets,
  returnAssetFromProject,
  
  // Purchase Requests
  createPurchaseRequest,
  getPurchaseRequests,
  updatePurchaseRequestStatus,
  
  // QHSE Inspections
  createQhseInspection,
  getQhseInspections,
  updateQhseInspection,
  
  // PMO Dashboard
  getPMOStats,
  getProjectProgress,
  getDelayedTasks,
  getRecentProjects
};