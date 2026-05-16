const { query } = require('../db');

// In-memory cache for HR department ID
let hrDepartmentIdCache = null;
let cacheTimestamp = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Role Classifications ────────────────────────────────────────────────────
// GLOBAL_ACCESS_ROLES: صلاحية كاملة على كل الموظفين بغض النظر عن القسم
const GLOBAL_ACCESS_ROLES = [
  'super_admin',         // GLOBAL
  'hr_manager',          // GLOBAL
];

// DEPT_SCOPED_ROLES: صلاحية على موظفي قسمه فقط
const DEPT_SCOPED_ROLES = [
  'dept_head',           // DEPT_SCOPED - مؤقت لحد ما يتحذف
  'contract_dept_head',  // DEPT_SCOPED
  'finance_manager',     // DEPT_SCOPED
  'quotation_specialist',// DEPT_SCOPED
  'procurement_manager', // DEPT_SCOPED
  'warehouse_manager',   // DEPT_SCOPED
  'inventory_manager',   // DEPT_SCOPED
  'sales_manager',       // DEPT_SCOPED
  'dep_pr_manager',      // DEPT_SCOPED
  'qs_manager',          // DEPT_SCOPED
  'mc_manager',          // DEPT_SCOPED
  'tech_head',           // DEPT_SCOPED
];
// ────────────────────────────────────────────────────────────────────────────

async function getHrDepartment() {
  const now = Date.now();
  if (hrDepartmentIdCache !== null && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL_MS) {
    console.log('[Permissions] Using cached HR department ID:', hrDepartmentIdCache);
    return hrDepartmentIdCache;
  }

  try {
    console.log('[Permissions] Querying database for HR department...');

    const hrNames = [
      'الموارد البشرية',
      'HR',
      'Human Resources',
      'HR Department',
      'إدارة الموارد البشرية'
    ];

    const { rows } = await query(
      `SELECT id, name FROM departments 
       WHERE (name = ANY($1) OR name ILIKE '%HR%' OR name ILIKE '%موارد بشرية%')
       AND is_active = true
       LIMIT 1`,
      [hrNames]
    );

    if (rows[0]) {
      console.log('[Permissions] Found HR department:', rows[0].name, '(ID:', rows[0].id, ')');
      hrDepartmentIdCache = rows[0].id;
      cacheTimestamp = now;
      return rows[0].id;
    } else {
      console.warn('[Permissions] No HR department found in database!');
      const { rows: allDepts } = await query(`SELECT id, name FROM departments WHERE is_active = true`);
      console.log('[Permissions] All active departments:', allDepts);
    }

    return null;
  } catch (error) {
    console.error('[Permissions] Error fetching HR department:', error.message);
    return null;
  }
}

function clearHrDepartmentCache() {
  hrDepartmentIdCache = null;
  cacheTimestamp = null;
}

async function canManageEmployee(currentUser, targetEmployee) {
  if (!currentUser || !targetEmployee) {
    console.log('[Permissions] canManageEmployee: Missing currentUser or targetEmployee');
    return false;
  }

  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  const userDepartmentId = currentUser.department_id;

  console.log('[Permissions] canManageEmployee check:', {
    userRole,
    userDepartmentId,
    targetDeptId: targetEmployee.department_id
  });

  // ── 1. Global access ────────────────────────────────────────────────
  if (GLOBAL_ACCESS_ROLES.includes(userRole)) {
    console.log('[Permissions] Allowing: global access role');
    return true;
  }

  // ── 2. Not in any known role ────────────────────────────────────────
  if (!DEPT_SCOPED_ROLES.includes(userRole)) {
    console.log('[Permissions] Denying: role not recognized:', userRole);
    return false;
  }

  // ── 3. Dept-scoped but no department_id ────────────────────────────
  if (!userDepartmentId) {
    console.log('[Permissions] Denying: dept-scoped role without department_id');
    return false;
  }

  const targetDeptId = targetEmployee.department_id;
  if (!targetDeptId) {
    console.log('[Permissions] Denying: target employee has no department_id');
    return false;
  }

  // ── 4. Special case: أي dept-scoped role في قسم HR = global access ─
  const hrDeptId = await getHrDepartment();
  if (hrDeptId && Number(userDepartmentId) === Number(hrDeptId)) {
    console.log('[Permissions] Allowing: dept-scoped role in HR department');
    return true;
  }

  // ── 5. Same department check ────────────────────────────────────────
  const isSameDept = Number(userDepartmentId) === Number(targetDeptId);
  console.log('[Permissions] Dept-scoped check - Same department?', isSameDept,
    '(user:', userDepartmentId, 'vs target:', targetDeptId, ')');

  return isSameDept;
}

async function canAccessLeaveRequest(currentUser, leaveRequest, employeeContext = null) {
  if (!currentUser || !leaveRequest) return false;

  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();

  if (GLOBAL_ACCESS_ROLES.includes(userRole)) return true;

  if (employeeContext) {
    return canManageEmployee(currentUser, employeeContext);
  }

  if (leaveRequest.employee_id) {
    const { rows } = await query(
      `SELECT e.id, e.department_id 
       FROM employees e 
       INNER JOIN leave_requests lr ON lr.employee_id = e.id 
       WHERE lr.id = $1 LIMIT 1`,
      [leaveRequest.id || leaveRequest.leave_id]
    );

    if (rows[0]) {
      return canManageEmployee(currentUser, rows[0]);
    }
  }

  return false;
}

async function canAccessEvaluation(currentUser, evaluation, employeeContext = null) {
  if (!currentUser || !evaluation) return false;

  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();

  if (GLOBAL_ACCESS_ROLES.includes(userRole)) return true;

  if (employeeContext) {
    return canManageEmployee(currentUser, employeeContext);
  }

  if (evaluation.employee_id) {
    const { rows } = await query(
      `SELECT id, department_id FROM employees WHERE id = $1 LIMIT 1`,
      [evaluation.employee_id]
    );

    if (rows[0]) {
      return canManageEmployee(currentUser, rows[0]);
    }
  }

  return false;
}

async function canCreateLeaveForEmployee(currentUser, employee) {
  return canManageEmployee(currentUser, employee);
}

async function canCreateEvaluationForEmployee(currentUser, employee) {
  return canManageEmployee(currentUser, employee);
}

module.exports = {
  getHrDepartment,
  clearHrDepartmentCache,
  canManageEmployee,
  canAccessLeaveRequest,
  canAccessEvaluation,
  canCreateLeaveForEmployee,
  canCreateEvaluationForEmployee,
  // ─── exported عشان باقي الملفات تستخدمهم ───────────────────────────
  GLOBAL_ACCESS_ROLES, // GLOBAL
  DEPT_SCOPED_ROLES,   // DEPT_SCOPED
};