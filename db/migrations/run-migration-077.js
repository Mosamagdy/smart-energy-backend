const { pool, query } = require('../../src/db');

function normalizeRole(role) {
  return typeof role === 'string' ? role.toLowerCase().trim() : '';
}

function inferTargetRole({ departmentName, deptType }) {
  const name = (departmentName || '').toLowerCase();
  const type = (deptType || '').toLowerCase();

  // Warehousing / inventory first (highest priority)
  if (name.includes('warehouse') || name.includes('مستودع')) return 'warehouse_manager';
  if (name.includes('inventory') || name.includes('مخزون')) return 'inventory_manager';

  // Procurement
  if (name.includes('procurement') || name.includes('purchase') || name.includes('مشتريات')) return 'procurement_manager';

  // PMO / Projects department heads
  if (name.includes('pmo') || name.includes('project') || name.includes('مشاريع') || name.includes('إدارة المشاريع')) return 'dep_pr_manager';

  // Sales leadership
  if (name.includes('sales') || name.includes('مبيعات')) return 'sales_manager';

  // Technical departments
  if (type === 'technical') return 'tech_head';

  // Fallback: keep dept_head if we can't infer safely
  return 'dept_head';
}

async function ensureRolesExist(roleNames) {
  for (const roleName of roleNames) {
    await query(
      `INSERT INTO roles (name, description)
       VALUES ($1, $2)
       ON CONFLICT (name) DO NOTHING`,
      [roleName, `${roleName} (auto-created by migration 077)`]
    );
  }
}

async function getRoleIdByName(name) {
  const { rows } = await query(`SELECT id FROM roles WHERE name = $1 LIMIT 1`, [name]);
  return rows[0]?.id || null;
}

async function run() {
  console.log('🚀 Running Migration 077: Migrate dept_head users to department-scoped manager roles...\n');

  const targetRoles = [
    'warehouse_manager',
    'inventory_manager',
    'tech_head',
    'dep_pr_manager',
    'sales_manager',
    'mc_manager',
    'qs_manager',
  ];

  try {
    await ensureRolesExist(targetRoles);

    const deptHeadRoleId = await getRoleIdByName('dept_head');
    if (!deptHeadRoleId) {
      throw new Error("Role 'dept_head' not found. Aborting.");
    }

    const { rows: deptHeads } = await query(
      `SELECT
         u.id,
         u.email,
         u.username,
         u.department_id,
         d.name        AS department_name,
         d.dept_type   AS department_type
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.role_id = $1`,
      [deptHeadRoleId]
    );

    if (deptHeads.length === 0) {
      console.log("ℹ️ No users currently on role 'dept_head'. Nothing to migrate.");
      return;
    }

    // Preload role ids
    const roleIds = {};
    for (const name of [...new Set([...targetRoles, 'dept_head'])]) {
      roleIds[name] = await getRoleIdByName(name);
    }

    const summary = new Map(); // roleName -> count
    const sampleAccounts = []; // up to 10 for operator verification

    for (const u of deptHeads) {
      const target = inferTargetRole({
        departmentName: u.department_name,
        deptType: u.department_type,
      });

      const targetRoleId = roleIds[target];
      if (!targetRoleId) {
        // Safety: skip if role missing
        summary.set('skipped_missing_role', (summary.get('skipped_missing_role') || 0) + 1);
        continue;
      }

      if (targetRoleId === deptHeadRoleId) {
        summary.set('dept_head', (summary.get('dept_head') || 0) + 1);
        continue;
      }

      await query(`UPDATE users SET role_id = $1 WHERE id = $2`, [targetRoleId, u.id]);

      summary.set(target, (summary.get(target) || 0) + 1);

      if (sampleAccounts.length < 10) {
        sampleAccounts.push({
          id: u.id,
          email: u.email,
          username: u.username,
          department: u.department_name || null,
          new_role: target,
        });
      }
    }

    console.log('✅ Migration 077 completed.\n');
    console.log('📊 Migration Summary (dept_head → new roles):');
    for (const [roleName, count] of [...summary.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  - ${roleName}: ${count}`);
    }

    console.log('\n🧪 Sample migrated accounts (for verification):');
    sampleAccounts.forEach((a) => {
      console.log(`  - ${a.email || a.username}  | new_role=${a.new_role} | dept=${a.department || 'N/A'} | id=${a.id}`);
    });

  } catch (error) {
    console.error('❌ Migration 077 failed:', error.message);
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();

