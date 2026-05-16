const { query } = require('../../db');
const repo = require('./contracts.repository');
const projectRepo = require('../projects/projects.repository');
const { notifyRole, notify } = require('../../utils/notify');

// ============================================================================
// Contracts Service - Business Logic Layer
// ============================================================================

/**
 * Create a new contract
 */
async function createContract(data, currentUser) {
  const {
    contract_number, 
    project_id, 
    client_id, 
    contract_type,
    start_date, 
    end_date, 
    total_value, 
    currency, 
    payment_terms,
    description, 
    attachment_url,
    contract_pdf // الحقل الجديد المولد من السيستم
  } = data;

  // 1. التحقق من الحقول الإجبارية
  if (!contract_number || !project_id || !client_id || !start_date || !end_date || !total_value) {
    const err = new Error('جميع الحقول المطلوبة يجب تعبئتها');
    err.statusCode = 400;
    throw err;
  }

  // 2. التحقق من وجود المشروع
  const project = await projectRepo.getProjectById(project_id);
  if (!project) {
    const err = new Error('المشروع غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // 3. الصلاحيات: (Super Admin, GM, Contracts Head)
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  if (!['super_admin', 'general_manager', 'contracts_dept_head'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية إنشاء العقود');
    err.statusCode = 403;
    throw err;
  }

  // 4. التأكد من أن رقم العقد فريد
  const existing = await repo.getContractById(contract_number);
  if (existing) {
    const err = new Error('رقم العقد يجب أن يكون فريدًا');
    err.statusCode = 400;
    throw err;
  }

  // 5. إنشاء العقد مع جعل الحالة "نشط" فوراً (Bypassing Draft/Signature)
  const contract = await repo.createContract({
    contract_number,
    project_id,
    client_id,
    contract_type: contract_type || 'supply', // قيمة افتراضية إذا لم ترسل
    start_date,
    end_date,
    total_value,
    currency: currency || 'SAR',
    payment_terms,
    description,
    attachment_url,
    contract_pdf,
    status: 'active', // تفعيل العقد فوراً للسماح بإصدار فواتير
    created_by: currentUser.id
  });

  // 6. التنبيهات (Notification Logic)
  // إرسال تنبيه للمدير المالي لبدء الدورة المالية (بما أن العقد أصبح نشطاً)
  await notifyRole('finance_manager', {
    title: 'عقد جديد نشط وجاهز للفواتير',
    message: `تم تفعيل عقد "${contract_number}" لمشروع "${project.name}" - يمكنك الآن إصدار المطالبات المالية`,
    type: 'success',
    entity_type: 'contract',
    entity_id: contract.id
  });

  // تنبيه المدير العام
  await notifyRole('general_manager', {
    title: 'تم إنشاء وتفعيل عقد',
    message: `تم إنشاء عقد "${contract_number}" بقيمة ${total_value} ${currency || 'SAR'} وهو متاح الآن للفواتير`,
    type: 'success',
    entity_type: 'contract',
    entity_id: contract.id
  });

  // تنبيه مدير المشروع
  if (project.project_manager_id) {
    await notify({
      user_id: project.project_manager_id,
      title: 'تم رفع عقد المشروع وتفعيله',
      message: `عقد مشروع "${project.name}" جاهز للتنفيذ - رقم العقد: ${contract_number}`,
      type: 'info',
      entity_type: 'contract',
      entity_id: contract.id
    });
  }

  return contract;
}

/**
 * Get contract by ID
 */
async function getContractById(id, currentUser) {
  const contract = await repo.getContractById(id);
  
  if (!contract) {
    const err = new Error('العقد غير موجود');
    err.statusCode = 404;
    throw err;
  }

  return contract;
}

/**
 * Get all contracts with filters
 */
async function getAllContracts(filters, currentUser) {
  if (!currentUser) {
    return repo.getAllContracts(filters);
  }

  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();

  // Super admin, GM, contract_dept_head, finance_manager see all
  if (['super_admin', 'general_manager', 'contract_dept_head', 'contracts_dept_head', 'finance_manager' , 'sales_manager','dep_pr_manager' ,'tech_head'].includes(userRole)) {
    return repo.getAllContracts(filters);
  }

  // Project manager sees only their project contracts
  if (userRole === 'project_manager') {
    return repo.getAllContracts({ ...filters, project_manager_id: currentUser.id });
  }

  // Client sees only their contracts
  if (userRole === 'client') {
    return repo.getAllContracts({ ...filters, client_id: currentUser.id });
  }

  // Engineer and dept_head can also view contracts (read-only)
  if (['engineer', 'dept_head'].includes(userRole)) {
    return repo.getAllContracts(filters);
  }

  return [];
}

/**
 * Update contract information
 */
async function updateContract(id, data, currentUser) {
  const contract = await repo.getContractById(id);
  
  if (!contract) {
    const err = new Error('العقد غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Authorization check
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  if (!['super_admin', 'general_manager', 'contracts_dept_head'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية تحديث العقود');
    err.statusCode = 403;
    throw err;
  }

  const updated = await repo.updateContract(id, data);

  // Notify stakeholders about major changes
  if (data.status || data.total_value) {
    await notifyRole('general_manager', {
      title: 'تم تحديث عقد',
      message: `تم تحديث العقد "${contract.contract_number}" لمشروع "${contract.project_name}"`,
      type: 'info',
      entity_type: 'contract',
      entity_id: id
    });
  }

  return updated;
}

/**
 * Sign contract (client or company side)
 */
async function signContract(id, signedBy, currentUser) {
  const validSigners = ['client', 'company'];
  
  if (!validSigners.includes(signedBy)) {
    const err = new Error('طرف التوقيع غير صحيح');
    err.statusCode = 400;
    throw err;
  }

  const contract = await repo.getContractById(id);
  
  if (!contract) {
    const err = new Error('العقد غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Authorization
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  
  if (signedBy === 'client' && userRole !== 'client') {
    const err = new Error('فقط العميل يمكنه التوقيع نيابة عن العميل');
    err.statusCode = 403;
    throw err;
  }
  
  if (signedBy === 'company' && !['super_admin', 'general_manager', 'contracts_dept_head'].includes(userRole)) {
    const err = new Error('فقط الإدارة يمكنها التوقيع نيابة عن الشركة');
    err.statusCode = 403;
    throw err;
  }

  const updated = await repo.signContract(id, signedBy);

  // If both parties signed, notify stakeholders
  if (updated.signed_by_client && updated.signed_by_company) {
    await notifyRole('finance_manager', {
      title: 'تم توقيع العقد بالكامل',
      message: `تم توقيع العقد "${contract.contract_number}" من جميع الأطراف - جاهز للتنفيذ`,
      type: 'success',
      entity_type: 'contract',
      entity_id: id
    });

    await notifyRole('general_manager', {
      title: 'اكتمل توقيع العقد',
      message: `تم توقيع العقد "${contract.contract_number}" بنجاح`,
      type: 'success',
      entity_type: 'contract',
      entity_id: id
    });
  }

  return updated;
}

/**
 * Get expiring contracts
 */
async function getExpiringContracts(daysThreshold = 30) {
  return repo.getExpiringContracts(daysThreshold);
}

/**
 * ✅ Upload contract for project and update contract_status
 */
async function uploadContractForProject(projectId, attachmentUrl, currentUser) {
  // 1. Verify project exists
  const project = await projectRepo.getProjectById(projectId);
  if (!project) {
    const err = new Error('المشروع غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // 2. Check authorization (contract_dept_head, super_admin, general_manager)
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  if (!['contract_dept_head', 'super_admin', 'general_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية رفع العقود');
    err.statusCode = 403;
    throw err;
  }

  // 3. ✅ FIX: Fetch client_id from projects table (or leads table if not available)
  let clientId = project.client_id;
  
  // If client_id is null in projects table, fetch it from leads table via lead_id
  if (!clientId && project.lead_id) {
    const { rows: [leadData] } = await query(
      `SELECT client_user_id FROM leads WHERE id = $1`,
      [project.lead_id]
    );
    if (leadData && leadData.client_user_id) {
      clientId = leadData.client_user_id;
    }
  }
  
  // If still no client_id, log warning but allow NULL
  if (!clientId) {
    console.warn(`[Contract Upload] No client_id found for project ${projectId}, using NULL`);
    // Allow NULL client_id for now - some projects might not have clients yet
  }

  // 4. Generate contract number
  const contractNumber = `CTR-${Date.now()}`;

  // 5. Create contract record
  const contract = await repo.createContract({
    contract_number: contractNumber,
    project_id: projectId,
    client_id: clientId, // ✅ Use fetched client_id
    contract_type: 'service',
    start_date: project.start_date || new Date(),
    end_date: project.end_date || new Date(),
    total_value: project.budget || 0,
    currency: 'SAR',
    description: `عقد مشروع: ${project.name}`,
    attachment_url: attachmentUrl,
    status: 'pending_signature',
    created_by: currentUser.id
  });

  // 6. Update project contract_status to 'uploaded'
  await query(
    `UPDATE projects SET contract_status = 'uploaded', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [projectId]
  );

  // 7. Get updated project
  const updatedProject = await projectRepo.getProjectById(projectId);

  // 8. Notify Project Manager
  if (project.project_manager_id) {
    await notify({
      user_id: project.project_manager_id,
      title: 'تم رفع عقد المشروع',
      message: `تم رفع عقد مشروع "${project.name}" بنجاح. يمكنك الآن تخصيص المواد من المخزون.`,
      type: 'success',
      entity_type: 'contract',
      entity_id: contract.id
    });
  }

  // 9. Notify General Manager
  await notifyRole('general_manager', {
    title: 'عقد جديد تم رفعه',
    message: `تم رفع عقد "${contractNumber}" لمشروع "${project.name}"`,
    type: 'info',
    entity_type: 'contract',
    entity_id: contract.id
  });

  return {
    contract,
    project: updatedProject
  };
}

module.exports = {
  createContract,
  getContractById,
  getAllContracts,
  updateContract,
  signContract,
  getExpiringContracts,
  uploadContractForProject,  // ✅ Export new function
};
