const repo = require('./leads.repository');
const { notify, notifyRole, notifyDeptHead, notifyTechHead } = require('../../utils/notify');
const { sendOtpEmail } = require('../../utils/mailer');
const { query, pool } = require('../../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendNotification } = require('../../services/socket.service');

/* ================================
   STATUS FLOW
================================ */
const STATUS_FLOW = {
  new: ['contacted', 'survey_requested', 'lost'],
  contacted: ['survey_requested', 'qualified', 'lost'],
  qualified: ['survey_requested', 'inspection_assigned', 'lost'],
  survey_requested: ['inspection_assigned', 'lost'],

  // مرحلة المعاينة
  inspection_assigned: ['inspection_completed', 'lost'],
  inspection_completed: ['finance_approved', 'lost'],

  // مرحلة الاعتمادات
  finance_approved: ['gm_approved', 'lost'],
  gm_approved: ['quotation_sent', 'won', 'lost'],

  // مرحلة رد العميل
  quotation_sent: ['won', 'lost', 'cancelled'],

  // حالات النهاية
  won: [],
  lost: [],
  cancelled: []
};

/* ================================
   HELPERS
================================ */
function throwError(msg, code) {
  const err = new Error(msg);
  err.statusCode = code;
  throw err;
}

function generateTempPassword() {
  return crypto.randomBytes(8).toString('hex');
}

function sanitizeUser(user) {
  const u = { ...user };
  delete u.password_hash;
  return u;
}

/* ================================
   DB HELPERS
================================ */
async function getLeadForUpdate(client, leadId) {
  const result = await client.query(
    `SELECT * FROM leads WHERE id=$1 FOR UPDATE`,
    [leadId]
  );
  if (!result.rows.length) throwError('العميل غير موجود', 404);
  return result.rows[0];
}

async function validateEngineer(client, engineerId) {
  const result = await client.query(
    `SELECT u.id FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id=$1 AND r.name='engineer'`,
    [engineerId]
  );
  if (!result.rows.length) throwError('المهندس غير صحيح', 400);
}

async function updateLeadEngineer(client, leadId, engineerId) {
  const result = await client.query(
    `UPDATE leads
     SET assigned_engineer_id=$1,
         status='inspection_assigned',
         updated_at=NOW()
     WHERE id=$2
     RETURNING *`,
    [engineerId, leadId]
  );
  return result.rows[0];
}

async function createInspection(client, leadId, engineerId) {
  const result = await client.query(
    `INSERT INTO inspections
     (lead_id, assigned_engineer_id, status, created_at)
     VALUES ($1,$2,'pending',NOW())
     RETURNING *`,
    [leadId, engineerId]
  );
  return result.rows[0];
}

async function updateLeadStatusDB(client, leadId, status) {
  const result = await client.query(
    `UPDATE leads SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
    [status, leadId]
  );
  return result.rows[0];
}

async function getOrCreateClient(client, lead) {
  const existing = await client.query(
    `SELECT * FROM users WHERE email=$1`,
    [lead.contact_email]
  );
  if (existing.rows.length) return existing.rows[0];

  const tempPassword = generateTempPassword();
  const hashed = await bcrypt.hash(tempPassword, 12);

  const newUser = await client.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, phone, role_id, status, is_first_login)
     VALUES ($1, $2, $3, $4, $5, (SELECT id FROM roles WHERE name='client'), 'active', true)
     RETURNING *`,
    [
      lead.client_name.split(' ')[0] || lead.client_name,
      lead.client_name.split(' ').slice(1).join(' ') || '',
      lead.contact_email,
      hashed,
      lead.contact_phone
    ]
  );
  return { ...newUser.rows[0], tempPassword };
}

/* ================================
   CRUD
================================ */
async function createLead(data, created_by) {
  if (!data.client_name || !data.service_type) {
    throwError('اسم العميل ونوع الخدمة مطلوبان', 400);
  }
  if (!data.technical_dept_id) {
    throwError('يجب اختيار قسم فني للعميل المحتمل', 400);
  }

  const dept = await require('../departments/departments.repository').getDepartmentById(data.technical_dept_id);
  if (!dept) throwError('القسم الفني المحدد غير موجود', 404);
  if (dept.dept_type !== 'technical') throwError('يجب اختيار قسم فني فقط (dept_type = technical)', 400);

  const lead = await repo.createLead({ ...data, owner_id: created_by });

  await notifyRole('general_manager', {
    title: 'عميل جديد',
    message: `${lead.client_name}`,
    type: 'info',
    entity_type: 'lead',
    entity_id: lead.id,
  });

  return lead;
}

async function getAllLeads(filters = {}, user = {}) {
  return repo.getAllLeads({
    ...filters,
    user_role: user.role,
    user_department_id: user.department_id,
    user_id: user.id,
  });
}

async function getAssignedLeads(userId, role) {
  return repo.getAssignedLeads(userId, role);
}

async function getLeadById(id) {
  const lead = await repo.getLeadById(id);
  if (!lead) throwError('العميل غير موجود', 404);
  return lead;
}

async function updateLead(id, data) {
  await getLeadById(id);
  return repo.updateLead(id, data);
}

async function deleteLead(id) {
  const lead = await getLeadById(id);
  if (!['new', 'lost'].includes(lead.status)) throwError('لا يمكن الحذف', 400);
  await repo.deleteLead(id);
}

/* ================================
   ✅ REQUEST SURVEY
   يغير الستاتوس لـ survey_requested
   ويبعت نوتيفيكيشن للـ tech_head بتاع القسم
================================ */
async function requestSurvey(leadId) {
  const lead = await getLeadById(leadId);

  // تأكد إن الستاتوس يسمح بطلب المعاينة
  const allowedStatuses = ['new', 'contacted', 'qualified'];
  if (!allowedStatuses.includes(lead.status)) {
    throwError(`لا يمكن طلب المعاينة في الحالة الحالية: ${lead.status}`, 400);
  }

  if (!lead.technical_dept_id) {
    throwError('يجب تحديد القسم الفني أولاً قبل طلب المعاينة', 400);
  }

  // تحديث الستاتوس
  const updatedLead = await repo.updateLeadStatus(leadId, 'survey_requested');

  // ✅ بعت نوتيفيكيشن للـ tech_head بتاع القسم الفني المحدد
  // لما يضغط على النوتيفيكيشن هيتوجه لـ /leads/:id
  await notifyTechHead(lead.technical_dept_id, {
    title: 'طلب معاينة جديد',
    message: `طلب معاينة للعميل: ${lead.client_name} - يرجى تعيين مهندس للمعاينة`,
    type: 'info',
    entity_type: 'lead',      // ✅ هيخلي الكليك يروح لـ /leads/:id
    entity_id: leadId,
  });

  // بعت نوتيفيكيشن للـ general_manager برضو
  await notifyRole('general_manager', {
    title: 'طلب معاينة جديد',
    message: `تم طلب معاينة للعميل: ${lead.client_name}`,
    type: 'info',
    entity_type: 'lead',
    entity_id: leadId,
  });

  return updatedLead;
}

/* ================================
   ASSIGN SALES
================================ */
async function assignSalesRep(id, sales_rep_id) {
  const lead = await getLeadById(id);

  const { rows } = await query(
    `SELECT * FROM users u 
     JOIN roles r ON r.id=u.role_id
     WHERE u.id=$1 AND r.name='sales_rep'`,
    [sales_rep_id]
  );
  if (!rows.length) throwError('المندوب غير صحيح', 400);

  const updated = await repo.assignSalesRep(id, sales_rep_id);

  await notify({
    user_id: sales_rep_id,
    title: 'تم تعيينك على عميل محتمل',
    message: `تم تعيينك على العميل: ${lead.client_name}`,
    type: 'info',
    entity_type: 'lead',
    entity_id: lead.id,
  });

  await notifyRole('general_manager', {
    title: 'تم تعيين مندوب مبيعات',
    message: `تم تعيين مندوب مبيعات للعميل: ${lead.client_name}`,
    type: 'info',
    entity_type: 'lead',
    entity_id: lead.id,
  });

  return updated;
}

async function removeSalesRep(id) {
  const lead = await getLeadById(id);
  if (!lead) throwError('العميل غير موجود', 404);

  const updated = await repo.removeSalesRep(id);

  await notifyRole('general_manager', {
    title: 'تم إزالة مندوب المبيعات',
    message: `تم إزالة مندوب المبيعات من العميل: ${lead.client_name}`,
    type: 'warning',
    entity_type: 'lead',
    entity_id: lead.id,
  });

  return updated;
}

async function removeEngineer(id) {
  const lead = await getLeadById(id);
  if (!lead) throwError('العميل غير موجود', 404);

  const updated = await repo.removeEngineer(id);

  await notifyRole('general_manager', {
    title: 'تم إزالة مهندس المعاينة',
    message: `تم إزالة مهندس المعاينة من العميل: ${lead.client_name}`,
    type: 'warning',
    entity_type: 'lead',
    entity_id: lead.id,
  });

  return updated;
}

/* ================================
   STATUS UPDATE (WITH AUTOMATION)
================================ */
async function updateLeadStatus(id, newStatus) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const lead = await getLeadForUpdate(client, id);

    const allowed = STATUS_FLOW[lead.status] || [];
    if (!allowed.includes(newStatus)) {
      throwError('Transition غير مسموح', 400);
    }

    if (newStatus === 'pending_gm_approval' && lead.status !== 'finance_approved') {
      throwError('يجب الموافقة المالية أولاً قبل إرسال العرض للمدير العام', 400);
    }

    const updatedLead = await updateLeadStatusDB(client, id, newStatus);

    await client.query('COMMIT');

    if (newStatus === 'inspection_completed') {
      await notifyRole('finance_manager', {
        title: 'تقرير المعاينة جاهز للمراجعة المالية',
        message: `العميل: ${lead.client_name} - يرجى مراجعة التقرير واعتماد التكاليف`,
        type: 'info',
        entity_type: 'lead',
        entity_id: id,
      });
    }

    if (newStatus === 'finance_approved') {
      await notifyRole('general_manager', {
        title: 'العرض المالي معتمد للإدارة العامة',
        message: `العميل: ${lead.client_name} - جاهز لاعتمادكم النهائي`,
        type: 'info',
        entity_type: 'lead',
        entity_id: id,
      });
    }

    if (newStatus === 'gm_approved') {
      await notifyRole('sales_rep', {
        title: 'العرض معتمد من المدير العام',
        message: `العميل: ${lead.client_name} - جاهز للإرسال للعميل`,
        type: 'success',
        entity_type: 'lead',
        entity_id: id,
      });
    }

    return updatedLead;

  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/* ================================
   ASSIGN ENGINEER
================================ */
async function assignEngineer(leadId, engineerId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const lead = await getLeadForUpdate(client, leadId);

    await validateEngineer(client, engineerId);

    const updatedLead = await updateLeadEngineer(client, leadId, engineerId);

    const inspection = await createInspection(client, leadId, engineerId);

    await client.query('COMMIT');

    await notify({
      user_id: engineerId,
      title: 'مهمة معاينة جديدة',
      message: `تم تعيينك لمعاينة العميل: ${lead.client_name}`,
      type: 'info',
      entity_type: 'lead',
      entity_id: lead.id,
    });

    await notifyRole('general_manager', {
      title: 'تم تعيين مهندس معاينة',
      message: `تم تعيين مهندس لمعاينة العميل: ${lead.client_name}`,
      type: 'info',
      entity_type: 'lead',
      entity_id: lead.id,
    });

    return { lead: updatedLead, inspection };

  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/* ================================
   APPROVE CLIENT
================================ */
async function approveForClient(leadId, approvedBy) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const lead = await getLeadForUpdate(client, leadId);

    if (lead.status !== 'gm_approved') throwError('لازم موافقة GM', 400);

    const user = await getOrCreateClient(client, lead);

    const updatedLead = await updateLeadStatusDB(client, leadId, 'quotation_sent');

    await client.query('COMMIT');

    if (user.isNewUser || user.tempPassword) {
      await notify({
        user_id: user.id,
        title: 'مرحباً بك في Smart Energy',
        message: 'تم اعتماد عرض السعر الخاص بك. يمكنك الآن مراجعة التفاصيل والرد بالقبول أو الرفض.',
        type: 'success',
        entity_type: 'lead',
        entity_id: leadId,
      });

      sendNotification(user.id, 'system', {
        title: 'مرحباً بك في Smart Energy',
        message: 'تم اعتماد عرض السعر - يمكنك الآن مراجعة التفاصيل والرد',
        icon: '/notifications/welcome.png'
      });
    }

    if (user.tempPassword) {
      const emailSubject = 'مرحباً بكم في شركة Smart Energy - بيانات حسابكم';
      const emailBody = `
        عزيزنا العميل ${lead.client_name}،
        
        نرحب بكم في شركة Smart Energy لخدمات الطاقة.
        
        تم إنشاء حسابكم الإلكتروني للوصول إلى بوابة العميل ومتابعة مشروعكم.
        
        📧 بيانات تسجيل الدخول:
        • البريد الإلكتروني: ${lead.contact_email}
        • كلمة المرور المؤقتة: ${user.tempPassword}
        
        ⚠️ هام:
        • يرجى تغيير كلمة المرور بعد تسجيل الدخول لأول مرة
        • كلمة المرور المؤقتة صالحة لمرة واحدة فقط
        
        🔗 لتسجيل الدخول: https://your-app-url.com/login
        
        بعد تسجيل الدخول، ستتمكنون من:
        ✅ الاطلاع على عرض السعر المعتمد
        ✅ الموافقة أو الرفض على العرض
        ✅ متابعة حالة المشروع
        ✅ الاطلاع على الفواتير والمدفوعات
        ✅ طلبات الصيانة والضمان
        
        شاكرين لكم ثقتكم الغالية.
        
        مع أطيب التحيات،
        فريق خدمة العملاء
        شركة Smart Energy لخدمات الطاقة
        
        📞 للاستفسارات: support@smartenergy.com
      `;

      await sendOtpEmail(lead.contact_email, emailBody, emailSubject);
    }

    return {
      lead: updatedLead,
      client_user: sanitizeUser(user),
      isNewUser: !!user.tempPassword,
      client_credentials_sent: true,
      new_user_id: user.id
    };

  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Customer statement (كشف حساب العميل)
 */
async function getCustomerStatement(leadId) {
  const statement = await repo.getCustomerStatementByLeadId(leadId);
  if (!statement) {
    throwError('لا يوجد حساب عميل مرتبط بهذا العميل المحتمل', 404);
  }

  let runningBalance = 0;
  const rows = statement.entries.map((entry) => {
    const debit = parseFloat(entry.debit || 0);
    const credit = parseFloat(entry.credit || 0);
    runningBalance += debit - credit;

    let transactionType = 'Journal Entry';
    if (entry.reference_type === 'sales_invoice') transactionType = 'Sales Invoice';
    if (entry.reference_type === 'receipt_voucher') transactionType = 'Payment Receipt';
    if (entry.reference_type === 'payment') transactionType = 'Payment';

    return {
      date: entry.date,
      reference_no: entry.reference_no,
      transaction_type: transactionType,
      debit: parseFloat(debit.toFixed(2)),
      credit: parseFloat(credit.toFixed(2)),
      running_balance: parseFloat(runningBalance.toFixed(2))
    };
  });

  return {
    lead_id: statement.lead_id,
    client_name: statement.client_name,
    columns: ['date', 'reference_no', 'transaction_type', 'debit', 'credit', 'running_balance'],
    entries: rows,
    closing_balance: rows.length ? rows[rows.length - 1].running_balance : 0
  };
}

/* ================================
   EXPORTS
================================ */
module.exports = {
  STATUS_FLOW,
  createLead,
  getAllLeads,
  getAssignedLeads,
  getLeadById,
  updateLead,
  deleteLead,
  requestSurvey,       // ✅ مضاف
  assignSalesRep,
  removeSalesRep,
  assignEngineer,
  removeEngineer,
  updateLeadStatus,
  approveForClient,
  getCustomerStatement,
};