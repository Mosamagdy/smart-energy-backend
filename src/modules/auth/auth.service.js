const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');

const repo = require('./auth.repository');
const { generateOtp } = require('../../utils/otp');
const { sendOtpEmail } = require('../../utils/mailer');
const { sendOtpWhatsApp } = require('../../utils/sms');

// Roles that require OTP
const OTP_ROLES = ['general_manager'];

/**
 * Step 1 — Login with email + password
 * super_admin / dept_head → direct login (no OTP)
 * general_manager         → OTP via Email + WhatsApp
 */
async function loginStep1({ email, password }) {
  const user = await repo.findUserByEmail(email);
  if (!user) {
    const err = new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    err.statusCode = 401;
    throw err;
  }

  if (user.status !== 'active') {
    const err = new Error('هذا الحساب غير مفعّل، تواصل مع المسؤول');
    err.statusCode = 403;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const err = new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    err.statusCode = 401;
    throw err;
  }

  // General Manager → OTP flow
  if (OTP_ROLES.includes(user.role_name)) {
    const otp       = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await repo.saveOtp(user.id, otp, expiresAt);
    await Promise.all([
      sendOtpEmail(user.email, otp),
      // sendOtpWhatsApp(user.phone, otp),
    ]);

    return {
      requires_otp: true,
      user_id: user.id,
      message: 'تم إرسال رمز التحقق على بريدك الإلكتروني وواتساب',
    };
  }

  // Direct login (super_admin / dept_head)
  const permissions = await repo.getUserPermissions(user.role_id);
  const token       = signToken(user, permissions);

  return {
    requires_otp: false,
    token,
    user: sanitizeUser(user),
  };
}

/**
 * Step 2 — Verify OTP (general_manager only)
 */
async function loginStep2({ user_id, otp_code }) {
  const otp = await repo.findValidOtp(user_id, otp_code);
  if (!otp) {
    const err = new Error('رمز التحقق غير صحيح أو منتهي الصلاحية');
    err.statusCode = 401;
    throw err;
  }

  await repo.markOtpUsed(otp.id);

  const user        = await repo.findUserWithPasswordById(user_id);
  const permissions = await repo.getUserPermissions(user.role_id);
  const token       = signToken(user, permissions);

  return { token, user: sanitizeUser(user) };
}

/**
 * Create General Manager (super_admin only)
 */
async function createGeneralManager({ first_name, last_name, email, username, password, phone }, created_by) {
  const existing = await repo.findUserByEmail(email);
  if (existing) {
    const err = new Error('البريد الإلكتروني مستخدم بالفعل');
    err.statusCode = 409;
    throw err;
  }

  const role = await repo.findRoleByName('general_manager');
  if (!role) {
    const err = new Error('دور المدير العام غير موجود، يرجى تشغيل الـ seed أولاً');
    err.statusCode = 500;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, 12);

  const newUser = await repo.createGeneralManagerUser({
    first_name,
    last_name,
    email,
    username,
    password_hash,
    phone,
    role_id: role.id,
  });

  return newUser;
}

/**
 * Create Dept Head (super_admin or general_manager only)
 */
async function createDeptHead({ first_name, last_name, email, username, password, phone, department_id }, created_by) {
  const existing = await repo.findUserByEmail(email);
  if (existing) {
    const err = new Error('البريد الإلكتروني مستخدم بالفعل');
    err.statusCode = 409;
    throw err;
  }

  const role = await repo.findRoleByName('dept_head');
  if (!role) {
    const err = new Error('دور مدير القسم غير موجود، يرجى تشغيل الـ seed أولاً');
    err.statusCode = 500;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, 12);

  const newUser = await repo.createDeptHeadUser({
    first_name,
    last_name,
    email,
    username,
    password_hash,
    phone,
    department_id,
    role_id: role.id,
  });

  return newUser;
}

/**
 * Create HR Manager (general_manager only)
 * HR Manager has GLOBAL ACCESS to all departments
 */
async function createHrManager({ first_name, last_name, email, username, password, phone, department_id }, created_by) {
  const existing = await repo.findUserByEmail(email);
  if (existing) {
    const err = new Error('البريد الإلكتروني مستخدم بالفعل');
    err.statusCode = 409;
    throw err;
  }

  const role = await repo.findRoleByName('hr_manager');
  if (!role) {
    const err = new Error('دور مدير الموارد البشرية غير موجود، يرجى تشغيل الـ seed أولاً');
    err.statusCode = 500;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, 12);

  const newHrManager = await repo.createHrManagerUser({
    first_name,
    last_name,
    email,
    username,
    password_hash,
    phone,
    department_id,
    role_id: role.id,
  });

  // Notify the general manager who created this account
  try {
    const { notifyRole } = require('../../utils/notify');
    await notifyRole('general_manager', {
      title: 'تم إنشاء مدير موارد بشرية جديد',
      message: `تم إضافة ${first_name} ${last_name} كمدير موارد بشرية`,
      type: 'info',
      entity_type: 'user',
      entity_id: newHrManager.id,
    });
  } catch (err) {
    console.error('Failed to send notification:', err.message);
  }

  return newHrManager;
}

/**
 * Get current logged-in user info
 */
async function getMe(id) {
  const user = await repo.findUserWithPasswordById(id);
  if (!user) {
    const err = new Error('المستخدم غير موجود');
    err.statusCode = 404;
    throw err;
  }
  return sanitizeUser(user);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function signToken(user, permissions = []) {
  return jwt.sign(
    {
      id:            user.id,
      email:         user.email,
      role:          user.role_name,
      role_id:       user.role_id,
      department_id: user.department_id || null,
      dept_type:     user.dept_type || null,  // NEW: Include department type
      permissions,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn || '7d' }
  );
}

function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

module.exports = {
  loginStep1,
  loginStep2,
  createGeneralManager,
  createDeptHead,
  createHrManager,
  getMe,
};
