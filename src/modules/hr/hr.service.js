/**
 * hr.service.js
 * Handles: Employees, Evaluations, File Uploads
 * Leaves logic has been moved to modules/leaves/leave.service.js
 */

const bcrypt                     = require('bcryptjs');
const path                       = require('path');
const fs                         = require('fs');
const repo                       = require('./hr.repository');
const { notifyRole }             = require('../../utils/notify');
const { canManageEmployee }      = require('../../utils/permissions');
const { query }                  = require('../../db');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'employees');

function ensureUploadDir(employeeId) {
  const dir = path.join(UPLOAD_DIR, String(employeeId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const HR_ADMIN_ROLES = ['super_admin', 'hr_manager', 'general_manager' , 'finance_manager'];

async function getCurrentEmployee(userId) {
  try {
    const result = await query(`
      SELECT e.*, u.id as user_id, u.email, u.first_name, u.last_name
      FROM employees e
      JOIN users u ON u.id = e.user_id
      WHERE u.id = $1
    `, [userId]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('[Service] getCurrentEmployee error:', err);
    throw err;
  }
}

async function generateEmployeeNumber() {
  try {
    const { rows } = await query(`
      SELECT MAX(CAST(SUBSTRING(username FROM '^emp_(\\d+)$') AS INTEGER)) AS max_num
      FROM users WHERE username ~ '^emp_\\d+$'
    `);
    const next = (rows[0]?.max_num || 0) + 1;
    return `EMP-${String(next).padStart(4, '0')}`;
  } catch {
    const ts = Date.now().toString().slice(-6);
    return `EMP-${ts}`;
  }
}

function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function sendCredentials(first_name, personal_email, personal_phone, username, password) {
  const nodemailer  = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"نظام الطاقة الذكي" <${process.env.SMTP_FROM}>`,
    to: personal_email,
    subject: 'مرحباً بك — بيانات دخولك على النظام',
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#1a1a2e">نظام الطاقة الذكي — مرحباً بك!</h2>
        <p>عزيزي ${first_name}، تم إضافتك في النظام بنجاح.</p>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0">
          <p><strong>اسم المستخدم:</strong> ${username}</p>
          <p><strong>كلمة المرور:</strong> ${password}</p>
        </div>
        <p style="color:#e74c3c">يرجى تغيير كلمة المرور فور تسجيل الدخول.</p>
      </div>`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Employees
// ─────────────────────────────────────────────────────────────────────────────

async function createEmployee(data, files, created_by) {
  const { first_name, last_name, role_name, role_id, job_title,
          department_name, department_id,
          personal_email, personal_phone } = data;

  if (!first_name || !last_name || !personal_email || !personal_phone) {
    const err = new Error('الاسم والإيميل ورقم الواتساب مطلوبون');
    err.statusCode = 400; throw err;
  }

  let finalRoleName = role_name;
  let finalRoleId   = role_id;

  if (!finalRoleName && !finalRoleId && job_title) {
    const jobTitleToRoleMap = {
      'general_manager':    'general_manager',
      'project_manager':    'project_manager',
      'engineer':           'engineer',
      'sales_rep':          'sales_rep',
      'hr_manager':         'hr_manager',
      'finance_manager':    'finance_manager',
      'dept_head':          'dept_head',
      'contract_dept_head': 'contract_dept_head',
      'purchase_manager':   'procurement_manager',
      'procurement_manager':'procurement_manager',
      'warehouse_manager':  'warehouse_manager',
      'quotation_specialist':'quotation_specialist',
      'accountant':         'finance_manager',
      'admin':              'super_admin',
      'technician':         'engineer',
      'supervisor':         'dept_head',
    };
    finalRoleName = jobTitleToRoleMap[job_title.toLowerCase()] || 'employee';
  }

  if (!finalRoleName && !finalRoleId) {
    const err = new Error('job_title أو role_name أو role_id مطلوب');
    err.statusCode = 400; throw err;
  }

  const { rows: [eu] } = await query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [personal_email]);
  if (eu) { const err = new Error('البريد الإلكتروني مستخدم بالفعل'); err.statusCode = 409; throw err; }

  const { rows: [pu] } = await query(`SELECT id FROM users WHERE phone = $1 LIMIT 1`, [personal_phone]);
  if (pu) { const err = new Error('رقم الهاتف مستخدم بالفعل'); err.statusCode = 409; throw err; }

  const roleQuery = finalRoleName
    ? await query(`SELECT id, name FROM roles WHERE name = $1 LIMIT 1`, [finalRoleName])
    : await query(`SELECT id, name FROM roles WHERE id = $1 LIMIT 1`,   [finalRoleId]);
  const role = roleQuery.rows[0];
  if (!role) {
    const err = new Error(`الدور غير موجود: ${finalRoleName || finalRoleId}`);
    err.statusCode = 400; throw err;
  }

  let deptId = null;
  if (department_name) {
    const { rows: [d] } = await query(
      `SELECT id FROM departments WHERE name = $1 AND is_active = true LIMIT 1`, [department_name]
    );
    if (!d) { const err = new Error(`الإدارة "${department_name}" غير موجودة`); err.statusCode = 400; throw err; }
    deptId = d.id;
  } else if (department_id) {
    const { rows: [d] } = await query(
      `SELECT id FROM departments WHERE id = $1 AND is_active = true LIMIT 1`, [department_id]
    );
    if (!d) { const err = new Error('الإدارة غير موجودة'); err.statusCode = 400; throw err; }
    deptId = d.id;
  }

  const employee_number = await generateEmployeeNumber();
  const seqPart         = employee_number.replace('EMP-', '');
  let   username        = `emp_${seqPart}`;
  const password        = generatePassword();
  const password_hash   = await bcrypt.hash(password, 12);

  let newUser;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const r = await query(
        `INSERT INTO users (first_name, last_name, email, username, password_hash, phone, role_id, department_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active') RETURNING id`,
        [first_name, last_name, personal_email, username, password_hash, personal_phone, role.id, deptId]
      );
      newUser = r.rows[0];
      break;
    } catch (e) {
      if (e.code === '23505' && attempt < 5) {
        const num = await generateEmployeeNumber();
        username  = `emp_${num.replace('EMP-', '')}`;
      } else throw e;
    }
  }

  const { role_name: _rn, role_id: _ri, department_name: _dn, department_id: _di, ...payload } = data;
  const employee = await repo.createEmployee({
    ...payload, user_id: newUser.id, department_id: deptId, employee_number, created_by,
  });

  // Default leave balances are now handled by leave.service on first use,
  // but we still seed them here for convenience
  const leaveRepo = require('../leaves/leave.repository');
  await leaveRepo.createOrUpdateLeaveBalance(employee.id, 'annual', 21);
  await leaveRepo.createOrUpdateLeaveBalance(employee.id, 'sick',   10);

  if (files && employee.id) {
    const dir = ensureUploadDir(employee.id);
    const fileMappings = {
      passport_file:    'passport_file_path',
      national_id_file: 'id_document_url',
      residence_file:   'residence_file_path',
      contract_file:    'contract_file_path',
    };
    for (const [field, dbCol] of Object.entries(fileMappings)) {
      if (files[field]?.[0]) {
        const f   = files[field][0];
        const ext = path.extname(f.originalname);
        const newFilename = `${dbCol}_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
        const dest = path.join(dir, newFilename);
        fs.renameSync(f.path, dest);
        const relativePath = `uploads/employees/${employee.id}/${newFilename}`;
        await repo.updateFilePath(employee.id, dbCol, relativePath);
      }
    }
  }

  await sendCredentials(first_name, personal_email, personal_phone, username, password);

  await notifyRole('hr_manager', {
    title: 'موظف جديد',
    message: `تم إضافة ${first_name} ${last_name} — ${role.name} — ${employee_number}`,
    type: 'info', entity_type: 'employee', entity_id: employee.id,
  });
  await notifyRole('general_manager', {
    title: 'موظف جديد',
    message: `تم إضافة موظف جديد: ${first_name} ${last_name} — الدور: ${role.name}`,
    type: 'info', entity_type: 'employee', entity_id: employee.id,
  });

  return { employee, credentials: { username, email: personal_email, whatsapp: personal_phone } };
}

async function getAllEmployees(filters = {}, currentUser = null) {
  if (!currentUser) return repo.getAllEmployees(filters);
  const role = (currentUser.role || currentUser.role_name || '').toLowerCase();
  if (HR_ADMIN_ROLES.includes(role)) return repo.getAllEmployees(filters);
  if (['dept_head', 'dep_pr_manager', 'tech_head'].includes(role)) {
    if (!currentUser.department_id) {
      const err = new Error('لا يوجد department_id مرتبط بحسابك'); err.statusCode = 403; throw err;
    }
    return repo.getAllEmployees({ ...filters, department_id: currentUser.department_id });
  }
  // const err = new Error('ليس لديك صلاحية لعرض قائمة الموظفين'); err.statusCode = 403; throw err;
}

async function getEmployeeById(id, currentUser = null) {
  const emp = await repo.getEmployeeById(id);
  if (!emp) { const err = new Error('الموظف غير موجود'); err.statusCode = 404; throw err; }
  if (currentUser) {
    const role = (currentUser.role || currentUser.role_name || '').toLowerCase();
    if (!HR_ADMIN_ROLES.includes(role)) {
      const canAccess = await canManageEmployee(currentUser, emp);
      if (!canAccess) { const err = new Error('ليس لديك صلاحية الوصول لهذا الموظف'); err.statusCode = 403; throw err; }
    }
  }
  return emp;
}

async function updateEmployee(id, data, currentUser = null) {
  const emp = await repo.getEmployeeById(id);
  if (!emp) { const err = new Error('الموظف غير موجود'); err.statusCode = 404; throw err; }

  if (currentUser) {
    const role = (currentUser.role || currentUser.role_name || '').toLowerCase();
    if (!HR_ADMIN_ROLES.includes(role)) {
      const err = new Error('فقط المدير العام أو مدير الموارد البشرية يقدر يعدّل بيانات الموظفين');
      err.statusCode = 403; throw err;
    }
  }

  if (emp.user_id) {
    const userUpdate = {};
    if (data.first_name    !== undefined) userUpdate.first_name = data.first_name;
    if (data.last_name     !== undefined) userUpdate.last_name  = data.last_name;
    if (data.personal_email !== undefined) userUpdate.email     = data.personal_email;
    if (data.personal_phone !== undefined) userUpdate.phone     = data.personal_phone;

    if (Object.keys(userUpdate).length > 0) {
      if (userUpdate.email) {
        const existing = await repo.findUserByEmail(userUpdate.email, emp.user_id);
        if (existing) { const err = new Error('البريد الإلكتروني مستخدم بالفعل'); err.statusCode = 409; throw err; }
      }
      if (userUpdate.phone) {
        const existing = await repo.findUserByPhone(userUpdate.phone, emp.user_id);
        if (existing) { const err = new Error('رقم الهاتف مستخدم بالفعل'); err.statusCode = 409; throw err; }
      }
      await repo.updateUser(emp.user_id, userUpdate);
    }
  }

  const employeeFields = [
    'arabic_name', 'nationality', 'date_of_birth', 'gender', 'marital_status', 'religion',
    'personal_email', 'personal_phone', 'emergency_contact', 'emergency_phone',
    'passport_number', 'passport_expiry', 'national_id', 'national_id_expiry',
    'residence_permit', 'residence_expiry',
    'job_title', 'employment_type', 'contract_start_date', 'contract_end_date', 'probation_end_date',
    'basic_salary', 'housing_allowance', 'transport_allowance', 'other_allowances',
    'bank_name', 'bank_account', 'iban', 'status',
    'passport_file_path', 'id_document_url', 'residence_file_path', 'contract_file_path',
    'gosi_registered', 'currency', 'payroll_status', 'department_id',
  ];

  const employeeUpdate = {};
  for (const key of employeeFields) {
    if (data[key] !== undefined && data[key] !== null) {
      let value = data[key];
      if (['basic_salary', 'housing_allowance', 'transport_allowance', 'other_allowances'].includes(key)) {
        if (typeof value === 'string') value = value.replace(/,/g, '');
        value = parseFloat(value) || 0;
      } else if (key === 'gosi_registered' || key === 'payroll_status') {
        value = value === true || value === 'true' || value === 1 || value === '1';
      } else if (value === '' && key !== 'basic_salary') {
        value = null;
      }
      employeeUpdate[key] = value;
    }
  }

  if (Object.keys(employeeUpdate).length > 0) {
    const updated = await repo.updateEmployee(id, employeeUpdate);
    if (!updated) { const err = new Error('فشل تحديث بيانات الموظف'); err.statusCode = 500; throw err; }
  }

  return repo.getEmployeeById(id);
}

async function deleteEmployee(id, currentUser = null) {
  const emp = await repo.getEmployeeById(id);
  if (!emp) { const err = new Error('الموظف غير موجود'); err.statusCode = 404; throw err; }
  if (currentUser) {
    const role = (currentUser.role || currentUser.role_name || '').toLowerCase();
    if (!HR_ADMIN_ROLES.includes(role)) {
      const err = new Error('فقط المدير العام أو مدير الموارد البشرية يقدر يحذف موظفين');
      err.statusCode = 403; throw err;
    }
  }
  await repo.deleteEmployee(id);
}

async function getExpiringDocuments(days = 30) {
  return repo.getExpiringDocuments(days);
}

async function uploadEmployeeFiles(employeeId, files, currentUser = null) {
  const emp = await repo.getEmployeeById(employeeId);
  if (!emp) { const err = new Error('الموظف غير موجود'); err.statusCode = 404; throw err; }
  if (currentUser) {
    const role = (currentUser.role || currentUser.role_name || '').toLowerCase();
    if (!HR_ADMIN_ROLES.includes(role)) {
      const err = new Error('فقط المدير العام أو مدير الموارد البشرية يقدر يرفع ملفات');
      err.statusCode = 403; throw err;
    }
  }

  const dir = ensureUploadDir(employeeId);
  const fileUpdates = {};
  const fileMappings = {
    passport_file:    'passport_file_path',
    national_id_file: 'id_document_url',
    residence_file:   'residence_file_path',
    contract_file:    'contract_file_path',
  };

  for (const [field, dbCol] of Object.entries(fileMappings)) {
    if (files[field]?.[0]) {
      const file = files[field][0];
      const ext  = path.extname(file.originalname);
      const newFilename = `${dbCol}_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
      const dest = path.join(dir, newFilename);
      fs.renameSync(file.path, dest);
      fileUpdates[dbCol] = `uploads/employees/${employeeId}/${newFilename}`;
    }
  }

  if (Object.keys(fileUpdates).length > 0) {
    return repo.updateEmployee(employeeId, fileUpdates);
  }
  return emp;
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluations
// ─────────────────────────────────────────────────────────────────────────────

async function createEvaluation(data, evaluator_id, currentUser = null) {
  if (data.employee_id) {
    const emp = await repo.getEmployeeById(data.employee_id);
    if (!emp) { const err = new Error('الموظف غير موجود'); err.statusCode = 404; throw err; }
  }
  return repo.createEvaluation({ ...data, evaluator_id });
}

async function getEmployeeEvaluations(employee_id) {
  return repo.getEmployeeEvaluations(employee_id);
}

async function getAllEvaluations(currentUser) {
  const role = (currentUser.role || currentUser.role_name || '').toLowerCase();
  if (!['super_admin', 'general_manager'].includes(role)) {
    const err = new Error('هذه البيانات للمدير العام فقط'); err.statusCode = 403; throw err;
  }
  return repo.getAllEvaluations();
}

module.exports = {
  createEmployee, getAllEmployees, getEmployeeById,
  updateEmployee, deleteEmployee, getExpiringDocuments,
  uploadEmployeeFiles,
  createEvaluation, getEmployeeEvaluations, getAllEvaluations,
  getCurrentEmployee,
};