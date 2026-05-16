const service = require('./auth.service');
const repo = require('./auth.repository');
const bcrypt = require('bcryptjs');

/**
 * POST /api/auth/login
 * Public — no auth required
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      const err = new Error('البريد الإلكتروني وكلمة المرور مطلوبان');
      err.statusCode = 400;
      return next(err);
    }
    const result = await service.loginStep1({ email, password });
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/verify-otp
 * Public — no auth required
 */
async function verifyOtp(req, res, next) {
  try {
    const { user_id, otp_code } = req.body;
    if (!user_id || !otp_code) {
      const err = new Error('user_id و otp_code مطلوبان');
      err.statusCode = 400;
      return next(err);
    }
    const result = await service.loginStep2({ user_id, otp_code });
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Protected — valid JWT required
 */
async function getMe(req, res, next) {
  try {
    const user = await service.getMe(req.user.id);
    res.status(200).json({ status: 'success', data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/create-general-manager
 * Protected — super_admin only
 */
async function createGeneralManager(req, res, next) {
  try {
    const { first_name, last_name, email, username, password, phone } = req.body;

    const required = { first_name, last_name, email, username, password, phone };
    const missing  = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length > 0) {
      const err = new Error(`الحقول التالية مطلوبة: ${missing.join(', ')}`);
      err.statusCode = 400;
      return next(err);
    }

    const newUser = await service.createGeneralManager(
      { first_name, last_name, email, username, password, phone },
      req.user.id
    );

    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء حساب المدير العام بنجاح',
      data: { user: newUser },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/create-dept-head
 * Protected — super_admin or general_manager only
 */
async function createDeptHead(req, res, next) {
  try {
    const { first_name, last_name, email, username, password, phone, department_id } = req.body;

    const required = { first_name, last_name, email, username, password, department_id };
    const missing  = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length > 0) {
      const err = new Error(`الحقول التالية مطلوبة: ${missing.join(', ')}`);
      err.statusCode = 400;
      return next(err);
    }

    const newUser = await service.createDeptHead(
      { first_name, last_name, email, username, password, phone, department_id },
      req.user.id
    );

    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء حساب مدير القسم بنجاح',
      data: { user: newUser },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/create-hr-manager
 * Protected — general_manager only
 * Creates an HR Manager with GLOBAL ACCESS to all departments
 */
async function createHrManager(req, res, next) {
  try {
    const { first_name, last_name, email, username, password, phone, department_id } = req.body;

    const required = { first_name, last_name, email, username, password, department_id };
    const missing  = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length > 0) {
      const err = new Error(`الحقول التالية مطلوبة: ${missing.join(', ')}`);
      err.statusCode = 400;
      return next(err);
    }

    const newHrManager = await service.createHrManager(
      { first_name, last_name, email, username, password, phone, department_id },
      req.user.id
    );

    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء حساب مدير الموارد البشرية بنجاح. لديه صلاحية الوصول العالمي لجميع الأقسام',
      data: { user: newHrManager },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/update-password
 * Update password (for logged-in users - employees and clients)
 */
async function updateUserPassword(req, res, next) {
  try {
    const { old_password, new_password } = req.body;

    // Validation
    if (!old_password || !new_password) {
      const err = new Error('كلمة المرور القديمة والجديدة مطلوبان');
      err.statusCode = 400;
      throw err;
    }

    if (new_password.length < 6) {
      const err = new Error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      err.statusCode = 400;
      throw err;
    }

    // Get current user
    const user = await repo.findUserWithPasswordById(req.user.id);

    if (!user) {
      const err = new Error('المستخدم غير موجود');
      err.statusCode = 404;
      throw err;
    }

    if (!user.password_hash) {
      const err = new Error('لا يمكن التحقق من كلمة المرور (password_hash مفقود)');
      err.statusCode = 500;
      throw err;
    }

    // Verify old password
    const isMatch = await bcrypt.compare(String(old_password), String(user.password_hash));

    if (!isMatch) {
      const err = new Error('كلمة المرور القديمة غير صحيحة');
      err.statusCode = 401;
      throw err;
    }

    // Hash new password
    const newHash = await bcrypt.hash(String(new_password), 12);

    await repo.updateUserPassword(user.id, newHash);

    res.status(200).json({
      status: 'success',
      message: 'تم تحديث كلمة المرور بنجاح',
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name
        }
      }
    });

  } catch (err) {
    next(err);
  }
}



module.exports = {
  login,
  verifyOtp,
  getMe,
  createGeneralManager,
  createDeptHead,
  createHrManager,
  updateUserPassword
};