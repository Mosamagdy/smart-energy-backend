const { pool, query } = require('../../src/db');

function normalize(s) {
  return (s || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();
}

function inferRoleFromDepartment(deptNameRaw, deptTypeRaw) {
  const name = normalize(deptNameRaw);
  const type = normalize(deptTypeRaw);

  // Sales
  if (name.includes('sales') || name.includes('مبيعات')) return 'sales_manager';

  // HR
  if (name.includes('hr') || name.includes('human resources') || name.includes('موارد بشرية')) return 'hr_manager';

  // Warehouse / inventory
  if (name.includes('warehouse') || name.includes('مستودع')) return 'warehouse_manager';
  if (name.includes('inventory') || name.includes('مخزون')) return 'inventory_manager';

  // Procurement
  if (name.includes('procurement') || name.includes('purchase') || name.includes('مشتريات')) return 'procurement_manager';

  // PMO / projects leadership
  if (name.includes('pmo') || name.includes('project') || name.includes('مشاريع') || name.includes('اداره المشاريع') || name.includes('إدارة المشاريع')) {
    return 'dep_pr_manager';
  }

  // Technical leadership
  if (type === 'technical') return 'tech_head';

  // Administrative fallback: dep_pr_manager (to eliminate dept_head)
  return 'dep_pr_manager';
}

async function ensureRole(roleName) {
  await query(
    `INSERT INTO roles (name, description)
     VALUES ($1, $2)
     ON CONFLICT (name) DO NOTHING`,
    [roleName, `${roleName} (auto-created by migration 078)`]
  );
}

async function roleId(name) {
  const { rows } = await query(`SELECT id FROM roles WHERE name = $1 LIMIT 1`, [name]);
  return rows[0]?.id || null;
}

async function run() {
  console.log('🚀 Running Migration 078: Zero dept_head policy (final sweep)...\n');

  try {
    const deptHeadId = await roleId('dept_head');
    if (!deptHeadId) {
      console.log("ℹ️ Role 'dept_head' not found. Nothing to migrate.");
      return;
    }

    const { rows: users } = await query(
      `SELECT
         u.id, u.email, u.username, u.department_id,
         d.name AS department_name,
         d.dept_type AS department_type
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.role_id = $1`,
      [deptHeadId]
    );

    if (users.length === 0) {
      console.log("✅ No remaining dept_head users. Already clean.");
      return;
    }

    const summary = new Map();
    const migrated = [];

    for (const u of users) {
      const target = inferRoleFromDepartment(u.department_name, u.department_type);
      await ensureRole(target);
      const targetId = await roleId(target);
      if (!targetId) {
        summary.set('skipped_missing_target', (summary.get('skipped_missing_target') || 0) + 1);
        continue;
      }

      await query(`UPDATE users SET role_id = $1 WHERE id = $2`, [targetId, u.id]);
      summary.set(target, (summary.get(target) || 0) + 1);
      migrated.push({
        id: u.id,
        email: u.email,
        username: u.username,
        dept: u.department_name || null,
        new_role: target,
      });
    }

    console.log('✅ Migration 078 completed.\n');
    console.log('📊 Final dept_head migration summary:');
    for (const [k, v] of [...summary.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  - ${k}: ${v}`);
    }

    console.log('\n🧾 Migrated users (dept_head → specific role):');
    migrated.forEach((u) => {
      console.log(`  - ${u.email || u.username} | new_role=${u.new_role} | dept=${u.dept || 'N/A'} | id=${u.id}`);
    });

  } catch (e) {
    console.error('❌ Migration 078 failed:', e.message);
    console.error(e.stack);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();

